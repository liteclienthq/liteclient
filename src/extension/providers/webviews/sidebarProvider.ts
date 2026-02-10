import * as vscode from 'vscode';
import { SidebarWebView } from './sidebarWebView';
import { HistoryService } from '../../services/historyService';
import { CollectionService } from '../../services/collectionService';
import { EnvironmentService } from '../../services/environmentService';
import { SettingsService } from '../../services/settingsService';
import type { SidebarToExtensionMessage } from '../../../shared/messages';
import type { EnvironmentVariable } from '../../../shared/models';
import { generateId } from '../../utils/idUtils';

type MessageHandler = (data: any) => void | Promise<void> | Thenable<unknown>;

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'liteclient-sidebar-view';
    private _view?: vscode.WebviewView;
    private _messageHandlers: Record<string, MessageHandler> = {};

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _historyService: HistoryService,
        private readonly _collectionService: CollectionService,
        private readonly _environmentService: EnvironmentService,
        private readonly _settingsService: SettingsService
    ) {
        this._initMessageHandlers();
    }

    private _initMessageHandlers(): void {
        this._messageHandlers = {
            'get-history': () => this.refreshHistory(),
            'get-collections': () => this.refreshCollections(),
            'get-environments': () => this.refreshEnvironments(),
            'new-request': () => vscode.commands.executeCommand('liteclient.newRequest'),
            'add-collection': () => vscode.commands.executeCommand('liteclient.newCollection'),
            'import-collection': () => vscode.commands.executeCommand('liteclient.importCollection'),
            'open-request': (data) => this._handleOpenRequest(data),
            'history-action': (data) => this._handleHistoryAction(data),
            'collection-action': (data) => this._handleCollectionAction(data),
            'add-collection-request': (data) => this._handleAddCollectionRequest(data),
            'add-collection-folder': (data) => this._handleAddCollectionFolder(data),
            'collection-item-action': (data) => this._handleCollectionItemAction(data),
            'move-collection-item': (data) => this._handleMoveCollectionItem(data),
            'env-action': (data) => this._handleEnvAction(data),
            'env-variable-action': (data) => this._handleEnvVariableAction(data),
            'set-environment': (data) => this._handleSetEnvironment(data),
        };
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = SidebarWebView.getHtmlContent(webviewView.webview, this._extensionUri);

        webviewView.webview.onDidReceiveMessage(async (data: SidebarToExtensionMessage) => {
            const handler = this._messageHandlers[data.type];
            if (handler) {
                await handler(data);
            }
        });
    }

    // --- Message Handlers ---

    private async _handleOpenRequest(data: { source: string; id: string }) {
        if (data.source === 'history') {
            const history = await this._historyService.load();
            const item = history.find(h => h.id === data.id);
            if (item) {
                vscode.commands.executeCommand('liteclient.openHistoryRequest', item);
            }
        } else if (data.source === 'collection') {
            const result = await this._collectionService.findRequestInCollections(data.id);
            if (result) {
                vscode.commands.executeCommand('liteclient.openCollectionRequest', result.request);
            }
        }
    }

    private async _handleHistoryAction(data: { action: string; id?: string; ids?: string[] }) {
        switch (data.action) {
            case 'delete':
                vscode.commands.executeCommand('liteclient.deleteHistoryItem', { id: data.id });
                break;
            case 'delete-bulk':
                if (data.ids && data.ids.length > 0) {
                    vscode.commands.executeCommand('liteclient.deleteHistoryItems', { ids: data.ids });
                }
                break;
            case 'clear-all':
                vscode.commands.executeCommand('liteclient.clearHistory');
                break;
        }
    }

    private async _handleCollectionAction(data: { action: string; collectionId: string }) {
        const collections = await this._collectionService.load();
        const collection = collections.find(c => c.id === data.collectionId);
        if (!collection) {return;}

        switch (data.action) {
            case 'delete':
                vscode.commands.executeCommand('liteclient.deleteCollection', { collection });
                break;
            case 'rename':
                vscode.commands.executeCommand('liteclient.renameCollection', { collection });
                break;
            case 'export':
                vscode.commands.executeCommand('liteclient.exportCollection', { collection });
                break;
        }
    }

    private _handleAddCollectionRequest(data: { collectionId: string; parentId?: string }) {
        vscode.commands.executeCommand('liteclient.addRequestToCollection', {
            collectionId: data.collectionId,
            parentId: data.parentId
        });
    }

    private _handleAddCollectionFolder(data: { collectionId: string; parentId?: string }) {
        vscode.commands.executeCommand('liteclient.addFolderToCollection', {
            collectionId: data.collectionId,
            parentId: data.parentId
        });
    }

    private _handleCollectionItemAction(data: { action: string; collectionId: string; itemId: string; name?: string }) {
        switch (data.action) {
            case 'delete':
                vscode.commands.executeCommand('liteclient.deleteCollectionItem', {
                    collectionId: data.collectionId,
                    itemId: data.itemId
                });
                break;
            case 'rename':
                vscode.commands.executeCommand('liteclient.renameCollectionItem', {
                    collectionId: data.collectionId,
                    itemId: data.itemId,
                    name: data.name
                });
                break;
        }
    }

    private async _handleMoveCollectionItem(data: { sourceCollectionId: string; targetCollectionId: string; itemId: string; targetParentId?: string; insertBeforeId?: string }) {
        try {
            await this._collectionService.moveItem(
                data.sourceCollectionId,
                data.targetCollectionId,
                data.itemId,
                data.targetParentId,
                data.insertBeforeId
            );
            this.refreshCollections();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to move item: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async _handleEnvAction(data: { action: string; id?: string; variables?: EnvironmentVariable[] }) {
        switch (data.action) {
            case 'add':
                vscode.commands.executeCommand('liteclient.newEnvironment');
                break;
            case 'delete':
                vscode.commands.executeCommand('liteclient.deleteEnvironment', { env: { id: data.id } });
                break;
            case 'rename':
                const envs = await this._environmentService.load();
                const env = envs.find(e => e.id === data.id);
                if (env) {
                    vscode.commands.executeCommand('liteclient.renameEnvironment', { env });
                }
                break;
            case 'update-vars':
                const allEnvs = await this._environmentService.load();
                const targetEnv = allEnvs.find(e => e.id === data.id);
                if (targetEnv && data.variables) {
                    await this._environmentService.updateEnvironment({
                        ...targetEnv,
                        variables: data.variables
                    });
                    this.refreshEnvironments();
                }
                break;
        }
    }

    private async _handleEnvVariableAction(data: { action: string; envId: string; varName?: string; newValue?: string }) {
        const envs = await this._environmentService.load();
        const env = envs.find(e => e.id === data.envId);
        if (!env) {return;}

        switch (data.action) {
            case 'add-variable':
                if (data.varName && data.newValue !== undefined) {
                    env.variables.push({ id: generateId(), name: data.varName, initialValue: data.newValue, type: 'default', enabled: true });
                    await this._environmentService.updateEnvironment(env);
                    this.refreshEnvironments();
                } else {
                    vscode.commands.executeCommand('liteclient.addVariableToEnvironment', { env });
                }
                break;
            case 'edit-variable':
                if (data.varName) {
                    if (data.newValue !== undefined) {
                        const envVar = env.variables.find(v => v.name === data.varName);
                        if (envVar) { envVar.initialValue = data.newValue; }
                        await this._environmentService.updateEnvironment(env);
                        this.refreshEnvironments();
                    } else {
                        vscode.commands.executeCommand('liteclient.editVariable', {
                            environmentId: data.envId,
                            variableName: data.varName,
                            variableValue: env.variables.find(v => v.name === data.varName)?.initialValue
                        });
                    }
                }
                break;
            case 'delete-variable':
                if (data.varName) {
                    vscode.commands.executeCommand('liteclient.deleteVariable', {
                        environmentId: data.envId,
                        variableName: data.varName
                    });
                }
                break;
        }
    }

    private async _handleSetEnvironment(data: { environmentId: string | undefined }) {
        await this._settingsService.setSelectedEnvironmentId(data.environmentId);
        this.refreshEnvironments();
    }

    // --- Refresh Methods ---

    public async refreshHistory() {
        if (this._view) {
            const items = await this._historyService.load();
            this._view.webview.postMessage({ type: 'history-list', items });
        }
    }

    public async refreshCollections() {
        if (this._view) {
            const collections = await this._collectionService.load();
            this._view.webview.postMessage({ type: 'collections-list', collections });
        }
    }

    public async refreshEnvironments() {
        if (this._view) {
            const environments = await this._environmentService.load();
            const selectedEnvironmentId = await this._settingsService.getSelectedEnvironmentId();
            this._view.webview.postMessage({
                type: 'environments-list',
                environments,
                selectedEnvironmentId
            });
        }
    }
}
