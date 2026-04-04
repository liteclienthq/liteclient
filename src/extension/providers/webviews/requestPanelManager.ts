import * as vscode from 'vscode';
import { RequestWebView } from './requestWebView';
import { HistoryService } from '../../services/historyService';
import { CollectionService, RequestItem } from '../../services/collectionService';
import { EnvironmentService } from '../../services/environmentService';
import { SettingsService } from '../../services/settingsService';
import { CookieJarService } from '../../services/cookieJarService';
import { CurrentValuesService } from '../../services/currentValuesService';
import { OAuth2TokenService } from '../../services/oauth2TokenService';
import { RequestExecutor } from '../../services/requestExecutor';
import type { RequestPanelToExtensionMessage, RequestExecutionSource } from '../../../shared/messages';
import { generateId } from '../../utils/idUtils';

type MessageHandler = (panel: vscode.WebviewPanel, message: any, context: RequestContext) => Promise<void>;

interface RequestContext {
    originalRequest: any;
    source: 'history' | 'collection' | 'new';
    collectionId?: string;
    collectionName?: string;
    executionId?: string;
}

interface PanelState {
    panel: vscode.WebviewPanel;
    baseTitle: string;
    isDirty: boolean;
}

interface ActiveRequest {
    abortController: AbortController;
}

export class RequestPanelManager {
    private panels = new Map<string, vscode.WebviewPanel>();
    private panelStates = new Map<string, PanelState>();
    private activeRequests = new Map<vscode.WebviewPanel, ActiveRequest>();
    private messageHandlers: Record<string, MessageHandler> = {};
    private oauth2TokenService: OAuth2TokenService;
    private requestExecutor: RequestExecutor;

    constructor(
        private context: vscode.ExtensionContext,
        private historyService: HistoryService,
        private collectionService: CollectionService,
        private environmentService: EnvironmentService,
        private settingsService: SettingsService,
        private cookieJarService: CookieJarService,
        private currentValuesService: CurrentValuesService,
        private refreshHistory: () => void,
        private refreshCollections: () => void
    ) {
        this.oauth2TokenService = new OAuth2TokenService(context);
        this.requestExecutor = new RequestExecutor(
            environmentService,
            collectionService,
            settingsService,
            cookieJarService,
            currentValuesService,
            this.oauth2TokenService,
        );
        this._initMessageHandlers();
    }

