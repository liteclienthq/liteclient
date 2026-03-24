import * as vm from 'vm';
import { ScriptTestResult, ScriptConsoleEntry, ScriptResult } from '../../shared/models';
import { HttpRequestService, ResponseData } from './httpRequestService';

interface ScriptRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: any;
}

interface ScriptResponse {
    code: number;
    status: string;
    headers: Record<string, string>;
    body: string;
}

interface ScriptContext {
    request: ScriptRequest;
    response?: ScriptResponse;
    environmentVariables: Record<string, string>;
    collectionVariables: Record<string, string>;
    globalVariables: Record<string, string>;
}

const SCRIPT_TIMEOUT_MS = 10_000;
const MAX_CONSOLE_ENTRIES = 200;
const MAX_TEST_RESULTS = 200;
const MAX_SCRIPT_SIZE = 100_000;
const MAX_SEND_REQUESTS = 5;

export class ScriptRunner {
    async runPreRequestScript(script: string, context: ScriptContext): Promise<ScriptResult> {
        return this.executeScript(script, context, 'pre-request');
    }

    async runPostResponseScript(script: string, context: ScriptContext): Promise<ScriptResult> {
        return this.executeScript(script, context, 'post-response');
    }

    private async executeScript(script: string, context: ScriptContext, phase: string): Promise<ScriptResult> {
        if (script.length > MAX_SCRIPT_SIZE) {
            return {
                testResults: [],
                consoleLogs: [],
                error: `${phase === 'pre-request' ? 'Pre-request' : 'Tests'}: Script too large (${Math.round(script.length / 1024)}KB). Maximum allowed is ${MAX_SCRIPT_SIZE / 1000}KB.`,
            };
        }

        const testResults: ScriptTestResult[] = [];
        const consoleLogs: ScriptConsoleEntry[] = [];
        const envUpdates: Record<string, string | null> = {};
        const collectionUpdates: Record<string, string | null> = {};
        const globalUpdates: Record<string, string | null> = {};

        const makeConsoleMethod = (level: ScriptConsoleEntry['level']) => {
            return (...args: any[]) => {
                if (consoleLogs.length >= MAX_CONSOLE_ENTRIES) { return; }
                consoleLogs.push({
                    level,
                    args: args.map(a => {
                        try { return typeof a === 'string' ? a : JSON.stringify(a); }
                        catch { return String(a); }
                    })
                });
            };
        };

        const envVars = { ...context.environmentVariables };
        const collectionVars = { ...context.collectionVariables };
        const globalVars = { ...context.globalVariables };

        // Track pending pm.sendRequest promises for async resolution
        const pendingRequests: Promise<void>[] = [];
        let sendRequestCount = 0;

        const pm: any = {
            environment: {
                get: (key: string) => envVars[key],
                set: (key: string, value: string) => {
                    envVars[key] = String(value);
                    envUpdates[key] = String(value);
                },
                unset: (key: string) => {
                    delete envVars[key];
                    envUpdates[key] = null;
                },
                toObject: () => ({ ...envVars })
            },
            globals: {
                get: (key: string) => globalVars[key],
                set: (key: string, value: string) => {
                    globalVars[key] = String(value);
                    globalUpdates[key] = String(value);
                },
                unset: (key: string) => {
                    delete globalVars[key];
                    globalUpdates[key] = null;
                },
                toObject: () => ({ ...globalVars })
            },
            collectionVariables: {
                get: (key: string) => collectionVars[key],
                set: (key: string, value: string) => {
                    collectionVars[key] = String(value);
                    collectionUpdates[key] = String(value);
                },
                unset: (key: string) => {
                    delete collectionVars[key];
                    collectionUpdates[key] = null;
                },
                toObject: () => ({ ...collectionVars })
            },
            variables: {
                get: (key: string) => envVars[key] ?? collectionVars[key] ?? globalVars[key]
            },
            request: {
                url: context.request.url,
                method: context.request.method,
                headers: { ...context.request.headers },
                body: context.request.body
            },
            test: (name: string, fn: () => void) => {
                if (testResults.length >= MAX_TEST_RESULTS) { return; }
                try {
                    fn();
                    testResults.push({ name, passed: true });
                } catch (err) {
                    testResults.push({
                        name,
                        passed: false,
                        error: err instanceof Error ? err.message : String(err)
                    });
                }
            },
            expect: (value: any) => createExpect(value),
            console: {
                log: makeConsoleMethod('log'),
                info: makeConsoleMethod('info'),
                warn: makeConsoleMethod('warn'),
                error: makeConsoleMethod('error')
            },
            sendRequest: (urlOrRequest: string | Record<string, any>, callback?: (err: any, response: any) => void) => {
                if (sendRequestCount >= MAX_SEND_REQUESTS) {
                    const err = new Error(`pm.sendRequest limit reached (max ${MAX_SEND_REQUESTS} per script)`);
                    if (callback) {
                        callback(err, null);
                        return;
                    }
                    throw err;
                }
                sendRequestCount++;

                let method = 'GET';
                let url: string;
                let headers: Record<string, string> = {};
                let body: string | undefined;

                if (typeof urlOrRequest === 'string') {
                    url = urlOrRequest;
                } else {
                    url = urlOrRequest.url;
                    method = (urlOrRequest.method || 'GET').toUpperCase();
                    headers = urlOrRequest.header || urlOrRequest.headers || {};
                    if (urlOrRequest.body) {
                        if (typeof urlOrRequest.body === 'string') {
                            body = urlOrRequest.body;
                        } else if (urlOrRequest.body.raw) {
                            body = urlOrRequest.body.raw;
                        } else {
                            try { body = JSON.stringify(urlOrRequest.body); }
                            catch { body = String(urlOrRequest.body); }
                        }
                    }
                }

                const requestPromise = HttpRequestService.sendRequest(
                    {
                        method,
                        url,
                        headers,
                        body: body ? { mode: 'raw', rawType: 'text', value: body } : { mode: 'none' },
                    },
                    {},
                    { timeout: SCRIPT_TIMEOUT_MS }
                ).then((responseData: ResponseData) => {
                    const statusCode = parseInt(responseData.status, 10) || 0;
                    const scriptResponse = {
                        code: statusCode,
                        status: responseData.status,
                        headers: responseData.headers,
                        body: responseData.body,
                        text: () => responseData.body,
                        json: () => {
                            try { return JSON.parse(responseData.body); }
                            catch (e) { throw new Error(`Response is not valid JSON: ${(e as Error).message}`); }
                        }
                    };

                    if (callback) {
                        callback(responseData.isError ? new Error(responseData.body) : null, scriptResponse);
                    }
                }).catch((err: Error) => {
                    if (callback) {
                        callback(err, null);
                    }
                });

                pendingRequests.push(requestPromise);
            }
        };

        if (context.response) {
            const responseBody = context.response.body;
            pm.response = {
                code: context.response.code,
                status: context.response.status,
                headers: { ...context.response.headers },
                text: () => responseBody,
                json: () => {
                    try { return JSON.parse(responseBody); }
                    catch (e) { throw new Error(`Response is not valid JSON: ${(e as Error).message}`); }
                }
            };
        }

        const sandbox = {
            pm,
            console: pm.console,
            JSON,
            parseInt,
            parseFloat,
            isNaN,
            isFinite,
            encodeURIComponent,
            decodeURIComponent,
            encodeURI,
            decodeURI,
            atob: (s: string) => Buffer.from(s, 'base64').toString(),
            btoa: (s: string) => Buffer.from(s).toString('base64'),
            setTimeout: (fn: (...args: any[]) => void, ms: number) => {
                const p = new Promise<void>(resolve => {
                    const timer = globalThis.setTimeout(() => { fn(); resolve(); }, ms);
                    // Cap at script timeout to prevent runaway timers
                    globalThis.setTimeout(() => { globalThis.clearTimeout(timer); resolve(); }, SCRIPT_TIMEOUT_MS);
                });
                pendingRequests.push(p);
                return 0;
            },
        };

        try {
            const vmContext = vm.createContext(sandbox);

            // Wrap script in an async IIFE so pm.sendRequest callbacks resolve before we collect results
            const wrappedScript = `(async () => { ${script} })()`;
            const scriptPromise = vm.runInContext(wrappedScript, vmContext, {
                timeout: SCRIPT_TIMEOUT_MS,
                filename: `${phase}-script.js`
            });

            // Await the async IIFE and all pending pm.sendRequest promises
            await scriptPromise;
            if (pendingRequests.length > 0) {
                await Promise.all(pendingRequests);
            }
        } catch (err) {
            let errorMsg: string;
            if (err instanceof Error && err.message.includes('Script execution timed out')) {
                errorMsg = `${phase === 'pre-request' ? 'Pre-request' : 'Tests'}: Script timed out after ${SCRIPT_TIMEOUT_MS / 1000}s`;
            } else if (err instanceof Error) {
                errorMsg = `${phase === 'pre-request' ? 'Pre-request' : 'Tests'}: ${err.message}`;
                if (err.stack) {
                    const stackLines = err.stack.split('\n').slice(1, 4).map(l => l.trim()).join('\n');
                    errorMsg += '\n' + stackLines;
                }
            } else {
                errorMsg = `${phase === 'pre-request' ? 'Pre-request' : 'Tests'}: ${String(err)}`;
            }
            return {
                testResults,
                consoleLogs,
                error: errorMsg,
                variableUpdates: {
                    environment: envUpdates,
                    collection: collectionUpdates,
                    globals: globalUpdates
                }
            };
        }

        return {
            testResults,
            consoleLogs,
            variableUpdates: {
                environment: envUpdates,
                collection: collectionUpdates,
                globals: globalUpdates
            }
        };
    }
}

