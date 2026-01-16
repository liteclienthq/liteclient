import * as vscode from 'vscode';
import { HistoryService } from '../services/historyService';
import { CollectionService, RequestItem } from '../services/collectionService';
import { SidebarProvider } from '../providers/webviews/sidebarProvider';
import { RequestPanelManager } from '../providers/webviews/requestPanelManager';

export interface HistoryCommandDeps {
    historyService: HistoryService;
    collectionService: CollectionService;
    sidebarProvider: SidebarProvider;
    requestPanelManager: RequestPanelManager;
}

export function registerHistoryCommands(
    context: vscode.ExtensionContext,
    deps: HistoryCommandDeps
): void {
    const { historyService, collectionService, sidebarProvider, requestPanelManager } = deps;

    context.subscriptions.push(
        vscode.commands.registerCommand('liteclient.openHistoryRequest', (historyItem: any) => {
            requestPanelManager.openRequest(historyItem, 'history');
        }),

        vscode.commands.registerCommand('liteclient.deleteHistoryItem', async (item: any) => {
            const itemId = item.id || (item.item ? item.item.id : null);
            if (itemId) {
                await historyService.delete(itemId);
                sidebarProvider.refreshHistory();
            }
        }),

        vscode.commands.registerCommand('liteclient.deleteHistoryItems', async (data: { ids: string[] }) => {
            if (data.ids && data.ids.length > 0) {
                for (const id of data.ids) {
                    await historyService.delete(id);
                }
                sidebarProvider.refreshHistory();
            }
        }),

        vscode.commands.registerCommand('liteclient.addHistoryToCollection', async (execution: any) => {
            const collections = await collectionService.load();
            if (collections.length === 0) {
                vscode.window.showErrorMessage("No collections found. Create a collection first.");
                return;
            }

            const items = collections.map(c => ({ label: c.name, description: c.id }));
            const selected = await vscode.window.showQuickPick(items, { placeHolder: "Select a collection" });

            if (selected) {
                const snapshot = execution.request;
                const request: RequestItem = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                    name: snapshot.name || "New Request",
                    type: 'request',
                    method: snapshot.method,
                    url: snapshot.url,
                    headers: snapshot.headers,
                    body: snapshot.body,
                    auth: snapshot.auth
                };
                await collectionService.addRequest(selected.description!, request);
                vscode.window.showInformationMessage(`Added to collection "${selected.label}"`);
                sidebarProvider.refreshCollections();
                requestPanelManager.broadcastCollections();
            }
        }),

        vscode.commands.registerCommand('liteclient.clearHistory', async () => {
            const confirmation = await vscode.window.showWarningMessage(
                "Clear all request history?",
                { modal: true },
                "Clear"
            );

            if (confirmation === "Clear") {
                await historyService.clear();
                sidebarProvider.refreshHistory();
            }
        })
    );
}
