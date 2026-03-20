import * as assert from 'assert';
import { resolveVariables } from '../extension/utils/variableResolver';
import { ScriptRunner } from '../extension/services/scriptRunner';
import { PostmanImporter } from '../extension/services/importers/PostmanImporter';
import { PostmanExporter } from '../extension/services/exporters/PostmanExporter';

suite('Collection Variables Test Suite', () => {
    test('resolveVariables applies globals, collection, environment precedence', () => {
        const resolved = resolveVariables({
            globals: {
                id: 'globals',
                name: 'Globals',
                variables: [
                    { id: 'g1', name: 'baseUrl', initialValue: 'https://global.example.com', type: 'default', enabled: true },
                    { id: 'g2', name: 'globalOnly', initialValue: 'global', type: 'default', enabled: true }
                ]
            },
            collectionVariables: [
                { id: 'c1', name: 'baseUrl', initialValue: 'https://collection.example.com', type: 'default', enabled: true },
                { id: 'c2', name: 'collectionOnly', initialValue: 'collection', type: 'default', enabled: true }
            ],
            environment: {
                id: 'env1',
                name: 'Dev',
                variables: [
                    { id: 'e1', name: 'baseUrl', initialValue: 'https://env.example.com', type: 'default', enabled: true },
                    { id: 'e2', name: 'envOnly', initialValue: 'env', type: 'default', enabled: true },
                    { id: 'e3', name: 'disabledVar', initialValue: 'ignore', type: 'default', enabled: false }
                ]
            }
        });

        assert.strictEqual(resolved.baseUrl, 'https://env.example.com');
        assert.strictEqual(resolved.collectionOnly, 'collection');
        assert.strictEqual(resolved.globalOnly, 'global');
        assert.strictEqual(resolved.envOnly, 'env');
        assert.ok(!('disabledVar' in resolved));
    });

    test('script runner exposes pm.collectionVariables and pm.variables precedence', () => {
        const runner = new ScriptRunner();
        const result = runner.runPreRequestScript(
            `
            pm.test('collection variable available', function () {
                pm.expect(pm.collectionVariables.get('collectionOnly')).to.equal('collection');
            });
            pm.test('pm.variables prefers environment', function () {
                pm.expect(pm.variables.get('baseUrl')).to.equal('https://env.example.com');
            });
            pm.collectionVariables.set('token', 'updated-token');
            pm.collectionVariables.unset('collectionOnly');
            `,
            {
                request: { method: 'GET', url: 'https://example.com', headers: {}, body: { mode: 'none' } },
                environmentVariables: { baseUrl: 'https://env.example.com' },
                collectionVariables: { baseUrl: 'https://collection.example.com', collectionOnly: 'collection' },
                globalVariables: { baseUrl: 'https://global.example.com' }
            }
        );

        assert.strictEqual(result.error, undefined);
        assert.strictEqual(result.testResults.length, 2);
        assert.ok(result.testResults.every(test => test.passed));
        assert.strictEqual(result.variableUpdates?.collection.token, 'updated-token');
        assert.strictEqual(result.variableUpdates?.collection.collectionOnly, null);
    });

    test('postman importer preserves collection variables', async () => {
        const importer = new PostmanImporter();
        const [collection] = await importer.import({
            info: {
                name: 'Imported',
                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
            },
            variable: [
                { key: 'baseUrl', value: 'https://api.example.com' },
                { key: 'apiKey', value: 'secret', disabled: true }
            ],
            item: []
        });

        assert.strictEqual(collection.variables?.length, 2);
        assert.strictEqual(collection.variables?.[0].name, 'baseUrl');
        assert.strictEqual(collection.variables?.[0].initialValue, 'https://api.example.com');
        assert.strictEqual(collection.variables?.[1].enabled, false);
    });

    test('postman exporter emits collection variables', async () => {
        const exporter = new PostmanExporter();
        const exported = await exporter.export({
            id: 'col-1',
            name: 'Collection',
            variables: [
                { id: 'v1', name: 'baseUrl', initialValue: 'https://api.example.com', type: 'default', enabled: true }
            ],
            items: []
        });

        const parsed = JSON.parse(exported);
        assert.strictEqual(parsed.variable.length, 1);
        assert.strictEqual(parsed.variable[0].key, 'baseUrl');
        assert.strictEqual(parsed.variable[0].value, 'https://api.example.com');
        assert.strictEqual(parsed.variable[0].disabled, false);
    });
});
