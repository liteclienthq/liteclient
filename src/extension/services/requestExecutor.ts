import { HttpRequestService } from './httpRequestService';
import { EnvironmentService } from './environmentService';
import { CollectionService } from './collectionService';
import { SettingsService } from './settingsService';
import { CookieJarService } from './cookieJarService';
import { CurrentValuesService } from './currentValuesService';
import { OAuth2TokenService } from './oauth2TokenService';
import { ScriptRunner } from './scriptRunner';
import { resolveVariables } from '../utils/variableResolver';
import type { Environment, EnvironmentVariable, ScriptTestResult, ScriptConsoleEntry, AuthConfig, RequestBody } from '../../shared/models';

// ============================================================================
// Types
// ============================================================================

/**
 * Mutable variable state that flows between requests in a collection run.
 * For single requests, a fresh state is built each time.
 */
export interface ExecutionVariableState {
    globals: Record<string, string>;
    environment: Record<string, string>;
    collection: Record<string, string>;
}

export interface ExecuteRequestInput {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: RequestBody;
    auth?: AuthConfig;
    name?: string;
    preRequestScript?: string;
    postResponseScript?: string;
}

export interface ExecuteRequestOptions {
    /** The request to execute */
    request: ExecuteRequestInput;
    /** Collection ID for variable resolution */
    collectionId?: string;
    /** Environment ID override (falls back to global setting if undefined) */
    environmentId?: string | null;
    /** AbortSignal for cancellation */
    signal?: AbortSignal;
    /**
     * Pre-built mutable variable state (reused across requests in a collection run).
     * If not provided, a fresh state is built from the current environments/collections.
     */
    variableState?: ExecutionVariableState;
    /**
     * Pre-resolved environments (to avoid re-fetching in collection runs).
     * If not provided, environments are loaded from the services.
     */
    mergedGlobals?: Environment;
    mergedSelectedEnv?: Environment;
    collectionVariables?: EnvironmentVariable[];
    /**
     * Whether to persist script variable updates to disk after execution.
     * Defaults to true.
     */
    persistVariableUpdates?: boolean;
}

export interface ExecuteRequestResult {
    status: string;
    durationMs: number;
    responseBody: string;
    responseHeaders: Record<string, string>;
    responseContentType: string;
    cookies: import('../../shared/models').ParsedCookie[];
    setCookieHeaders: string[];
    testResults: ScriptTestResult[];
    consoleLogs: ScriptConsoleEntry[];
    scriptError?: string;
    error?: string;
    isError: boolean;
    passed: boolean;
    /** Updated mutable variable state (for chaining in collection runs) */
    variableState: ExecutionVariableState;
    /** Whether the request was cancelled */
    cancelled: boolean;
}

// ============================================================================
// Service
// ============================================================================

export class RequestExecutor {
    private scriptRunner = new ScriptRunner();

    constructor(
        private environmentService: EnvironmentService,
        private collectionService: CollectionService,
        private settingsService: SettingsService,
        private cookieJarService: CookieJarService,
        private currentValuesService: CurrentValuesService,
        private oauth2TokenService: OAuth2TokenService,
    ) {}

    /**
     * Build a fresh ExecutionVariableState from the current services.
     * Used for single-request execution or to initialize state for a collection run.
     */
    async buildVariableState(options: {
        environmentId?: string | null;
        collectionId?: string;
    }): Promise<{
        variableState: ExecutionVariableState;
        mergedGlobals: Environment | undefined;
        mergedSelectedEnv: Environment | undefined;
        collectionVariables: EnvironmentVariable[];
        selectedEnvironmentId: string | undefined | null;
    }> {
        const globalSelectedId = await this.settingsService.getSelectedEnvironmentId();
        const selectedEnvironmentId = options.environmentId !== undefined
            ? options.environmentId
            : globalSelectedId;

        const globals = await this.environmentService.getEnvironmentById('globals');
        const collection = options.collectionId
            ? await this.collectionService.getCollectionById(options.collectionId)
            : undefined;

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

        const collectionVars: Record<string, string> = {};
        const collectionVariables = collection?.variables || [];
        for (const v of collectionVariables) {
            if (v.enabled) {
                collectionVars[v.name] = v.initialValue;
            }
        }

        return {
            variableState: {
                globals: globalVariables,
                environment: envOnlyVariables,
                collection: collectionVars,
            },
            mergedGlobals,
            mergedSelectedEnv,
            collectionVariables,
            selectedEnvironmentId,
        };
    }

