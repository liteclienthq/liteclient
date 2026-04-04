import { CollectionService, CollectionItem, RequestItem, FolderItem } from './collectionService';
import { EnvironmentService } from './environmentService';
import { SettingsService } from './settingsService';
import { CookieJarService } from './cookieJarService';
import { CurrentValuesService } from './currentValuesService';
import { OAuth2TokenService } from './oauth2TokenService';
import { HistoryService } from './historyService';
import { RequestExecutor } from './requestExecutor';
import type { ScriptTestResult, ScriptConsoleEntry } from '../../shared/models';

export interface RunConfig {
    collectionId: string;
    folderId?: string;
    environmentId?: string;
    delayMs?: number;
}

export interface RunRequestResult {
    requestName: string;
    method: string;
    url: string;
    status: string;
    durationMs: number;
    responseBody: string;
    responseHeaders: Record<string, string>;
    responseContentType: string;
    testResults: ScriptTestResult[];
    consoleLogs: ScriptConsoleEntry[];
    passed: boolean;
    error?: string;
    scriptError?: string;
}

export interface RunSummary {
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
}

export type RunProgressCallback = (current: number, total: number, result: RunRequestResult) => void;
export type RunCompleteCallback = (results: RunRequestResult[], summary: RunSummary) => void;
export type RunErrorCallback = (error: string) => void;

export class CollectionRunner {
    private requestExecutor: RequestExecutor;
    private abortController: AbortController | null = null;

    constructor(
        private collectionService: CollectionService,
        private environmentService: EnvironmentService,
        private settingsService: SettingsService,
        private cookieJarService: CookieJarService,
        private currentValuesService: CurrentValuesService,
        private oauth2TokenService: OAuth2TokenService,
        private historyService: HistoryService
    ) {
        this.requestExecutor = new RequestExecutor(
            environmentService,
            collectionService,
            settingsService,
            cookieJarService,
            currentValuesService,
            oauth2TokenService,
        );
    }

    get isRunning(): boolean {
        return this.abortController !== null;
    }

    cancel(): void {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    async run(
        config: RunConfig,
        onProgress: RunProgressCallback,
        onComplete: RunCompleteCallback,
        onError: RunErrorCallback
    ): Promise<void> {
        if (this.abortController) {
            onError('A collection run is already in progress.');
            return;
        }

        this.abortController = new AbortController();
        const { signal } = this.abortController;

        try {
            const collection = await this.collectionService.getCollectionById(config.collectionId);
            if (!collection) {
                onError('Collection not found.');
                return;
            }

            let items: CollectionItem[];
            if (config.folderId) {
                const folder = this.findFolder(collection.items, config.folderId);
                if (!folder) {
                    onError('Folder not found.');
                    return;
                }
                items = folder.items;
            } else {
                items = collection.items;
            }

            const requests = this.flattenRequests(items);
            if (requests.length === 0) {
                onError('No requests found to run.');
                return;
            }

            // Build initial variable state once for the entire run
            const built = await this.requestExecutor.buildVariableState({
                environmentId: config.environmentId,
                collectionId: config.collectionId,
            });
            let { variableState } = built;

            const results: RunRequestResult[] = [];
            const runStartTime = Date.now();

            for (let i = 0; i < requests.length; i++) {
                if (signal.aborted) {
                    break;
                }

                const request = requests[i];

                const execResult = await this.requestExecutor.execute({
                    request: {
                        method: request.method,
                        url: request.url,
                        headers: request.headers || {},
                        body: request.body,
                        auth: request.auth,
                        name: request.name,
                        preRequestScript: request.preRequestScript,
                        postResponseScript: request.postResponseScript,
                    },
                    collectionId: config.collectionId,
                    environmentId: config.environmentId,
                    signal,
                    variableState,
                    mergedGlobals: built.mergedGlobals,
                    mergedSelectedEnv: built.mergedSelectedEnv,
                    collectionVariables: built.collectionVariables,
                    // Persist after each request so variable updates survive the run
                    persistVariableUpdates: true,
                });

                // Carry forward mutable variable state to next request
                variableState = execResult.variableState;

                const result: RunRequestResult = {
                    requestName: request.name,
                    method: request.method,
                    url: request.url,
                    status: execResult.status,
                    durationMs: execResult.durationMs,
                    responseBody: execResult.responseBody,
                    responseHeaders: execResult.responseHeaders,
                    responseContentType: execResult.responseContentType,
                    testResults: execResult.testResults,
                    consoleLogs: execResult.consoleLogs,
                    passed: execResult.passed,
                    error: execResult.error,
                    scriptError: execResult.scriptError,
                };

                results.push(result);
                onProgress(i + 1, requests.length, result);

                // Save to history
                const execution = this.historyService.createExecution(
                    {
                        name: request.name,
                        method: request.method,
                        url: request.url,
                        headers: request.headers || {},
                        body: request.body || { mode: 'none' },
                        auth: request.auth,
                        preRequestScript: request.preRequestScript,
                        postResponseScript: request.postResponseScript,
                    },
                    { type: 'collection', collectionId: config.collectionId, requestId: request.id },
                    result.status,
                    result.durationMs
                );
                await this.historyService.add(execution);

                if (config.delayMs && config.delayMs > 0 && i < requests.length - 1 && !signal.aborted) {
                    await this.delay(config.delayMs, signal);
                }
            }

            const runDuration = Date.now() - runStartTime;
            const passed = results.filter(r => r.passed).length;
            const failed = results.filter(r => !r.passed).length;

            onComplete(results, {
                total: results.length,
                passed,
                failed,
                durationMs: runDuration
            });
        } catch (err) {
            if (signal.aborted) {
                onError('Run cancelled.');
            } else {
                onError(err instanceof Error ? err.message : String(err));
            }
        } finally {
            this.abortController = null;
        }
    }

    private flattenRequests(items: CollectionItem[]): RequestItem[] {
        const result: RequestItem[] = [];
        for (const item of items) {
            if (item.type === 'request') {
                result.push(item as RequestItem);
            } else if (item.type === 'folder') {
                result.push(...this.flattenRequests((item as FolderItem).items));
            }
        }
        return result;
    }

    private findFolder(items: CollectionItem[], folderId: string): FolderItem | undefined {
        for (const item of items) {
            if (item.type === 'folder') {
                if (item.id === folderId) {
                    return item as FolderItem;
                }
                const found = this.findFolder((item as FolderItem).items, folderId);
                if (found) { return found; }
            }
        }
        return undefined;
    }

    private delay(ms: number, signal: AbortSignal): Promise<void> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, ms);
            signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(new Error('Cancelled'));
            }, { once: true });
        });
    }
}
