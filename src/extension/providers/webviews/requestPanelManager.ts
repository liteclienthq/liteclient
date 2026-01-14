import * as vscode from 'vscode';
import { RequestWebView } from './requestWebView';
import { HttpRequestService } from '../../services/httpRequestService';
import { HistoryService } from '../../services/historyService';
import { CollectionService, RequestItem } from '../../services/collectionService';
import { EnvironmentService } from '../../services/environmentService';
import { SettingsService } from '../../services/settingsService';
import type { RequestPanelToExtensionMessage, RequestExecutionSource } from '../../../shared/messages';

type MessageHandler = (panel: vscode.WebviewPanel, message: any, context: RequestContext) => Promise<void>;

interface RequestContext {
    originalRequest: any;
    source: 'history' | 'collection' | 'new';
    collectionId?: string;
    executionId?: string;
}

export class RequestPanelManager {
    private panels = new Map<string, vscode.WebviewPanel>();
    private messageHandlers: Record<string, MessageHandler> = {};

    constructor(
        private context: vscode.ExtensionContext,
        private historyService: HistoryService,
        private collectionService: CollectionService,
        private environmentService: EnvironmentService,
        private settingsService: SettingsService,
        private refreshHistory: () => void,
        private refreshCollections: () => void
    ) {
        this._initMessageHandlers();
    }

    private _initMessageHandlers(): void {
        this.messageHandlers = {
            'send-request': (panel, message, ctx) => this._handleSendRequest(panel, message, ctx),
            'get-environments': (panel) => this._handleGetEnvironments(panel),
            'set-environment': (_panel, message) => this._handleSetEnvironment(message.environmentId),
            'save-request': (panel, message, ctx) => this._handleSaveRequest(panel, message, ctx),
        };
    }