    /**
     * Execute a single HTTP request through the full pipeline:
     * variable resolution → pre-request script → HTTP → cookies → post-response script → persist.
     */
    async execute(options: ExecuteRequestOptions): Promise<ExecuteRequestResult> {
        const {
            request,
            collectionId,
            signal,
            persistVariableUpdates: shouldPersist = true,
        } = options;

        // Build or reuse variable state
        let variableState: ExecutionVariableState;
        let mergedGlobals: Environment | undefined;
        let mergedSelectedEnv: Environment | undefined;
        let collectionVariables: EnvironmentVariable[];
        let selectedEnvironmentId: string | undefined | null;

        if (options.variableState) {
            variableState = options.variableState;
            mergedGlobals = options.mergedGlobals;
            mergedSelectedEnv = options.mergedSelectedEnv;
            collectionVariables = options.collectionVariables || [];
            selectedEnvironmentId = options.environmentId;
        } else {
            const built = await this.buildVariableState({
                environmentId: options.environmentId,
                collectionId,
            });
            variableState = built.variableState;
            mergedGlobals = built.mergedGlobals;
            mergedSelectedEnv = built.mergedSelectedEnv;
            collectionVariables = built.collectionVariables;
            selectedEnvironmentId = built.selectedEnvironmentId;
        }

        // Build merged environment variables for substitution
        const environmentVariables = resolveVariables({
            globals: mergedGlobals,
            collectionVariables,
            environment: mergedSelectedEnv,
        });

        // Apply mutable state on top (for chained collection runs)
        for (const [key, value] of Object.entries(variableState.globals)) {
            environmentVariables[key] = value;
        }
        for (const [key, value] of Object.entries(variableState.collection)) {
            environmentVariables[key] = value;
        }
        for (const [key, value] of Object.entries(variableState.environment)) {
            environmentVariables[key] = value;
        }

        const allTestResults: ScriptTestResult[] = [];
        const allConsoleLogs: ScriptConsoleEntry[] = [];
        let scriptError: string | undefined;
        const allEnvUpdates: Record<string, string | null> = {};
        const allCollectionUpdates: Record<string, string | null> = {};
        const allGlobalUpdates: Record<string, string | null> = {};

        // --- Pre-request script ---
        if (request.preRequestScript) {
            const preResult = await this.scriptRunner.runPreRequestScript(request.preRequestScript, {
                request: {
                    method: request.method,
                    url: request.url,
                    headers: request.headers || {},
                    body: request.body,
                },
                environmentVariables: variableState.environment,
                collectionVariables: variableState.collection,
                globalVariables: variableState.globals,
            });

            allTestResults.push(...preResult.testResults);
            allConsoleLogs.push(...preResult.consoleLogs);
            if (preResult.error) {
                scriptError = preResult.error;
            }

            if (preResult.variableUpdates) {
                this.applyVariableUpdates(
                    preResult.variableUpdates,
                    variableState,
                    environmentVariables,
                    allEnvUpdates,
                    allCollectionUpdates,
                    allGlobalUpdates
                );
            }
        }

        // --- Cookies ---
        const cookieString = await this.cookieJarService.getCookieString(request.url);

        // --- OAuth2 ---
        let resolvedOAuth2Token: string | undefined;
        if (request.auth?.type === 'oauth2' && request.auth.oauth2) {
            try {
                resolvedOAuth2Token = await this.oauth2TokenService.getValidAccessToken(request.auth.oauth2);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to get OAuth2 token';
                return {
                    status: 'Auth Error',
                    durationMs: 0,
                    responseBody: `OAuth2 Error: ${errorMessage}. Please click "Get Token" in the Auth panel.`,
                    responseHeaders: {},
                    responseContentType: '',
                    cookies: [],
                    setCookieHeaders: [],
                    testResults: allTestResults,
                    consoleLogs: allConsoleLogs,
                    scriptError,
                    error: errorMessage,
                    isError: true,
                    passed: false,
                    variableState,
                    cancelled: false,
                };
            }
        }

        // --- Send HTTP request ---
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

        // --- Store cookies ---
        const setCookieHeaders = response.setCookieHeaders || [];
        const parsedCookies = this.cookieJarService.parseSetCookieHeaders(setCookieHeaders);
        if (setCookieHeaders.length > 0) {
            await this.cookieJarService.setCookiesFromResponse(request.url, setCookieHeaders);
        }

        // --- Post-response script ---
        if (request.postResponseScript) {
            const statusCode = parseInt(response.status, 10) || 0;

            const postResult = await this.scriptRunner.runPostResponseScript(request.postResponseScript, {
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
                environmentVariables: variableState.environment,
                collectionVariables: variableState.collection,
                globalVariables: variableState.globals,
            });

            allTestResults.push(...postResult.testResults);
            allConsoleLogs.push(...postResult.consoleLogs);
            if (postResult.error) {
                scriptError = scriptError ? `${scriptError}; ${postResult.error}` : postResult.error;
            }

            if (postResult.variableUpdates) {
                this.applyVariableUpdates(
                    postResult.variableUpdates,
                    variableState,
                    environmentVariables,
                    allEnvUpdates,
                    allCollectionUpdates,
                    allGlobalUpdates
                );
            }
        }

        // --- Persist script variable updates ---
        if (shouldPersist) {
            try {
                await this.persistScriptVariableUpdates(
                    allEnvUpdates,
                    allCollectionUpdates,
                    allGlobalUpdates,
                    selectedEnvironmentId,
                    collectionId
                );
            } catch (persistError) {
                console.error('[LiteClient] Failed to persist script variable updates:', persistError);
            }
        }

        // --- Build result ---
        const hasFailedTests = allTestResults.some(t => !t.passed);
        const passed = !response.isError && !hasFailedTests && !scriptError;
        const cancelled = response.errorType === 'cancelled';

        const contentType = Object.entries(response.headers)
            .find(([key]) => key.toLowerCase() === 'content-type')?.[1] || '';

        return {
            status: response.status,
            durationMs: response.time ?? 0,
            responseBody: response.body,
            responseHeaders: response.headers,
            responseContentType: contentType,
            cookies: parsedCookies,
            setCookieHeaders,
            testResults: allTestResults,
            consoleLogs: allConsoleLogs,
            scriptError,
            error: response.isError ? response.body : undefined,
            isError: response.isError ?? false,
            passed,
            variableState,
            cancelled,
        };
    }