function createExpect(actual: any) {
    const assert = (condition: boolean, msg: string) => {
        if (!condition) { throw new Error(msg); }
    };
    return {
        to: {
            get be() {
                return {
                    a: (type: string) => assert(typeof actual === type, `Expected type "${type}" but got "${typeof actual}"`),
                    an: (type: string) => assert(typeof actual === type, `Expected type "${type}" but got "${typeof actual}"`),
                    true: (() => { assert(actual === true, `Expected true but got ${JSON.stringify(actual)}`); }) as any,
                    false: (() => { assert(actual === false, `Expected false but got ${JSON.stringify(actual)}`); }) as any,
                    null: (() => { assert(actual === null, `Expected null but got ${JSON.stringify(actual)}`); }) as any,
                    undefined: (() => { assert(actual === undefined, `Expected undefined but got ${JSON.stringify(actual)}`); }) as any,
                    above: (n: number) => assert(actual > n, `Expected ${actual} to be above ${n}`),
                    below: (n: number) => assert(actual < n, `Expected ${actual} to be below ${n}`),
                    at: {
                        least: (n: number) => assert(actual >= n, `Expected ${actual} to be at least ${n}`),
                        most: (n: number) => assert(actual <= n, `Expected ${actual} to be at most ${n}`)
                    },
                    ok: (() => { assert(!!actual, `Expected truthy value but got ${JSON.stringify(actual)}`); }) as any,
                    empty: (() => {
                        if (typeof actual === 'string' || Array.isArray(actual)) {
                            assert(actual.length === 0, `Expected empty but got length ${actual.length}`);
                        } else {
                            assert(Object.keys(actual).length === 0, `Expected empty object`);
                        }
                    }) as any,
                };
            },
            equal: (expected: any) => assert(actual === expected, `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`),
            eql: (expected: any) => assert(JSON.stringify(actual) === JSON.stringify(expected), `Expected deep equal ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`),
            include: (item: any) => {
                if (typeof actual === 'string') {
                    assert(actual.includes(item), `Expected "${actual}" to include "${item}"`);
                } else if (Array.isArray(actual)) {
                    assert(actual.includes(item), `Expected array to include ${JSON.stringify(item)}`);
                } else {
                    assert(false, `Cannot use include on ${typeof actual}`);
                }
            },
            have: {
                property: (prop: string, value?: any) => {
                    assert(actual !== null && prop in actual, `Expected object to have property "${prop}"`);
                    if (value !== undefined) {
                        assert(actual[prop] === value, `Expected property "${prop}" to equal ${JSON.stringify(value)} but got ${JSON.stringify(actual[prop])}`);
                    }
                },
                status: (code: number) => {
                    const actualCode = actual?.code ?? actual;
                    assert(actualCode === code, `Expected status ${code} but got ${actualCode}`);
                },
                length: (len: number) => {
                    assert(actual.length === len, `Expected length ${len} but got ${actual.length}`);
                }
            },
            not: {
                equal: (expected: any) => assert(actual !== expected, `Expected ${JSON.stringify(actual)} to not equal ${JSON.stringify(expected)}`),
                eql: (expected: any) => assert(JSON.stringify(actual) !== JSON.stringify(expected), `Expected values to not be deeply equal`),
                include: (item: any) => {
                    if (typeof actual === 'string') {
                        assert(!actual.includes(item), `Expected "${actual}" to not include "${item}"`);
                    } else if (Array.isArray(actual)) {
                        assert(!actual.includes(item), `Expected array to not include ${JSON.stringify(item)}`);
                    }
                },
                be: {
                    null: (() => { assert(actual !== null, `Expected value to not be null`); }) as any,
                    undefined: (() => { assert(actual !== undefined, `Expected value to not be undefined`); }) as any,
                    empty: (() => {
                        if (typeof actual === 'string' || Array.isArray(actual)) {
                            assert(actual.length > 0, `Expected non-empty but got empty`);
                        }
                    }) as any,
                }
            }
        }
    };
}