    async openRequest(item: any, source: 'history' | 'collection' | 'new', collectionId?: string, collectionName?: string) {
        let requestIdentity = '';
        if (source === 'history') {
            requestIdentity = `history-${item.id}`;
        } else if (source === 'collection') {
            requestIdentity = `collection-${collectionId}-${item.id}`;
        } else {
            requestIdentity = `new-request-${Date.now()}`;
        }

        const existingPanel = this.panels.get(requestIdentity);

        if (existingPanel) {
            existingPanel.reveal();
            this._populatePanel(existingPanel, item, source, collectionId, collectionName);
        } else {
            const itemName = source === 'history' ? item.request?.name : item.name;
            const itemUrl = source === 'history' ? item.request?.url : item.url;
            const title = this._getShortenedTitle(itemName || itemUrl || 'New Request');
            const panel = vscode.window.createWebviewPanel(
                "requestWebview",
                title,
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    enableFindWidget: true
                }
            );

            this._setupMessageHandler(panel, item, source, collectionId);
            panel.webview.html = RequestWebView.getHtmlContent(panel.webview, this.context.extensionUri);
            this._populatePanel(panel, item, source, collectionId, collectionName);

            this.panels.set(requestIdentity, panel);
            panel.onDidDispose(() => this.panels.delete(requestIdentity));
        }
    }

    private _populatePanel(panel: vscode.WebviewPanel, item: any, source: 'history' | 'collection' | 'new', collectionId?: string, collectionName?: string) {
        if (source === 'history') {
            panel.webview.postMessage({
                type: "load-request",
                payload: {
                    id: item.id,
                    ...item.request,
                    source,
                    executionId: item.id
                }
            });
        } else {
            panel.webview.postMessage({
                type: "load-request",
                payload: {
                    ...item,
                    source,
                    collectionId,
                    collectionPath: collectionName ? [collectionName] : undefined
                }
            });
        }
    }

    private _setupMessageHandler(panel: vscode.WebviewPanel, originalRequest: any, source: 'history' | 'collection' | 'new', collectionId?: string) {
        const context: RequestContext = {
            originalRequest,
            source,
            collectionId,
            executionId: source === 'history' ? originalRequest.id : undefined
        };

        panel.webview.onDidReceiveMessage(async (message: RequestPanelToExtensionMessage) => {
            const handler = this.messageHandlers[message.type];
            if (handler) {
                await handler(panel, message, context);
            }
        });
    }

    // --- Message Handlers ---

    private async _handleSendRequest(panel: vscode.WebviewPanel, message: any, ctx: RequestContext) {
        let environmentVariables: Record<string, string> = {};

        const messageEnvironmentId = message.environmentId;
        const globalSelectedEnvironmentId = await this.settingsService.getSelectedEnvironmentId();
        const selectedEnvironmentId = messageEnvironmentId !== undefined ? messageEnvironmentId : globalSelectedEnvironmentId;

        const globals = await this.environmentService.getEnvironmentById('globals');
        if (globals) {
            environmentVariables = { ...globals.variables };
        }

        if (selectedEnvironmentId && selectedEnvironmentId !== 'globals') {
            const selectedEnvironment = await this.environmentService.getEnvironmentById(selectedEnvironmentId);
            if (selectedEnvironment) {
                environmentVariables = { ...environmentVariables, ...selectedEnvironment.variables };
            }
        }

        const response = await HttpRequestService.sendRequest(message, environmentVariables);

        let historyName = message.name;
        if (!historyName || historyName === 'New Request') {
            try {
                const url = new URL(message.url);
                historyName = url.hostname + (url.pathname !== '/' ? url.pathname : '');
            } catch {
                historyName = message.url || 'New Request';
            }
        }

        const executionSource = this._buildExecutionSource(ctx);

        const execution = this.historyService.createExecution(
            {
                name: historyName,
                method: message.method,
                url: message.url,
                headers: message.headers || {},
                body: message.body || { mode: 'none' },
                auth: message.auth
            },
            executionSource,
            response.status
        );

        await this.historyService.add(execution);
        this.refreshHistory();

        panel.webview.postMessage({
            type: 'response',
            body: response.body,
            status: response.status,
            headers: response.headers,
            time: response.time,
            isError: response.isError
        });
    }

    private _buildExecutionSource(ctx: RequestContext): RequestExecutionSource {
        if (ctx.source === 'collection' && ctx.collectionId) {
            return {
                type: 'collection',
                collectionId: ctx.collectionId,
                requestId: ctx.originalRequest.id
            };
        } else if (ctx.source === 'history' && ctx.executionId) {
            return {
                type: 'history',
                executionId: ctx.executionId
            };
        }
        return { type: 'scratch' };
    }

    private async _handleGetEnvironments(panel: vscode.WebviewPanel) {
        const environments = await this.environmentService.load();
        const selectedEnvironmentId = await this.settingsService.getSelectedEnvironmentId();
        panel.webview.postMessage({
            type: 'environments-list',
            environments,
            selectedEnvironmentId
        });
    }

    private async _handleSetEnvironment(environmentId: string | undefined) {
        await this.settingsService.setSelectedEnvironmentId(environmentId);
        if (environmentId) {
            const env = await this.environmentService.getEnvironmentById(environmentId);
            if (env) {
                vscode.window.showInformationMessage(`Environment set to: ${env.name}`);
            }
        } else {
            vscode.window.showInformationMessage('Environment cleared');
        }
        this._broadcastToPanels('environments-list', {
            environments: await this.environmentService.load(),
            selectedEnvironmentId: environmentId
        });
    }

    private async _handleSaveRequest(panel: vscode.WebviewPanel, message: any, ctx: RequestContext) {
        const { originalRequest, collectionId } = ctx;

        if (collectionId) {
            const updatedRequest: RequestItem = {
                ...message.payload,
                type: 'request',
                id: originalRequest.id,
                name: message.name || originalRequest.name
            };
            await this.collectionService.updateRequest(collectionId, updatedRequest);
            this.refreshCollections();
            vscode.window.showInformationMessage('Request updated!');
        } else {
            const collections = await this.collectionService.load();
            const selected = await vscode.window.showQuickPick(
                collections.map(c => ({ label: c.name, detail: c.id, collection: c })),
                { placeHolder: 'Select a collection' }
            );

            if (selected) {
                const newRequest: RequestItem = {
                    ...message.payload,
                    type: 'request',
                    id: this._generateId(),
                    name: message.name || message.payload.url || 'Unnamed Request'
                };
                await this.collectionService.addRequest(selected.collection.id, newRequest);
                this.refreshCollections();
                vscode.window.showInformationMessage('Saved to collection!');
            }
        }
    }

    // --- Broadcast Methods ---

    private _broadcastToPanels(type: string, data: any) {
        for (const panel of this.panels.values()) {
            panel.webview.postMessage({ type, ...data });
        }
    }

    public async broadcastEnvironments() {
        this._broadcastToPanels('environments-list', {
            environments: await this.environmentService.load(),
            selectedEnvironmentId: await this.settingsService.getSelectedEnvironmentId()
        });
    }

    public async broadcastCollections() {
        this._broadcastToPanels('collections-list', {
            collections: await this.collectionService.load()
        });
    }

    public updateTitle(id: string, newTitle: string) {
        for (const [key, panel] of this.panels.entries()) {
            if (key.includes(id)) {
                panel.title = this._getShortenedTitle(newTitle);
            }
        }
    }

    // --- Utilities ---

    private _getShortenedTitle(title: string): string {
        return title.length > 20 ? title.substring(0, 17) + '...' : title;
    }

    private _generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
}
