import * as vm from 'vm';
import { ScriptTestResult, ScriptConsoleEntry, ScriptResult } from '../../shared/models';

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
    globalVariables: Record<string, string>;
}

const SCRIPT_TIMEOUT_MS = 2000;

export class ScriptRunner {
    runPreRequestScript(script: string, context: ScriptContext): ScriptResult {
        return this.executeScript(script, context, 'pre-request');
    }

    runPostResponseScript(script: string, context: ScriptContext): ScriptResult {
        return this.executeScript(script, context, 'post-response');
    }

    private executeScript(script: string, context: ScriptContext, phase: string): ScriptResult {
        const testResults: ScriptTestResult[] = [];
        const consoleLogs: ScriptConsoleEntry[] = [];
        const envUpdates: Record<string, string> = {};
        const globalUpdates: Record<string, string> = {};

        const makeConsoleMethod = (level: ScriptConsoleEntry['level']) => {
            return (...args: any[]) => {
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
        const globalVars = { ...context.globalVariables };

        const pm: any = {
            environment: {
                get: (key: string) => envVars[key],
                set: (key: string, value: string) => {
                    envVars[key] = String(value);
                    envUpdates[key] = String(value);
                },
                unset: (key: string) => {
                    delete envVars[key];
                    envUpdates[key] = '';
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
                    globalUpdates[key] = '';
                },
                toObject: () => ({ ...globalVars })
            },
            variables: {
                get: (key: string) => envVars[key] ?? globalVars[key]
            },
            request: {
                url: context.request.url,
                method: context.request.method,
                headers: { ...context.request.headers },
                body: context.request.body
            },
            test: (name: string, fn: () => void) => {
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
        };

        try {
            const vmContext = vm.createContext(sandbox);
            vm.runInContext(script, vmContext, {
                timeout: SCRIPT_TIMEOUT_MS,
                filename: `${phase}-script.js`
            });
        } catch (err) {
            let errorMsg: string;
            if (err instanceof Error && err.message.includes('Script execution timed out')) {
                errorMsg = `Script timed out after ${SCRIPT_TIMEOUT_MS}ms`;
            } else {
                errorMsg = err instanceof Error ? err.message : String(err);
            }
            return {
                testResults,
                consoleLogs,
                error: errorMsg,
                variableUpdates: {
                    environment: envUpdates,
                    globals: globalUpdates
                }
            };
        }

        return {
            testResults,
            consoleLogs,
            variableUpdates: {
                environment: envUpdates,
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
                    assert(actual != null && prop in actual, `Expected object to have property "${prop}"`);
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
