import * as vscode from 'vscode';
import { RequestWebView } from './requestWebView';
import { HttpRequestService } from '../../services/httpRequestService';
import { HistoryService } from '../../services/historyService';
import { CollectionService, RequestItem } from '../../services/collectionService';
import { EnvironmentService } from '../../services/environmentService';
import { SettingsService } from '../../services/settingsService';

export class RequestPanelManager {
    private panels = new Map<string, vscode.WebviewPanel>();

    constructor(
        private context: vscode.ExtensionContext,
        private historyService: HistoryService,
        private collectionService: CollectionService,
        private environmentService: EnvironmentService,
        private settingsService: SettingsService,
        private refreshHistory: () => void,
        private refreshCollections: () => void
    ) { }

    async openRequest(item: any, source: 'history' | 'collection' | 'new', collectionId?: string, collectionName?: string) {
        let requestIdentity = '';
        if (source === 'history') {
            requestIdentity = `history-${item.id || `${item.method.toUpperCase()}-${item.url}`}`;
        } else if (source === 'collection') {
            requestIdentity = `collection-${collectionId}-${item.id}`;
        } else {
            requestIdentity = `new-request-${Date.now()}`;
        }

        const existingPanel = this.panels.get(requestIdentity);

        if (existingPanel) {
            existingPanel.reveal();
            this.populatePanel(existingPanel, item, source, collectionId, collectionName);
        } else {
            const title = this.getShortenedTitle(item.name || item.url || 'New Request');
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

            this.setupMessageHandler(panel, item, collectionId);
            panel.webview.html = RequestWebView.getHtmlContent(panel.webview, this.context.extensionUri);

            this.populatePanel(panel, item, source, collectionId, collectionName);

            this.panels.set(requestIdentity, panel);
            panel.onDidDispose(() => this.panels.delete(requestIdentity));
        }
    }

    private populatePanel(panel: vscode.WebviewPanel, item: any, source: string, collectionId?: string, collectionName?: string) {
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

    private setupMessageHandler(panel: vscode.WebviewPanel, originalRequest: any, collectionId?: string) {
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'send-request':
                    await this.handleSendRequest(panel, message);
                    break;
                case 'get-environments':
                    await this.handleGetEnvironments(panel);
                    break;
                case 'set-environment':
                    await this.handleSetEnvironment(message.environmentId);
                    break;
                case 'save-request':
                    await this.handleSaveRequest(panel, message, originalRequest, collectionId);
                    break;
            }
        });
    }

    private async handleSendRequest(panel: vscode.WebviewPanel, message: any) {
        let environmentVariables: Record<string, string> = {};

        // Use the environmentId from the message if provided, otherwise fall back to the global setting
        const messageEnvironmentId = message.environmentId;
        const globalSelectedEnvironmentId = await this.settingsService.getSelectedEnvironmentId();

        // Prioritize the environment selected in the request panel over the global setting
        const selectedEnvironmentId = messageEnvironmentId !== undefined ? messageEnvironmentId : globalSelectedEnvironmentId;

        // Load Globals first (always available as the base layer)
        const globals = await this.environmentService.getEnvironmentById('globals');
        if (globals) {
            environmentVariables = { ...globals.variables };
        }

        // Merge custom environment variables if selected (overwrites globals)
        if (selectedEnvironmentId && selectedEnvironmentId !== 'globals') {
            const selectedEnvironment = await this.environmentService.getEnvironmentById(selectedEnvironmentId);
            if (selectedEnvironment) {
                environmentVariables = { ...environmentVariables, ...selectedEnvironment.variables };
            } else {
                // Environment not found for ID
            }
        } else if (!selectedEnvironmentId) {
            // No custom environment selected, using Globals only
        }

        const response = await HttpRequestService.sendRequest(message, environmentVariables);

        let historyName = message.name;
        if (!historyName || historyName === 'New Request') {
            try {
                const url = new URL(message.url);
                historyName = url.hostname + (url.pathname !== '/' ? url.pathname : '');
            } catch (e) {
                historyName = message.url || 'New Request';
            }
        }

        await this.historyService.add({
            id: this.generateId(),
            timestamp: Date.now(),
            name: historyName,
            method: message.method,
            url: message.url,
            headers: message.headers || {},
            body: message.body || { mode: 'none' },
            status: response.status
        });


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

    private async handleGetEnvironments(panel: vscode.WebviewPanel) {
        const environments = await this.environmentService.load();
        const selectedEnvironmentId = await this.settingsService.getSelectedEnvironmentId();
        panel.webview.postMessage({
            type: 'environments-list',
            environments,
            selectedEnvironmentId
        });
    }

    private async handleSetEnvironment(environmentId: string) {
        await this.settingsService.setSelectedEnvironmentId(environmentId);
        if (environmentId) {
            const env = await this.environmentService.getEnvironmentById(environmentId);
            if (env) {
                vscode.window.showInformationMessage(`Environment set to: ${env.name}`);
            }

        } else {
            vscode.window.showInformationMessage('Environment cleared');
        }
        this.broadcastToPanels('environments-list', {
            environments: await this.environmentService.load(),
            selectedEnvironmentId: environmentId
        });
    }

    private async handleSaveRequest(panel: vscode.WebviewPanel, message: any, originalRequest: any, collectionId?: string) {
        if (collectionId) {
            // Update existing
            const updatedRequest: RequestItem = {
                ...message.payload,
                id: originalRequest.id,
                name: message.name || originalRequest.name
            };
            await this.collectionService.updateRequest(collectionId, updatedRequest);
            this.refreshCollections();
            vscode.window.showInformationMessage('Request updated!');
        } else {
            // New save (show picker)
            const collections = await this.collectionService.load();
            const selected = await vscode.window.showQuickPick(
                collections.map(c => ({ label: c.name, detail: c.id, collection: c })),
                { placeHolder: 'Select a collection' }
            );

            if (selected) {
                const newRequest: RequestItem = {
                    ...message.payload,
                    id: this.generateId(),
                    name: message.name || message.payload.url || 'Unnamed Request'
                };
                await this.collectionService.addRequest(selected.collection.id, newRequest);
                this.refreshCollections();
                vscode.window.showInformationMessage('Saved to collection!');
            }
        }
    }

    private broadcastToPanels(type: string, data: any) {
        for (const panel of this.panels.values()) {
            panel.webview.postMessage({ type, ...data });
        }
    }

    public async broadcastEnvironments() {
        this.broadcastToPanels('environments-list', {
            environments: await this.environmentService.load(),
            selectedEnvironmentId: await this.settingsService.getSelectedEnvironmentId()
        });
    }

    public async broadcastCollections() {
        this.broadcastToPanels('collections-list', {
            collections: await this.collectionService.load()
        });
    }

    public updateTitle(id: string, newTitle: string) {
        const panels = Array.from(this.panels.entries());
        for (const [key, panel] of panels) {
            if (key.includes(id)) {
                panel.title = this.getShortenedTitle(newTitle);
            }
        }
    }

    private getShortenedTitle(title: string): string {
        return title.length > 20 ? title.substring(0, 17) + '...' : title;
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
}