    private _initMessageHandlers(): void {
        this.messageHandlers = {
            'send-request': (panel, message, ctx) => this._handleSendRequest(panel, message, ctx),
            'cancel-request': (panel) => this._handleCancelRequest(panel),
            'get-environments': (panel) => this._handleGetEnvironments(panel),
            'set-environment': (_panel, message) => this._handleSetEnvironment(message.environmentId),
            'save-request': (panel, message, ctx) => this._handleSaveRequest(panel, message, ctx),
            'dirty-state': (panel, message) => this._handleDirtyState(panel, message.isDirty),
            'oauth2-get-token': (panel, message) => this._handleOAuth2GetToken(panel, message),
            'oauth2-clear-token': (panel, message) => this._handleOAuth2ClearToken(panel, message),
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
            await this._populatePanel(existingPanel, item, source, collectionId, collectionName);
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

            panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'file_icon.png');

            this._setupMessageHandler(panel, item, source, collectionId, collectionName, requestIdentity);
            panel.webview.html = RequestWebView.getHtmlContent(panel.webview, this.context.extensionUri);
            await this._populatePanel(panel, item, source, collectionId, collectionName);

            this.panels.set(requestIdentity, panel);
            this.panelStates.set(requestIdentity, { panel, baseTitle: title, isDirty: false });
            panel.onDidDispose(() => {
                this.panels.delete(requestIdentity);
                this.panelStates.delete(requestIdentity);
            });
        }
    }

    private async _populatePanel(panel: vscode.WebviewPanel, item: any, source: 'history' | 'collection' | 'new', collectionId?: string, collectionName?: string) {
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
            const collection = collectionId ? await this.collectionService.getCollectionById(collectionId) : undefined;
            panel.webview.postMessage({
                type: "load-request",
                payload: {
                    ...item,
                    source,
                    collectionId,
                    collectionPath: collectionName ? [collectionName] : undefined,
                    collectionVariables: collection?.variables || []
                }
            });
        }
    }

    private _setupMessageHandler(panel: vscode.WebviewPanel, originalRequest: any, source: 'history' | 'collection' | 'new', collectionId?: string, collectionName?: string, requestIdentity?: string) {
        const context: RequestContext = {
            originalRequest,
            source,
            collectionId,
            collectionName,
            executionId: source === 'history' ? originalRequest.id : undefined
        };

        panel.webview.onDidReceiveMessage(async (message: RequestPanelToExtensionMessage) => {
            if (message.type === 'dirty-state' && requestIdentity) {
                this._handleDirtyState(panel, message.isDirty, requestIdentity);
                return;
            }
            if (message.type === 'show-notification') {
                if (message.level === 'error') {
                    vscode.window.showErrorMessage(message.message);
                } else if (message.level === 'warning') {
                    vscode.window.showWarningMessage(message.message);
                } else {
                    vscode.window.showInformationMessage(message.message);
                }
                return;
            }
            const handler = this.messageHandlers[message.type];
            if (handler) {
                await handler(panel, message, context);
            }
        });
    }

    private async _handleDirtyState(panel: vscode.WebviewPanel, isDirty: boolean, requestIdentity?: string): Promise<void> {
        if (!requestIdentity) {
            for (const [id, state] of this.panelStates.entries()) {
                if (state.panel === panel) {
                    requestIdentity = id;
                    break;
                }
            }
        }

        if (!requestIdentity) {
            return;
        }

        const state = this.panelStates.get(requestIdentity);
        if (state && state.isDirty !== isDirty) {
            state.isDirty = isDirty;
            panel.title = isDirty ? `${state.baseTitle} ●` : state.baseTitle;
        }
    }

    // --- Message Handlers ---

    private async _handleSendRequest(panel: vscode.WebviewPanel, message: any, ctx: RequestContext) {
        const abortController = new AbortController();
        this.activeRequests.set(panel, { abortController });

        try {
            const result = await this.requestExecutor.execute({
                request: {
                    method: message.method,
                    url: message.url,
                    headers: message.headers || {},
                    body: message.body || { mode: 'none' },
                    auth: message.auth,
                    name: message.name,
                    preRequestScript: message.preRequestScript,
                    postResponseScript: message.postResponseScript,
                },
                collectionId: ctx.collectionId,
                environmentId: message.environmentId,
                signal: abortController.signal,
                persistVariableUpdates: true,
            });

            // Refresh sidebar if variable updates were persisted
            if (result.variableState) {
                try {
                    await this.broadcastEnvironments();
                    if (ctx.collectionId) {
                        this.refreshCollections();
                        await this.broadcastCollectionState(ctx.collectionId);
                    }
                } catch {
                    // Non-critical
                }
            }

            // Record in history (non-critical — don't lose the response if this fails)
            if (!result.cancelled) {
                try {
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
                            auth: message.auth,
                            preRequestScript: message.preRequestScript,
                            postResponseScript: message.postResponseScript,
                        },
                        executionSource,
                        result.status,
                        result.durationMs
                    );

                    await this.historyService.add(execution);
                    this.refreshHistory();
                } catch (historyError) {
                    console.error('[LiteClient] Failed to save history entry:', historyError);
                }
            }

            panel.webview.postMessage({
                type: 'response',
                body: result.responseBody,
                status: result.status,
                headers: result.responseHeaders,
                cookies: result.cookies,
                time: result.durationMs,
                isError: result.isError,
                testResults: result.testResults,
                consoleLogs: result.consoleLogs,
                scriptError: result.scriptError,
            });
        } catch (error) {
            if (abortController.signal.aborted) {
                panel.webview.postMessage({
                    type: 'response',
                    body: 'Request Cancelled\n\nThe request was cancelled by the user.',
                    status: 'Cancelled',
                    headers: {},
                    cookies: [],
                    time: 0,
                    isError: true,
                });
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('[LiteClient] Request failed:', error);
                panel.webview.postMessage({
                    type: 'response',
                    body: `Request Failed\n\nAn unexpected error occurred.\n\nDetails: ${errorMessage}`,
                    status: 'Error',
                    headers: {},
                    cookies: [],
                    time: 0,
                    isError: true,
                });
            }
        } finally {
            this.activeRequests.delete(panel);
        }
    }

    private async _handleCancelRequest(panel: vscode.WebviewPanel): Promise<void> {
        const activeRequest = this.activeRequests.get(panel);
        if (activeRequest) {
            activeRequest.abortController.abort();
        }
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
        const merged = this.currentValuesService.mergeIntoEnvironments(environments);
        const selectedEnvironmentId = await this.settingsService.getSelectedEnvironmentId();
        panel.webview.postMessage({
            type: 'environments-list',
            environments: merged,
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
        const envs = await this.environmentService.load();
        const merged = this.currentValuesService.mergeIntoEnvironments(envs);
        this._broadcastToPanels('environments-list', {
            environments: merged,
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
            await this.broadcastCollectionState(collectionId);
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
                    id: generateId(),
                    name: message.name || message.payload.url || 'Unnamed Request'
                };
                await this.collectionService.addRequest(selected.collection.id, newRequest);
                this.refreshCollections();
                await this.broadcastCollectionState(selected.collection.id);
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
        const environments = await this.environmentService.load();
        const merged = this.currentValuesService.mergeIntoEnvironments(environments);
        this._broadcastToPanels('environments-list', {
            environments: merged,
            selectedEnvironmentId: await this.settingsService.getSelectedEnvironmentId()
        });
    }

    public async broadcastCollections() {
        this._broadcastToPanels('collections-list', {
            collections: await this.collectionService.load()
        });
    }

    public async broadcastCollectionState(collectionId: string): Promise<void> {
        const collection = await this.collectionService.getCollectionById(collectionId);
        if (!collection) {
            return;
        }

        this._broadcastToPanels('collection-state', {
            collectionId: collection.id,
            name: collection.name,
            variables: collection.variables || []
        });
    }

    public updateTitle(id: string, newTitle: string) {
        for (const [key, panel] of this.panels.entries()) {
            if (key.includes(id)) {
                panel.title = this._getShortenedTitle(newTitle);
            }
        }
    }

    // --- OAuth2 Handlers ---

    private async _handleOAuth2GetToken(panel: vscode.WebviewPanel, message: any): Promise<void> {
        const config = message.config;
        if (!config) {
            vscode.window.showErrorMessage('OAuth2: No configuration provided');
            panel.webview.postMessage({
                type: 'oauth2-token-result',
                success: false,
                error: 'No OAuth2 configuration provided'
            });
            return;
        }

        try {
            if (config.grantType === 'authorization_code') {
                const tokenRecord = await this.oauth2TokenService.startAuthorizationCodeFlow(config);
                vscode.window.showInformationMessage('OAuth2: Token acquired successfully');
                panel.webview.postMessage({
                    type: 'oauth2-token-result',
                    success: true,
                    expiresAt: tokenRecord.expiresAt
                });
            } else {
                await this.oauth2TokenService.requestClientCredentialsToken(config);
                const status = await this.oauth2TokenService.getTokenStatus(config);
                vscode.window.showInformationMessage('OAuth2: Token acquired successfully');
                panel.webview.postMessage({
                    type: 'oauth2-token-result',
                    success: true,
                    expiresAt: status.expiresAt
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to get token';
            vscode.window.showErrorMessage(`OAuth2: ${errorMessage}`);
            panel.webview.postMessage({
                type: 'oauth2-token-result',
                success: false,
                error: errorMessage
            });
        }
    }

    private async _handleOAuth2ClearToken(panel: vscode.WebviewPanel, message: any): Promise<void> {
        const config = message.config;
        if (config) {
            await this.oauth2TokenService.clearToken(config);
            vscode.window.showInformationMessage('OAuth2: Token cleared');
        }
        panel.webview.postMessage({
            type: 'oauth2-token-result',
            success: false
        });
    }

    getOAuth2TokenService(): OAuth2TokenService {
        return this.oauth2TokenService;
    }

    // --- Utilities ---

    private _getShortenedTitle(title: string): string {
        return title.length > 20 ? title.substring(0, 17) + '...' : title;
    }
}
