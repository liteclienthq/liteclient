import * as assert from 'assert';
import { ScriptRunner } from '../extension/services/scriptRunner';

const baseContext = {
    request: { method: 'GET', url: 'https://example.com', headers: {}, body: { mode: 'none' as const } },
    environmentVariables: {},
    collectionVariables: {},
    globalVariables: {},
};

suite('pm.sendRequest Test Suite', () => {

    test('existing sync scripts still work after async migration', async () => {
        const runner = new ScriptRunner();
        const result = await runner.runPostResponseScript(
            `
            pm.test('basic assertion', function () {
                pm.expect(1 + 1).to.equal(2);
            });
            pm.environment.set('foo', 'bar');
            `,
            {
                ...baseContext,
                response: { code: 200, status: '200 OK', headers: {}, body: '{}' },
            }
        );

        assert.strictEqual(result.error, undefined);
        assert.strictEqual(result.testResults.length, 1);
        assert.strictEqual(result.testResults[0].passed, true);
        assert.strictEqual(result.variableUpdates?.environment.foo, 'bar');
    });

    test('pm.sendRequest with string URL calls callback', async () => {
        const runner = new ScriptRunner();
        // Use a URL that will fail with a network error — we still expect the callback to fire
        const result = await runner.runPreRequestScript(
            `
            pm.sendRequest('http://127.0.0.1:1', function (err, res) {
                if (err) {
                    pm.environment.set('sendRequestError', 'true');
                } else {
                    pm.environment.set('sendRequestStatus', String(res.code));
                }
            });
            `,
            baseContext
        );

        assert.strictEqual(result.error, undefined);
        // The request to port 1 should fail, so the error branch should have been hit
        assert.strictEqual(result.variableUpdates?.environment.sendRequestError, 'true');
    });

    test('pm.sendRequest with request object passes method and headers', async () => {
        const runner = new ScriptRunner();
        // This will fail with a connection error, but we're testing that the API shape works
        const result = await runner.runPreRequestScript(
            `
            pm.sendRequest({
                url: 'http://127.0.0.1:1/api/test',
                method: 'POST',
                header: { 'Content-Type': 'application/json' },
                body: { raw: '{"key":"value"}' }
            }, function (err, res) {
                pm.environment.set('callbackCalled', 'true');
            });
            `,
            baseContext
        );

        assert.strictEqual(result.error, undefined);
        assert.strictEqual(result.variableUpdates?.environment.callbackCalled, 'true');
    });

    test('pm.sendRequest enforces max 5 calls per script', async () => {
        const runner = new ScriptRunner();
        const result = await runner.runPreRequestScript(
            `
            let errorCount = 0;
            for (let i = 0; i < 7; i++) {
                pm.sendRequest('http://127.0.0.1:1', function (err) {
                    if (err && err.message && err.message.includes('limit reached')) {
                        errorCount++;
                    }
                });
            }
            pm.environment.set('errorCount', String(errorCount));
            `,
            baseContext
        );

        assert.strictEqual(result.error, undefined);
        // Calls 6 and 7 should get the limit error via callback
        assert.strictEqual(result.variableUpdates?.environment.errorCount, '2');
    });

    test('variable mutations inside sendRequest callbacks persist', async () => {
        const runner = new ScriptRunner();
        const result = await runner.runPreRequestScript(
            `
            pm.environment.set('before', 'yes');
            pm.sendRequest('http://127.0.0.1:1', function (err) {
                pm.environment.set('insideCallback', 'yes');
                pm.globals.set('globalFromCallback', 'hello');
            });
            `,
            baseContext
        );

        assert.strictEqual(result.error, undefined);
        assert.strictEqual(result.variableUpdates?.environment.before, 'yes');
        assert.strictEqual(result.variableUpdates?.environment.insideCallback, 'yes');
        assert.strictEqual(result.variableUpdates?.globals.globalFromCallback, 'hello');
    });

    test('pm.sendRequest without callback does not throw', async () => {
        const runner = new ScriptRunner();
        const result = await runner.runPreRequestScript(
            `
            pm.sendRequest('http://127.0.0.1:1');
            pm.environment.set('afterSend', 'yes');
            `,
            baseContext
        );

        assert.strictEqual(result.error, undefined);
        assert.strictEqual(result.variableUpdates?.environment.afterSend, 'yes');
    });

    test('console.log inside sendRequest callback is captured', async () => {
        const runner = new ScriptRunner();
        const result = await runner.runPreRequestScript(
            `
            pm.sendRequest('http://127.0.0.1:1', function (err) {
                console.log('callback executed', err ? 'with error' : 'ok');
            });
            `,
            baseContext
        );

        assert.strictEqual(result.error, undefined);
        assert.ok(result.consoleLogs.length > 0);
        assert.ok(result.consoleLogs.some(log => log.args.some(a => a.includes('callback executed'))));
    });

    test('pm.test inside sendRequest callback works', async () => {
        const runner = new ScriptRunner();
        const result = await runner.runPostResponseScript(
            `
            pm.sendRequest('http://127.0.0.1:1', function (err, res) {
                pm.test('sendRequest completed', function () {
                    pm.expect(err).to.not.be.null;
                });
            });
            `,
            {
                ...baseContext,
                response: { code: 200, status: '200 OK', headers: {}, body: '{}' },
            }
        );

        assert.strictEqual(result.error, undefined);
        assert.strictEqual(result.testResults.length, 1);
        assert.strictEqual(result.testResults[0].name, 'sendRequest completed');
        assert.strictEqual(result.testResults[0].passed, true);
    });
});
