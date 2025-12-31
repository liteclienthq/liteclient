import * as vscode from 'vscode';
import { SidebarWebView } from './sidebarWebView';
import { HistoryService } from '../../services/historyService';
import { CollectionService } from '../../services/collectionService';
import { EnvironmentService } from '../../services/environmentService';
import { SettingsService } from '../../services/settingsService';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'liteclient-sidebar-view';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _historyService: HistoryService,
        private readonly _collectionService: CollectionService,
        private readonly _environmentService: EnvironmentService,
        private readonly _settingsService: SettingsService
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = SidebarWebView.getHtmlContent(webviewView.webview, this._extensionUri);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'get-history':
                    this.refreshHistory();
                    break;
                case 'get-collections':
                    this.refreshCollections();
                    break;
                case 'get-environments':
                    this.refreshEnvironments();
                    break;
                case 'new-request':
                    vscode.commands.executeCommand('liteclient.newRequest');
                    break;
                case 'add-collection':
                    vscode.commands.executeCommand('liteclient.newCollection');
                    break;
                case 'open-request':
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
                    break;
                case 'history-action':
                    if (data.action === 'delete') {
                        vscode.commands.executeCommand('liteclient.deleteHistoryItem', { id: data.id });
                    } else if (data.action === 'rename') {
                        vscode.commands.executeCommand('liteclient.renameHistoryRequest', { id: data.id });
                    } else if (data.action === 'clear-all') {
                        vscode.commands.executeCommand('liteclient.clearHistory');
                    } else if (data.action === 'add-to-collection') {
                        const history = await this._historyService.load();
                        const item = history.find(h => h.id === data.id);
                        if (item) {
                            vscode.commands.executeCommand('liteclient.addHistoryToCollection', item);
                        }
                    }
                    break;

                case 'collection-action':
                    if (data.action === 'delete') {
                        const collections = await this._collectionService.load();
                        const collection = collections.find(c => c.id === data.collectionId);
                        if (collection) {
                            vscode.commands.executeCommand('liteclient.deleteCollection', { collection });
                        }
                    } else if (data.action === 'rename') {
                        const collections = await this._collectionService.load();
                        const collection = collections.find(c => c.id === data.collectionId);
                        if (collection) {
                            vscode.commands.executeCommand('liteclient.renameCollection', { collection });
                        }
                    }
                    break;
                case 'add-collection-request':
                    vscode.commands.executeCommand('liteclient.addRequestToCollection', {
                        collectionId: data.collectionId,
                        parentId: data.parentId // Optional
                    });
                    break;
                case 'add-collection-folder':
                    vscode.commands.executeCommand('liteclient.addFolderToCollection', {
                        collectionId: data.collectionId,
                        parentId: data.parentId // Optional
                    });
                    break;
                case 'collection-item-action':
                    if (data.action === 'delete') {
                        vscode.commands.executeCommand('liteclient.deleteCollectionItem', { collectionId: data.collectionId, itemId: data.itemId });
                    } else if (data.action === 'rename') {
                        vscode.commands.executeCommand('liteclient.renameCollectionItem', { collectionId: data.collectionId, itemId: data.itemId, name: data.name });
                    }
                    break;
                case 'env-action':
                    if (data.action === 'add') {
                        vscode.commands.executeCommand('liteclient.newEnvironment');
                    } else if (data.action === 'delete') {
                        vscode.commands.executeCommand('liteclient.deleteEnvironment', { env: { id: data.id } });
                    } else if (data.action === 'rename') {
                        const envs = await this._environmentService.load();
                        const env = envs.find(e => e.id === data.id);
                        if (env) {
                            vscode.commands.executeCommand('liteclient.renameEnvironment', { env });
                        }
                    } else if (data.action === 'update-vars') {
                        const envs = await this._environmentService.load();
                        const env = envs.find(e => e.id === data.id);
                        if (env) {
                            await this._environmentService.updateEnvironment({
                                ...env,
                                variables: data.variables
                            });
                            this.refreshEnvironments();
                        }
                    }
                    break;
                case 'env-variable-action':
                    if (data.action === 'add-variable') {
                        const envs = await this._environmentService.load();
                        const env = envs.find(e => e.id === data.envId);
                        if (env) {
                            // Check if varName and newValue are provided (for direct adding)
                            if (data.varName && data.newValue !== undefined) {
                                // Direct add for inline adding
                                env.variables[data.varName] = data.newValue;
                                await this._environmentService.updateEnvironment(env);
                                this.refreshEnvironments();
                            } else {
                                // Use command for popup adding
                                vscode.commands.executeCommand('liteclient.addVariableToEnvironment', { env });
                            }
                        }
                    } else if (data.action === 'edit-variable') {
                        const envs = await this._environmentService.load();
                        const env = envs.find(e => e.id === data.envId);
                        if (env && data.varName) {
                            // Check if newValue is provided (for inline editing)
                            if (data.newValue !== undefined) {
                                // Direct update for inline editing
                                env.variables[data.varName] = data.newValue;
                                await this._environmentService.updateEnvironment(env);
                                this.refreshEnvironments();
                            } else {
                                // Use command for popup editing
                                vscode.commands.executeCommand('liteclient.editVariable', {
                                    environmentId: data.envId,
                                    variableName: data.varName,
                                    variableValue: env.variables[data.varName]
                                });
                            }
                        }
                    } else if (data.action === 'delete-variable') {
                        const envs = await this._environmentService.load();
                        const env = envs.find(e => e.id === data.envId);
                        if (env && data.varName) {
                            vscode.commands.executeCommand('liteclient.deleteVariable', {
                                environmentId: data.envId,
                                variableName: data.varName
                            });
                        }
                    }
                    break;

                case 'set-environment':
                    await this._settingsService.setSelectedEnvironmentId(data.environmentId);
                    this.refreshEnvironments();
                    break;

            }
        });
    }

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
