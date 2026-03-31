import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { StorageService } from '../extension/storage/storageService';
import { HistoryService } from '../extension/services/historyService';
import { EnvironmentService } from '../extension/services/environmentService';
import { CollectionService } from '../extension/services/collectionService';

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class SlowReadStorageService extends StorageService {
    override async readJson<T>(fileName: string, defaultValue?: T): Promise<T> {
        await delay(25);
        return super.readJson(fileName, defaultValue);
    }

    override async writeJson(fileName: string, data: any): Promise<void> {
        await delay(25);
        await super.writeJson(fileName, data);
    }
}

function createContext(storagePath: string): vscode.ExtensionContext {
    return {
        globalStorageUri: vscode.Uri.file(storagePath)
    } as vscode.ExtensionContext;
}

suite('Concurrency Safety Test Suite', () => {
    let storageDir: string;
    let storage: StorageService;

    setup(async () => {
        storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'liteclient-concurrency-'));
        storage = new SlowReadStorageService(createContext(storageDir));
    });

    teardown(async () => {
        await fs.rm(storageDir, { recursive: true, force: true });
    });

    test('concurrent history adds preserve both entries', async () => {
        const historyService = new HistoryService(storage);

        await Promise.all([
            historyService.add({
                id: 'history-1',
                timestamp: 1,
                source: { type: 'scratch' },
                request: {
                    method: 'GET',
                    url: 'https://example.com/1',
                    headers: {},
                    body: { mode: 'none' }
                },
                result: { status: '200 OK' }
            }),
            historyService.add({
                id: 'history-2',
                timestamp: 2,
                source: { type: 'scratch' },
                request: {
                    method: 'GET',
                    url: 'https://example.com/2',
                    headers: {},
                    body: { mode: 'none' }
                },
                result: { status: '200 OK' }
            })
        ]);

        const history = await historyService.load();
        assert.deepStrictEqual(
            history.map(entry => entry.id).sort(),
            ['history-1', 'history-2']
        );
    });

    test('concurrent environment variable updates preserve both changes', async () => {
        const environmentService = new EnvironmentService(storage);
        await environmentService.addEnvironment('Dev');
        const [environment] = (await environmentService.load()).filter(env => env.id !== 'globals');

        await Promise.all([
            environmentService.applyVariableUpdates(environment.id, { apiUrl: 'https://api.example.com' }),
            environmentService.applyVariableUpdates(environment.id, { apiKey: 'secret-key' })
        ]);

        const updated = await environmentService.getEnvironmentById(environment.id);
        assert.ok(updated);
        assert.deepStrictEqual(
            updated.variables.map(variable => variable.name).sort(),
            ['apiKey', 'apiUrl']
        );
    });

    test('concurrent collection variable updates and request rename both persist', async () => {
        const collectionService = new CollectionService(storage);
        await collectionService.addCollection('API');
        const [collection] = await collectionService.load();

        await collectionService.addRequest(collection.id, {
            id: 'request-1',
            name: 'Original Request',
            method: 'GET',
            url: 'https://example.com',
            headers: {},
            body: { mode: 'none' }
        });

        await Promise.all([
            collectionService.renameItem(collection.id, 'request-1', 'Renamed Request'),
            collectionService.applyVariableUpdates(collection.id, { token: 'abc123' })
        ]);

        const updated = await collectionService.getCollectionById(collection.id);
        assert.ok(updated);
        assert.strictEqual(updated.items[0].type, 'request');
        assert.strictEqual(updated.items[0].name, 'Renamed Request');
        assert.strictEqual(updated.variables?.[0].name, 'token');
        assert.strictEqual(updated.variables?.[0].initialValue, 'abc123');
    });
});
