import * as vscode from 'vscode';
import { RequestPanelManager } from './providers/webviews/requestPanelManager';
import { HistoryService } from './services/historyService';
import { CollectionService, RequestItem } from './services/collectionService';
import { EnvironmentService } from './services/environmentService';
import { SidebarProvider } from './providers/webviews/sidebarProvider';
import { SettingsService } from './services/settingsService';
import { StorageService } from './storage/storageService';


export async function activate(context: vscode.ExtensionContext) {
	// Initialize services and storage
	const storage = new StorageService(context);
	const settingsService = new SettingsService(context);
	const collectionService = new CollectionService(storage);
	const environmentService = new EnvironmentService(storage);
	const historyService = new HistoryService(storage);

	// Initialize providers
	const sidebarProvider = new SidebarProvider(
		context.extensionUri,
		historyService,
		collectionService,
		environmentService,
		settingsService
	);

	// Register sidebar provider
	vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider);

	// Initialize RequestPanelManager
	const requestPanelManager = new RequestPanelManager(
		context,
		historyService,
		collectionService,
		environmentService,
		settingsService,
		() => sidebarProvider.refreshHistory(),
		() => sidebarProvider.refreshCollections()
	);


	// --- History Commands ---

	const openHistoryRequestCommand = vscode.commands.registerCommand('liteclient.openHistoryRequest', (historyItem: any) => {
		requestPanelManager.openRequest(historyItem, 'history');
	});

	const deleteHistoryItemCommand = vscode.commands.registerCommand('liteclient.deleteHistoryItem', async (item: any) => {
		const itemId = item.id || (item.item ? item.item.id : null);
		if (itemId) {
			const confirmation = await vscode.window.showInformationMessage(
				"Delete this history item?",
				{ modal: true },
				"Delete"
			);

			if (confirmation === "Delete") {
				await historyService.delete(itemId);
				sidebarProvider.refreshHistory();
			}
		}
	});

	const addHistoryToCollectionCommand = vscode.commands.registerCommand('liteclient.addHistoryToCollection', async (historyItem: any) => {
		const collections = await collectionService.load();
		if (collections.length === 0) {
			vscode.window.showErrorMessage("No collections found. Create a collection first.");
			return;
		}

		const items = collections.map(c => ({ label: c.name, description: c.id }));
		const selected = await vscode.window.showQuickPick(items, { placeHolder: "Select a collection" });

		if (selected) {
			const request: RequestItem = {
				id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
				name: historyItem.name || "New Request",
				type: 'request',
				method: historyItem.method,
				url: historyItem.url,
				headers: historyItem.headers,
				body: historyItem.body,
				auth: historyItem.auth
			};
			await collectionService.addRequest(selected.description!, request);
			vscode.window.showInformationMessage(`Added to collection "${selected.label}"`);
			sidebarProvider.refreshCollections();
			requestPanelManager.broadcastCollections(); // Ensure UI updates
		}
	});

	const clearHistoryCommand = vscode.commands.registerCommand('liteclient.clearHistory', async () => {
		const confirmation = await vscode.window.showWarningMessage(
			"Clear all request history?",
			{ modal: true },
			"Clear"
		);

		if (confirmation === "Clear") {
			await historyService.clear();
			sidebarProvider.refreshHistory();
		}
	});

	const renameHistoryRequestCommand = vscode.commands.registerCommand('liteclient.renameHistoryRequest', async (item: any) => {
		const itemId = item.id || (item.item ? item.item.id : null);
		if (itemId) {
			const history = await historyService.load();
			const historyItem = history.find(h => h.id === itemId);
			if (historyItem) {
				const newName = await vscode.window.showInputBox({
					prompt: 'Enter new name',
					value: historyItem.name || historyItem.url
				});
				if (newName !== undefined) {
					await historyService.rename(itemId, newName);
					sidebarProvider.refreshHistory();

					requestPanelManager.updateTitle(itemId, newName || historyItem.url);
				}
			}
		}
	});

	// --- Collection Commands ---

	const openCollectionRequestCommand = vscode.commands.registerCommand('liteclient.openCollectionRequest', async (request: RequestItem) => {
		const result = await collectionService.findRequestInCollections(request.id);
		if (result) {
			// Use result.request to ensure we have the full request object with URL, etc.
			// The incoming 'request' argument might only have an ID if dispatched from a simplified event.
			requestPanelManager.openRequest(result.request, 'collection', result.collection.id, result.collection.name);
		}
	});

	const newCollectionCommand = vscode.commands.registerCommand('liteclient.newCollection', async () => {
		const name = await vscode.window.showInputBox({ prompt: 'Enter collection name' });
		if (name) {
			await collectionService.addCollection(name);
			sidebarProvider.refreshCollections();

			requestPanelManager.broadcastCollections();
		}
	});

	const renameCollectionCommand = vscode.commands.registerCommand('liteclient.renameCollection', async (node: any) => {
		const newName = await vscode.window.showInputBox({ prompt: "New name", value: node.collection.name });
		if (newName) {
			await collectionService.renameCollection(node.collection.id, newName);
			sidebarProvider.refreshCollections();

			requestPanelManager.broadcastCollections();
		}
	});

	const deleteCollectionCommand = vscode.commands.registerCommand('liteclient.deleteCollection', async (node: any) => {
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
	});

	const addRequestToCollectionCommand = vscode.commands.registerCommand('liteclient.addRequestToCollection', async (node: any) => {
		const request: Omit<RequestItem, 'type'> = {
			id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
			name: "New Request", method: "GET", url: "https://liteclient.com/hello", headers: {}, body: null
		};
		// Handle both node structure and direct generic object
		const collectionId = node.collection?.id || node.collectionId;
		const parentId = node.parentId; // Optional parentId for recursion

		if (collectionId) {
			await collectionService.addRequest(collectionId, request, parentId);
			sidebarProvider.refreshCollections();
			requestPanelManager.broadcastCollections();
		}
	});

	const deleteRequestFromCollectionCommand = vscode.commands.registerCommand('liteclient.deleteRequestFromCollection', async (node: any) => {
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
	});

	const renameCollectionRequestCommand = vscode.commands.registerCommand('liteclient.renameCollectionRequest', async (node: any) => {
		const requestId = node.request?.id || node.requestId;
		const result = await collectionService.findRequestInCollections(requestId);

		if (result) {
			const newName = await vscode.window.showInputBox({ prompt: 'Enter new name', value: result.request.name || result.request.url });
			if (newName !== undefined) {
				await collectionService.renameItem(result.collection.id, requestId, newName);
				sidebarProvider.refreshCollections();

				requestPanelManager.updateTitle(requestId, newName || result.request.url);
				requestPanelManager.broadcastCollections();
			}
		}
	});

	const addFolderToCollectionCommand = vscode.commands.registerCommand('liteclient.addFolderToCollection', async (node: any) => {
		const collectionId = node.collectionId;
		const parentId = node.parentId;
		const name = await vscode.window.showInputBox({ prompt: 'Enter folder name' });
		if (name && collectionId) {
			await collectionService.addFolder(collectionId, name, parentId);
			sidebarProvider.refreshCollections();
			requestPanelManager.broadcastCollections();
		}
	});

	const deleteItemCommand = vscode.commands.registerCommand('liteclient.deleteCollectionItem', async (node: any) => {
		// Generic delete for folder or request
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
	});

	const renameItemCommand = vscode.commands.registerCommand('liteclient.renameCollectionItem', async (node: any) => {
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
	});


	// --- Environment Commands ---

	const newEnvironmentCommand = vscode.commands.registerCommand('liteclient.newEnvironment', async () => {
		const name = await vscode.window.showInputBox({ prompt: 'Enter environment name' });
		if (name) {
			await environmentService.addEnvironment(name);
			sidebarProvider.refreshEnvironments();

			requestPanelManager.broadcastEnvironments();
		}
	});

	const renameEnvironmentCommand = vscode.commands.registerCommand('liteclient.renameEnvironment', async (node: any) => {
		const newName = await vscode.window.showInputBox({ prompt: "New name", value: node.env.name });
		if (newName) {
			await environmentService.updateEnvironment({ ...node.env, name: newName });
			sidebarProvider.refreshEnvironments();

			requestPanelManager.broadcastEnvironments();
		}
	});

	const deleteEnvironmentCommand = vscode.commands.registerCommand('liteclient.deleteEnvironment', async (node: any) => {
		const confirmation = await vscode.window.showInformationMessage(
			`Delete environment "${node.env.name}"?`,
			{ modal: true },
			"Delete"
		);

		if (confirmation === "Delete") {
			if (await settingsService.getSelectedEnvironmentId() === node.env.id) {
				await settingsService.setSelectedEnvironmentId(undefined);
			}
			await environmentService.deleteEnvironment(node.env.id);
			sidebarProvider.refreshEnvironments();
			requestPanelManager.broadcastEnvironments();
		}
	});

	const setSelectedEnvironmentCommand = vscode.commands.registerCommand('liteclient.setSelectedEnvironment', async (id: string) => {
		await settingsService.setSelectedEnvironmentId(id);
		sidebarProvider.refreshEnvironments();

		requestPanelManager.broadcastEnvironments();
	});

	const addVariableCommand = vscode.commands.registerCommand('liteclient.addVariableToEnvironment', async (node: any) => {
		const key = await vscode.window.showInputBox({ prompt: 'Variable name' });
		if (key) {
			const value = await vscode.window.showInputBox({ prompt: 'Variable value' });
			if (value !== undefined) {
				node.env.variables[key] = value;
				await environmentService.updateEnvironment(node.env);
				sidebarProvider.refreshEnvironments();

				requestPanelManager.broadcastEnvironments();
			}
		}
	});

	const editVariableCommand = vscode.commands.registerCommand('liteclient.editVariable', async (node: any) => {
		// Check if node contains the new format (from inline editing)
		const variableName = node.variableName || node.varName;
		const variableValue = node.variableValue || node.newValue;
		const environmentId = node.environmentId || node.envId;

		const newValue = await vscode.window.showInputBox({
			prompt: `Value for ${variableName}`,
			value: variableValue
		});
		if (newValue !== undefined) {
			const envs = await environmentService.load();
			const env = envs.find(e => e.id === environmentId);
			if (env) {
				env.variables[variableName] = newValue;
				await environmentService.updateEnvironment(env);
				sidebarProvider.refreshEnvironments();

				requestPanelManager.broadcastEnvironments();
			}
		}
	});

	const deleteVariableCommand = vscode.commands.registerCommand('liteclient.deleteVariable', async (node: any) => {
		const confirmation = await vscode.window.showInformationMessage(
			`Delete variable "${node.variableName}"?`,
			{ modal: true },
			"Delete"
		);

		if (confirmation === "Delete") {
			const envs = await environmentService.load();
			const env = envs.find(e => e.id === node.environmentId);
			if (env) {
				delete env.variables[node.variableName];
				await environmentService.updateEnvironment(env);
				sidebarProvider.refreshEnvironments();
				requestPanelManager.broadcastEnvironments();
			}
		}
	});

	// --- General Commands ---

	const newRequestCommand = vscode.commands.registerCommand('liteclient.newRequest', () => {
		requestPanelManager.openRequest({ method: "GET", url: "https://liteclient.com/hello", headers: {}, body: "" }, 'new');
	});

	context.subscriptions.push(
		openHistoryRequestCommand, deleteHistoryItemCommand, clearHistoryCommand, renameHistoryRequestCommand,
		openCollectionRequestCommand, newCollectionCommand, renameCollectionCommand, deleteCollectionCommand,
		addRequestToCollectionCommand, deleteRequestFromCollectionCommand, renameCollectionRequestCommand,
		addFolderToCollectionCommand, deleteItemCommand, renameItemCommand,
		newEnvironmentCommand, renameEnvironmentCommand, deleteEnvironmentCommand, setSelectedEnvironmentCommand,
		addVariableCommand, editVariableCommand, deleteVariableCommand,
		newRequestCommand,
		addHistoryToCollectionCommand
	);
}

export function deactivate() { }