    // ========================================================================
    // Private Helpers
    // ========================================================================

    private applyVariableUpdates(
        updates: { environment: Record<string, string | null>; collection: Record<string, string | null>; globals: Record<string, string | null> },
        state: ExecutionVariableState,
        environmentVariables: Record<string, string>,
        allEnvUpdates: Record<string, string | null>,
        allCollectionUpdates: Record<string, string | null>,
        allGlobalUpdates: Record<string, string | null>,
    ): void {
        for (const [key, value] of Object.entries(updates.environment)) {
            allEnvUpdates[key] = value;
            if (value !== null) {
                state.environment[key] = value;
                environmentVariables[key] = value;
            } else {
                delete state.environment[key];
                delete environmentVariables[key];
            }
        }
        for (const [key, value] of Object.entries(updates.collection)) {
            allCollectionUpdates[key] = value;
            if (value !== null) {
                state.collection[key] = value;
                environmentVariables[key] = value;
            } else {
                delete state.collection[key];
                delete environmentVariables[key];
            }
        }
        for (const [key, value] of Object.entries(updates.globals)) {
            allGlobalUpdates[key] = value;
            if (value !== null) {
                state.globals[key] = value;
                environmentVariables[key] = value;
            } else {
                delete state.globals[key];
                delete environmentVariables[key];
            }
        }
    }

    /**
     * Persist script variable updates to environments and collections on disk.
     */
    private async persistScriptVariableUpdates(
        envUpdates: Record<string, string | null>,
        collectionUpdates: Record<string, string | null>,
        globalUpdates: Record<string, string | null>,
        selectedEnvironmentId: string | undefined | null,
        collectionId?: string
    ): Promise<void> {
        const hasEnvUpdates = Object.keys(envUpdates).length > 0;
        const hasCollectionUpdates = Object.keys(collectionUpdates).length > 0;
        const hasGlobalUpdates = Object.keys(globalUpdates).length > 0;
        if (!hasEnvUpdates && !hasCollectionUpdates && !hasGlobalUpdates) {
            return;
        }

        if (hasGlobalUpdates) {
            await this.applyAndSyncVariableUpdates('globals', globalUpdates);
        }

        if (hasEnvUpdates && selectedEnvironmentId && selectedEnvironmentId !== 'globals') {
            await this.applyAndSyncVariableUpdates(selectedEnvironmentId, envUpdates);
        }

        if (hasCollectionUpdates && collectionId) {
            await this.collectionService.applyVariableUpdates(collectionId, collectionUpdates);
        }
    }

    /**
     * Atomically persist script variable updates to an environment
     * and sync currentValues.
     */
    private async applyAndSyncVariableUpdates(
        envId: string,
        updates: Record<string, string | null>
    ): Promise<void> {
        const removedVarIds = await this.environmentService.applyVariableUpdates(envId, updates);
        for (const varId of removedVarIds) {
            await this.currentValuesService.clearCurrentValue(envId, varId);
        }

        const setUpdates = Object.entries(updates).filter(([, v]) => v !== null);
        if (setUpdates.length > 0) {
            const env = await this.environmentService.getEnvironmentById(envId);
            if (env) {
                for (const [name, value] of setUpdates) {
                    const v = env.variables.find(variable => variable.name === name);
                    if (v) {
                        await this.currentValuesService.setCurrentValue(envId, v.id, value!);
                    }
                }
            }
        }
    }
}
