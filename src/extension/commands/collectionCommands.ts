import * as vscode from 'vscode';
import { CollectionService, RequestItem } from '../services/collectionService';
import { SidebarProvider } from '../providers/webviews/sidebarProvider';
import { RequestPanelManager } from '../providers/webviews/requestPanelManager';

export interface CollectionCommandDeps {
    collectionService: CollectionService;
    sidebarProvider: SidebarProvider;
    requestPanelManager: RequestPanelManager;
}

export function registerCollectionCommands(
    context: vscode.ExtensionContext,
    deps: CollectionCommandDeps
): void {
    const { collectionService, sidebarProvider, requestPanelManager } = deps;

    context.subscriptions.push(
        vscode.commands.registerCommand('liteclient.openCollectionRequest', async (request: RequestItem) => {
            const result = await collectionService.findRequestInCollections(request.id);
            if (result) {
                requestPanelManager.openRequest(result.request, 'collection', result.collection.id, result.collection.name);
            }
        }),

        vscode.commands.registerCommand('liteclient.newCollection', async () => {
            const name = await vscode.window.showInputBox({ prompt: 'Enter collection name' });
            if (name) {
                await collectionService.addCollection(name);
                sidebarProvider.refreshCollections();
                requestPanelManager.broadcastCollections();
            }
        }),

        vscode.commands.registerCommand('liteclient.renameCollection', async (node: any) => {
            const newName = await vscode.window.showInputBox({ prompt: "New name", value: node.collection.name });
            if (newName) {
                await collectionService.renameCollection(node.collection.id, newName);
                sidebarProvider.refreshCollections();
                requestPanelManager.broadcastCollections();
            }
        }),

        vscode.commands.registerCommand('liteclient.deleteCollection', async (node: any) => {
            const result = await vscode.window.showInformationMessage(
                `Delete collection "${node.collection.name}"?`,
                { modal: true },
                "Delete"
            );

            if (result === "Delete") {
                await collectionService.deleteCollection(node.collection.id);
                sidebarProvider.refreshCollections();
                requestPanelManager.broadcastCollections();
            }
        }),

        vscode.commands.registerCommand('liteclient.importCollection', async () => {
            const fileUris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: { 'JSON': ['json'] },
                openLabel: 'Import'
            });

            if (fileUris && fileUris.length > 0) {
                try {
                    const fileData = await vscode.workspace.fs.readFile(fileUris[0]);
                    const content = Buffer.from(fileData).toString('utf8');
                    const data = JSON.parse(content);

                    const warnings = await collectionService.importCollections(data);

                    vscode.window.showInformationMessage(`Successfully imported collection(s)`);
                    if (warnings.length > 0) {
                        vscode.window.showWarningMessage(warnings.join(' '));
                    }
                    sidebarProvider.refreshCollections();
                    requestPanelManager.broadcastCollections();
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Import failed: ${error.message}`);
                }
            }
        }),

        vscode.commands.registerCommand('liteclient.exportCollection', async (node: any) => {
            const collection = node.collection;
            if (!collection) { return; }

            const fileUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(`${collection.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.postman_collection.json`),
                filters: { 'Postman Collection': ['json'] },
                saveLabel: 'Export'
            });

            if (fileUri) {
                try {
                    const exportedContent = await collectionService.exportCollection(collection, 'postman-v2.1');
                    const content = Buffer.from(exportedContent, 'utf8');
                    await vscode.workspace.fs.writeFile(fileUri, content);
                    vscode.window.showInformationMessage(`Collection exported successfully`);
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Export failed: ${error.message}`);
                }
            }
        }),

        vscode.commands.registerCommand('liteclient.addRequestToCollection', async (node: any) => {
            const request: Omit<RequestItem, 'type'> = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                name: "New Request",
                method: "GET",
                url: "https://liteclient.com/hello",
                headers: {},
                body: { mode: 'none' }
            };
            const collectionId = node.collection?.id || node.collectionId;
            const parentId = node.parentId;

            if (collectionId) {
                await collectionService.addRequest(collectionId, request, parentId);
                sidebarProvider.refreshCollections();
                requestPanelManager.broadcastCollections();
            }
        }),

        vscode.commands.registerCommand('liteclient.deleteRequestFromCollection', async (node: any) => {
            const requestId = node.request?.id || node.requestId;
            const result = await collectionService.findRequestInCollections(requestId);
            if (result) {
                const confirmation = await vscode.window.showInformationMessage(
                    `Delete request "${result.request.name}"?`,
                    { modal: true },
                    "Delete"
                );

                if (confirmation === "Delete") {
                    await collectionService.deleteItem(result.collection.id, requestId);
                    sidebarProvider.refreshCollections();
                    requestPanelManager.broadcastCollections();
                }
            }
        }),

        vscode.commands.registerCommand('liteclient.renameCollectionRequest', async (node: any) => {
            const requestId = node.request?.id || node.requestId;
            const result = await collectionService.findRequestInCollections(requestId);

            if (result) {
                const newName = await vscode.window.showInputBox({
                    prompt: 'Enter new name',
                    value: result.request.name || result.request.url
                });
                if (newName !== undefined) {
                    await collectionService.renameItem(result.collection.id, requestId, newName);
                    sidebarProvider.refreshCollections();
                    requestPanelManager.updateTitle(requestId, newName || result.request.url);
                    requestPanelManager.broadcastCollections();
                }
            }
        }),

        vscode.commands.registerCommand('liteclient.addFolderToCollection', async (node: any) => {
            const collectionId = node.collectionId;
            const parentId = node.parentId;
            const name = await vscode.window.showInputBox({ prompt: 'Enter folder name' });
            if (name && collectionId) {
                await collectionService.addFolder(collectionId, name, parentId);
                sidebarProvider.refreshCollections();
                requestPanelManager.broadcastCollections();
            }
        }),

        vscode.commands.registerCommand('liteclient.deleteCollectionItem', async (node: any) => {
            const collectionId = node.collectionId;
            const itemId = node.itemId;
            if (collectionId && itemId) {
                const confirmation = await vscode.window.showInformationMessage(
                    "Delete item?",
                    { modal: true },
                    "Delete"
                );

                if (confirmation === "Delete") {
                    await collectionService.deleteItem(collectionId, itemId);
                    sidebarProvider.refreshCollections();
                    requestPanelManager.broadcastCollections();
                }
            }
        }),

        vscode.commands.registerCommand('liteclient.renameCollectionItem', async (node: any) => {
            const collectionId = node.collectionId;
            const itemId = node.itemId;
            const currentName = node.name;

            if (collectionId && itemId) {
                const newName = await vscode.window.showInputBox({ prompt: 'New name', value: currentName });
                if (newName) {
                    await collectionService.renameItem(collectionId, itemId, newName);
                    sidebarProvider.refreshCollections();
                    requestPanelManager.broadcastCollections();
                }
            }
        })
    );
}
