import { CollectionService, Collection, CollectionItem, RequestItem, FolderItem } from './collectionService';
import { EnvironmentService } from './environmentService';
import { SettingsService } from './settingsService';
import { CookieJarService } from './cookieJarService';
import { CurrentValuesService } from './currentValuesService';
import { OAuth2TokenService } from './oauth2TokenService';
import { HistoryService } from './historyService';
import { HttpRequestService } from './httpRequestService';
import { ScriptRunner } from './scriptRunner';
import { resolveVariables } from '../utils/variableResolver';
import type { Environment, EnvironmentVariable, ScriptTestResult, ScriptConsoleEntry } from '../../shared/models';

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
    private scriptRunner = new ScriptRunner();
    private abortController: AbortController | null = null;

    constructor(
        private collectionService: CollectionService,
        private environmentService: EnvironmentService,
        private settingsService: SettingsService,
        private cookieJarService: CookieJarService,
        private currentValuesService: CurrentValuesService,
        private oauth2TokenService: OAuth2TokenService,
        private historyService: HistoryService
    ) {}

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

            const selectedEnvironmentId = config.environmentId
                ?? await this.settingsService.getSelectedEnvironmentId();

            const globals = await this.environmentService.getEnvironmentById('globals');
            let selectedEnvironment: Environment | undefined;
            if (selectedEnvironmentId && selectedEnvironmentId !== 'globals') {
                selectedEnvironment = await this.environmentService.getEnvironmentById(selectedEnvironmentId);
            }

            const envsToMerge = [globals, selectedEnvironment].filter(Boolean) as Environment[];
            const mergedEnvs = this.currentValuesService.mergeIntoEnvironments(envsToMerge);
            const mergedGlobals = mergedEnvs.find(e => e.id === 'globals');
            const mergedSelectedEnv = mergedEnvs.find(e => e.id !== 'globals');

            const globalVariables: Record<string, string> = {};
            if (mergedGlobals) {
                for (const v of mergedGlobals.variables) {
                    if (v.enabled) {
                        globalVariables[v.name] = v.currentValue ?? v.initialValue;
                    }
                }
            }

            const envOnlyVariables: Record<string, string> = {};
            if (mergedSelectedEnv) {
                for (const v of mergedSelectedEnv.variables) {
                    if (v.enabled) {
                        envOnlyVariables[v.name] = v.currentValue ?? v.initialValue;
                    }
                }
            }

            const collectionVariables: Record<string, string> = {};
            for (const v of collection.variables || []) {
                if (v.enabled) {
                    collectionVariables[v.name] = v.initialValue;
                }
            }

            const results: RunRequestResult[] = [];
            const runStartTime = Date.now();

            for (let i = 0; i < requests.length; i++) {
                if (signal.aborted) {
                    break;
                }

                const result = await this.executeRequest(
                    requests[i],
                    collection,
                    globalVariables,
                    collectionVariables,
                    envOnlyVariables,
                    mergedGlobals,
                    mergedSelectedEnv,
                    signal
                );

                results.push(result);
                onProgress(i + 1, requests.length, result);

                // Save to history
                const request = requests[i];
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

    private async executeRequest(
        request: RequestItem,
        collection: Collection,
        globalVariables: Record<string, string>,
        collectionVariables: Record<string, string>,
        envOnlyVariables: Record<string, string>,
        mergedGlobals: Environment | undefined,
        mergedSelectedEnv: Environment | undefined,
        signal: AbortSignal
    ): Promise<RunRequestResult> {
        const startTime = Date.now();
        const allTestResults: ScriptTestResult[] = [];
        const allConsoleLogs: ScriptConsoleEntry[] = [];
        let scriptError: string | undefined;

        const environmentVariables = resolveVariables({
            globals: mergedGlobals,
            collectionVariables: collection.variables || [],
            environment: mergedSelectedEnv,
        });

        // Apply mutable variable state from previous requests
        for (const [key, value] of Object.entries(globalVariables)) {
            environmentVariables[key] = value;
        }
        for (const [key, value] of Object.entries(collectionVariables)) {
            environmentVariables[key] = value;
        }
        for (const [key, value] of Object.entries(envOnlyVariables)) {
            environmentVariables[key] = value;
        }

        // Run pre-request script
        if (request.preRequestScript) {
            const preResult = this.scriptRunner.runPreRequestScript(request.preRequestScript, {
                request: {
                    method: request.method,
                    url: request.url,
                    headers: request.headers || {},
                    body: request.body,
                },
                environmentVariables: envOnlyVariables,
                collectionVariables,
                globalVariables,
            });

            allTestResults.push(...preResult.testResults);
            allConsoleLogs.push(...preResult.consoleLogs);
            if (preResult.error) {
                scriptError = preResult.error;
            }

            if (preResult.variableUpdates) {
                this.applyVariableUpdates(preResult.variableUpdates, envOnlyVariables, collectionVariables, globalVariables, environmentVariables);
            }
        }

        const cookieString = await this.cookieJarService.getCookieString(request.url);

        // Resolve OAuth2 token if needed
        let resolvedOAuth2Token: string | undefined;
        if (request.auth?.type === 'oauth2' && request.auth.oauth2) {
            try {
                resolvedOAuth2Token = await this.oauth2TokenService.getValidAccessToken(request.auth.oauth2);
            } catch {
                return {
                    requestName: request.name,
                    method: request.method,
                    url: request.url,
                    status: 'Auth Error',
                    durationMs: Date.now() - startTime,
                    responseBody: '',
                    responseHeaders: {},
                    responseContentType: '',
                    testResults: allTestResults,
                    consoleLogs: allConsoleLogs,
                    passed: false,
                    error: 'Failed to get OAuth2 token',
                    scriptError,
                };
            }
        }

        const response = await HttpRequestService.sendRequest(
            {
                method: request.method,
                url: request.url,
                headers: request.headers || {},
                body: request.body,
                auth: request.auth,
            },
            environmentVariables,
            { signal, cookieString, resolvedOAuth2Token }
        );

        const setCookieHeaders = response.setCookieHeaders || [];
        if (setCookieHeaders.length > 0) {
            await this.cookieJarService.setCookiesFromResponse(request.url, setCookieHeaders);
        }

        // Run post-response script
        if (request.postResponseScript) {
            const statusCode = parseInt(response.status, 10) || 0;

            const postResult = this.scriptRunner.runPostResponseScript(request.postResponseScript, {
                request: {
                    method: request.method,
                    url: request.url,
                    headers: request.headers || {},
                    body: request.body,
                },
                response: {
                    code: statusCode,
                    status: response.status,
                    headers: response.headers,
                    body: response.body,
                },
                environmentVariables: envOnlyVariables,
                collectionVariables,
                globalVariables,
            });

            allTestResults.push(...postResult.testResults);
            allConsoleLogs.push(...postResult.consoleLogs);
            if (postResult.error) {
                scriptError = scriptError ? `${scriptError}; ${postResult.error}` : postResult.error;
            }

            if (postResult.variableUpdates) {
                this.applyVariableUpdates(postResult.variableUpdates, envOnlyVariables, collectionVariables, globalVariables, environmentVariables);
            }
        }

        const durationMs = response.time ?? (Date.now() - startTime);
        const hasFailedTests = allTestResults.some(t => !t.passed);
        const passed = !response.isError && !hasFailedTests && !scriptError;

        const contentType = Object.entries(response.headers)
            .find(([key]) => key.toLowerCase() === 'content-type')?.[1] || '';

        return {
            requestName: request.name,
            method: request.method,
            url: request.url,
            status: response.status,
            durationMs,
            responseBody: response.body,
            responseHeaders: response.headers,
            responseContentType: contentType,
            testResults: allTestResults,
            consoleLogs: allConsoleLogs,
            passed,
            error: response.isError ? response.body : undefined,
            scriptError,
        };
    }

    private applyVariableUpdates(
        updates: { environment: Record<string, string | null>; collection: Record<string, string | null>; globals: Record<string, string | null> },
        envOnlyVariables: Record<string, string>,
        collectionVariables: Record<string, string>,
        globalVariables: Record<string, string>,
        environmentVariables: Record<string, string>
    ): void {
        for (const [key, value] of Object.entries(updates.environment)) {
            if (value !== null) {
                envOnlyVariables[key] = value;
                environmentVariables[key] = value;
            } else {
                delete envOnlyVariables[key];
                delete environmentVariables[key];
            }
        }
        for (const [key, value] of Object.entries(updates.collection)) {
            if (value !== null) {
                collectionVariables[key] = value;
                environmentVariables[key] = value;
            } else {
                delete collectionVariables[key];
                delete environmentVariables[key];
            }
        }
        for (const [key, value] of Object.entries(updates.globals)) {
            if (value !== null) {
                globalVariables[key] = value;
                environmentVariables[key] = value;
            } else {
                delete globalVariables[key];
                delete environmentVariables[key];
            }
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
