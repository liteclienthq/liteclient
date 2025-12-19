import * as vscode from 'vscode';
import { RequestWebView } from './webviews/requestWebView';
import { HttpRequestService, RequestPayload } from './services/httpRequestService';
import { StorageService } from './storage/storageService';
import { HistoryService } from './services/historyService';
import { CollectionService, RequestItem } from './services/collectionService';
import { EnvironmentService, Environment } from './services/environmentService';
import { RequestHistoryProvider } from './treeviews/requestHistoryProvider';
import { CollectionsProvider } from './treeviews/collectionsProvider';
import { EnvironmentsProvider } from './treeviews/environmentsProvider';
import { SettingsService } from './services/settingsService';

// Helper function to create a shortened version of any string for tab titles
function getShortenedTitle(title: string): string {
	// Return the first 20 characters with '...' if longer
	return title.length > 20 ? title.substring(0, 17) + '...' : title;
}

export function activate(context: vscode.ExtensionContext) {
	// Initialize services and storage
	const storage = new StorageService(context);
	const settingsService = new SettingsService(context);

	const collectionService = new CollectionService(storage);
	const environmentService = new EnvironmentService(storage);

	const collectionsProvider = new CollectionsProvider(collectionService);
	const environmentsProvider = new EnvironmentsProvider(environmentService);

	// Create and register history provider
	const historyService = new HistoryService(storage);
	const historyProvider = new RequestHistoryProvider(historyService);
	vscode.window.registerTreeDataProvider('requests', historyProvider);

	// Panel reuse logic - unified for both history and collection requests
	const requestPanels = new Map<string, vscode.WebviewPanel>();

	// Helper function to set up message handling for a request panel
	// Broadcast helpers - defined inside activate to access services and panels
	const broadcastEnvironmentList = async () => {
		const environments = await environmentService.load();
		const selectedEnvironmentId = await settingsService.getSelectedEnvironmentId();

		for (const panel of requestPanels.values()) {
			panel.webview.postMessage({
				type: 'environments-list',
				environments,
				selectedEnvironmentId
			});
		}
	};

	const broadcastCollectionsList = async () => {
		const collections = await collectionService.load();
		for (const panel of requestPanels.values()) {
			panel.webview.postMessage({
				type: 'collections-list',
				collections
			});
		}
	};

	function setupRequestMessageHandler(panel: vscode.WebviewPanel) {

		panel.webview.onDidReceiveMessage(async (message) => {
			if (message.type === 'send-request') {
				// Get the selected environment ID and its variables for substitution
				let environmentVariables: Record<string, string> = {};
				const selectedEnvironmentId = await settingsService.getSelectedEnvironmentId();

				if (selectedEnvironmentId) {
					const selectedEnvironment = await environmentService.getEnvironmentById(selectedEnvironmentId);
					if (selectedEnvironment) {
						environmentVariables = selectedEnvironment.variables;
					}
				}

				const response = await HttpRequestService.sendRequest(message, environmentVariables);

				await historyService.add({
					id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
					timestamp: Date.now(),
					name: message.name, // Store the current request name from the UI
					method: message.method,
					url: message.url, // Store original URL (not substituted)
					headers: message.headers || {}, // Store original headers (not substituted)
					body: message.body || null, // Store original body (not substituted)
					status: response.status
				});

				// Refresh the history view
				historyProvider.refresh();

				panel.webview.postMessage({
					type: 'response',
					body: response.body,
					status: response.status,
					isError: response.isError
				});
			}
			// Handle request for environments list
			else if (message.type === 'get-environments') {
				const environments = await environmentService.load();
				const selectedEnvironmentId = await settingsService.getSelectedEnvironmentId();
				panel.webview.postMessage({
					type: 'environments-list',
					environments,
					selectedEnvironmentId
				});
			}
			// Handle environment selection
			else if (message.type === 'set-environment') {
				const environmentId = message.environmentId;
				await settingsService.setSelectedEnvironmentId(environmentId);

				// Show feedback to user
				if (environmentId) {
					const selectedEnv = await environmentService.getEnvironmentById(environmentId);
					if (selectedEnv) {
						vscode.window.showInformationMessage(`Environment set to: ${selectedEnv.name}`);
					}
				} else {
					vscode.window.showInformationMessage('Environment cleared');
				}
			}
			// Handle save request
			else if (message.type === 'save-request') {
				// Check if this request has a collectionId (meaning it's an existing collection request)
				if (message.collectionId) {
					// Update existing collection request
					// Find the existing request to understand if its name was originally custom or URL-derived
					const collections = await collectionService.load();
					let existingRequest = null;
					for (const collection of collections) {
						if (collection.id === message.collectionId) {
							existingRequest = collection.requests.find(r => r.id === message.id);
							if (existingRequest) {
								break;
							}
						}
					}

					// Determine the name based on whether the original name was custom or URL-derived
					let finalName = message.name || 'Unnamed Request';

					// If the original name was URL-derived (same as URL) and extension sent the new URL as name,
					// use the message.name (which contains the new URL). Otherwise, preserve the custom name.
					if (existingRequest) {
						const wasUrlDerived = existingRequest.name === existingRequest.url;
						if (wasUrlDerived) {
							// Use the new URL (message.name) since the original was URL-derived
							finalName = message.name || message.payload.url || 'Unnamed Request';
						} else {
							// Preserve the custom name
							finalName = existingRequest.name;
						}
					} else {
						// If no existing request found, use message name or fallback
						finalName = message.name || message.payload.url || 'Unnamed Request';
					}

					const updatedRequest: RequestItem = {
						...message.payload,
						auth: message.payload.auth,
						id: message.id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
						name: finalName,
					};

					await collectionService.updateRequest(message.collectionId, updatedRequest);
					collectionsProvider.refresh();
					vscode.window.showInformationMessage('Request updated in collection!');

					// Update the webview header to reflect the new name immediately
					panel.webview.postMessage({
						type: "load-request",
						payload: { ...updatedRequest, collectionId: message.collectionId, source: 'collection' }
					});
				} else {
					// This is a new request - show collection picker
					const collections = await collectionService.load();
					if (collections.length === 0) {
						const selection = await vscode.window.showInformationMessage('No collections available. Create a collection first?', 'Create Collection');
						if (selection === 'Create Collection') {
							vscode.commands.executeCommand('liteclient.newCollection');
						}
						return;
					}

					const collectionItems = collections.map(collection => ({
						label: collection.name,
						description: `${collection.requests.length} requests`,
						detail: collection.id,
						collection: collection
					}));

					const selectedCollection = await vscode.window.showQuickPick(collectionItems, {
						placeHolder: 'Select a collection to save this request'
					});

					if (selectedCollection) {
						// Check if a request with the same method and URL already exists in this collection
						// to prevent duplicates
						const existingRequest = selectedCollection.collection.requests.find(
							r => r.method === message.payload.method && r.url === message.payload.url
						);

						if (existingRequest) {
							// Update the existing request instead of creating a new one
							const updatedRequest: RequestItem = {
								...message.payload,
								id: existingRequest.id, // Keep the existing ID
								name: message.name || existingRequest.name || message.payload.url || 'Unnamed Request',
							};

							await collectionService.updateRequest(selectedCollection.collection.id, updatedRequest);
							collectionsProvider.refresh();
							vscode.window.showInformationMessage(`Request updated in collection "${selectedCollection.collection.name}"`);
						} else {
							// Create a new request since no duplicate exists
							const newRequest: RequestItem = {
								...message.payload,
								id: message.id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
								name: message.name || message.payload.url || 'Unnamed Request',
							};

							await collectionService.addRequest(selectedCollection.collection.id, newRequest);
							collectionsProvider.refresh();
							vscode.window.showInformationMessage(`Request saved to collection "${selectedCollection.collection.name}"`);
						}
					}
				}
			}
		});
	}

	// Open History Request Command
	const openHistoryRequestCommand = vscode.commands.registerCommand('liteclient.openHistoryRequest', (historyItem: any) => {
		// Create request identity key for history requests: method-URL
		const requestIdentity = `history-${historyItem.id || `${historyItem.method.toUpperCase()}-${historyItem.url}`}`;

		const existingPanel = requestPanels.get(requestIdentity);

		if (existingPanel) {
			// Reuse the existing panel and bring it to the front
			existingPanel.reveal();

			// Update the panel title based on the history item name (if it exists)
			const panelTitle = getShortenedTitle(historyItem.name ? historyItem.name : historyItem.url);
			existingPanel.title = panelTitle;

			// Resend the data to the webview so it populates the fields
			existingPanel.webview.postMessage({
				type: "load-request",
				payload: { ...historyItem, source: 'history' }
			});
		} else {
			// Create a new panel
			const panelTitle = getShortenedTitle(historyItem.name ? historyItem.name : historyItem.url);
			const panel = vscode.window.createWebviewPanel(
				"requestWebview",
				panelTitle,
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			);

			// Set up message handling for this panel
			setupRequestMessageHandler(panel);

			panel.webview.html = RequestWebView.getHtmlContent(context);

			// Send the data to the webview
			panel.webview.postMessage({
				type: "load-request",
				payload: { ...historyItem, source: 'history' }
			});

			// Store the panel in the unified map
			requestPanels.set(requestIdentity, panel);

			// Clean up the map when the panel is disposed
			panel.onDidDispose(() => {
				requestPanels.delete(requestIdentity);
			});
		}
	});

	// Delete History Item Command
	const deleteHistoryItemCommand = vscode.commands.registerCommand('liteclient.deleteHistoryItem', async (item: any) => {
		const itemId = item.id || (item.item ? item.item.id : null);
		if (itemId) {
			await historyService.delete(itemId);
			historyProvider.refresh();
		}
	});

	// Clear History Command
	const clearHistoryCommand = vscode.commands.registerCommand('liteclient.clearHistory', async () => {
		const confirm = await vscode.window.showWarningMessage(
			"Clear all request history?",
			"Yes",
			"Cancel"
		);
		if (confirm === "Yes") {
			await historyService.clear();
			historyProvider.refresh();
		}
	});

	// Rename History Request Command
	const renameHistoryRequestCommand = vscode.commands.registerCommand('liteclient.renameHistoryRequest', async (item: any) => {
		const itemId = item.id || (item.item ? item.item.id : null);
		if (itemId) {
			// Find the history item to get current name
			const history = await historyService.load();
			const historyItem = history.find(h => h.id === itemId);
			if (historyItem) {
				const currentName = historyItem.name || historyItem.url;
				const newName = await vscode.window.showInputBox({
					prompt: 'Enter new name for the request',
					value: currentName,
					placeHolder: 'Request name'
				});

				if (newName !== undefined) { // Allow empty string to clear the name
					await historyService.rename(itemId, newName);
					historyProvider.refresh();

					// Update the title of any open panel for this request
					// The panel identity is based on method and URL, so update the panel that matches
					const requestIdentity = `history-${historyItem.id || `${historyItem.method.toUpperCase()}-${historyItem.url}`}`;
					const panel = requestPanels.get(requestIdentity);
					if (panel) {
						const panelTitle = getShortenedTitle(newName ? newName : historyItem.url);
						panel.title = panelTitle;
					}
				}
			}
		}
	});

	// Rename Collection Request Command
	const renameCollectionRequestCommand = vscode.commands.registerCommand('liteclient.renameCollectionRequest', async (requestNode: any) => {
		const request = requestNode.request;
		if (request && request.id) {
			const currentName = request.name || request.url;
			const newName = await vscode.window.showInputBox({
				prompt: 'Enter new name for the request',
				value: currentName,
				placeHolder: 'Request name'
			});

			if (newName !== undefined) { // Allow empty string to clear the name
				// Find which collection contains this request
				const collections = await collectionService.load();
				for (const collection of collections) {
					const requestIndex = collection.requests.findIndex(r => r.id === request.id);
					if (requestIndex !== -1) {
						// Update the request name in the collection
						collection.requests[requestIndex] = {
							...collection.requests[requestIndex],
							name: newName
						};
						await collectionService.updateRequest(collection.id, collection.requests[requestIndex]);
						collectionsProvider.refresh();
						break;
					}
				}

				// Update the title of any open panel for this request
				// Since we don't have collectionId here, we need to find it
				for (const collection of collections) {
					if (collection.requests.some(r => r.id === request.id)) {
						const requestIdentity = `collection-${collection.id}-${request.id}`;
						const panel = requestPanels.get(requestIdentity);
						if (panel) {
							const panelTitle = getShortenedTitle(newName ? newName : request.url);
							panel.title = panelTitle;
						}
						break;
					}
				}
			}
		}
	});

	vscode.window.registerTreeDataProvider('collections', collectionsProvider);
	vscode.window.registerTreeDataProvider('environments', environmentsProvider);

	const newRequest = vscode.commands.registerCommand('liteclient.newRequest', async () => {
		const panel = vscode.window.createWebviewPanel(
			"requestWebview",
			"New Request",
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		// Register this panel so it receives broadcasts
		const panelId = `new-request-${Date.now()}`;
		requestPanels.set(panelId, panel);

		// Set up message handling for this panel
		setupRequestMessageHandler(panel);

		panel.webview.html = RequestWebView.getHtmlContent(context);

		// Send default data for new request
		panel.webview.postMessage({
			type: "load-request",
			payload: {
				method: "GET",
				url: "https://liteclient.com/hello",
				headers: {},
				body: ""
			}
		});

		panel.onDidDispose(() => {
			requestPanels.delete(panelId);
		}, null, context.subscriptions);
	});

	const newCollection = vscode.commands.registerCommand('liteclient.newCollection', async () => {
		const collectionName = await vscode.window.showInputBox({
			prompt: 'Enter collection name',
			placeHolder: 'My API Collection'
		});

		if (collectionName) {
			await collectionService.addCollection(collectionName);
			collectionsProvider.refresh();
			await broadcastCollectionsList(); // Notify open panels
			vscode.window.showInformationMessage(`Collection "${collectionName}" created!`);
		}
	});

	const newEnvironment = vscode.commands.registerCommand('liteclient.newEnvironment', async () => {
		const environmentName = await vscode.window.showInputBox({
			prompt: 'Enter environment name',
			placeHolder: 'Development'
		});

		if (environmentName) {
			await environmentService.addEnvironment(environmentName);
			environmentsProvider.refresh();
			await broadcastEnvironmentList(); // Notify open panels
			vscode.window.showInformationMessage(`Environment "${environmentName}" created!`);
		}
	});

	// Collections Commands
	const addCollectionCommand = vscode.commands.registerCommand('liteclient.addCollection', async () => {
		const name = await vscode.window.showInputBox({ prompt: "Collection name" });
		if (name) {
			await collectionService.addCollection(name);
			collectionsProvider.refresh();
			await broadcastCollectionsList();
		}
	});

	const renameCollectionCommand = vscode.commands.registerCommand('liteclient.renameCollection', async (collectionNode: any) => {
		const collection = collectionNode.collection;
		const newName = await vscode.window.showInputBox({
			prompt: "New collection name",
			value: collection.name
		});
		if (newName) {
			await collectionService.renameCollection(collection.id, newName);
			collectionsProvider.refresh();
			await broadcastCollectionsList();
		}
	});

	const deleteCollectionCommand = vscode.commands.registerCommand('liteclient.deleteCollection', async (collectionNode: any) => {
		const collection = collectionNode.collection;
		const result = await vscode.window.showInformationMessage(
			`Are you sure you want to delete collection "${collection.name}"?`,
			{ modal: true },
			"Yes", "No"
		);
		if (result === "Yes") {
			await collectionService.deleteCollection(collection.id);
			collectionsProvider.refresh();
			await broadcastCollectionsList();
			vscode.window.showInformationMessage(`Collection "${collection.name}" deleted`);
		}
	});

	const addRequestToCollectionCommand = vscode.commands.registerCommand('liteclient.addRequestToCollection', async (collectionNode: any) => {
		// For now, just create a placeholder request
		const collection = collectionNode.collection;
		const request: RequestItem = {
			id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
			name: "New Request",
			method: "GET",
			url: "https://api.example.com",
			headers: {},
			body: null
		};
		await collectionService.addRequest(collection.id, request);
		collectionsProvider.refresh();
	});

	const deleteRequestFromCollectionCommand = vscode.commands.registerCommand('liteclient.deleteRequestFromCollection', async (requestNode: any) => {
		const request = requestNode.request;
		const parentCollections = await collectionService.load();
		// Find which collection contains this request
		for (const collection of parentCollections) {
			if (collection.requests.some(r => r.id === request.id)) {
				const result = await vscode.window.showInformationMessage(
					`Are you sure you want to delete request "${request.name}"?`,
					{ modal: true },
					"Yes", "No"
				);
				if (result === "Yes") {
					await collectionService.deleteRequest(collection.id, request.id);
					collectionsProvider.refresh();
				}
				break;
			}
		}
	});

	// Environments Commands
	const addEnvironmentCommand = vscode.commands.registerCommand('liteclient.addEnvironment', async () => {
		const name = await vscode.window.showInputBox({ prompt: "Environment name" });
		if (name) {
			await environmentService.addEnvironment(name);
			environmentsProvider.refresh();
			vscode.window.showInformationMessage(`Environment "${name}" created!`);
		}
	});

	const renameEnvironmentCommand = vscode.commands.registerCommand('liteclient.renameEnvironment', async (environmentNode: any) => {
		const env = environmentNode.env;
		const newName = await vscode.window.showInputBox({
			prompt: "New environment name",
			value: env.name
		});
		if (newName) {
			const updatedEnv = { ...env, name: newName };
			await environmentService.updateEnvironment(updatedEnv);
			environmentsProvider.refresh();
			await broadcastEnvironmentList();
		}
	});

	const deleteEnvironmentCommand = vscode.commands.registerCommand('liteclient.deleteEnvironment', async (environmentNode: any) => {
		const env = environmentNode.env;
		const result = await vscode.window.showInformationMessage(
			`Are you sure you want to delete environment "${env.name}"?`,
			{ modal: true },
			"Yes", "No"
		);
		if (result === "Yes") {
			// Check if this environment is currently selected
			const selectedEnvironmentId = await settingsService.getSelectedEnvironmentId();
			if (selectedEnvironmentId === env.id) {
				// Reset selected environment to undefined if we're deleting the currently selected one
				await settingsService.setSelectedEnvironmentId(undefined);
			}

			await environmentService.deleteEnvironment(env.id);
			environmentsProvider.refresh();
		}
	});

	// Set Selected Environment Command
	const setSelectedEnvironmentCommand = vscode.commands.registerCommand('liteclient.setSelectedEnvironment', async (environmentId: string) => {
		await settingsService.setSelectedEnvironmentId(environmentId);
	});

	// Add Variable to Environment Command
	const addVariableToEnvironmentCommand = vscode.commands.registerCommand('liteclient.addVariableToEnvironment', async (environmentNode: any) => {
		const environment = environmentNode.env;
		if (!environment) {
			return;
		}

		// Ask for variable name
		const variableName = await vscode.window.showInputBox({
			prompt: 'Enter variable name',
			placeHolder: 'e.g., host, token'
		});

		if (!variableName) {
			return;
		}

		// Ask for variable value
		const variableValue = await vscode.window.showInputBox({
			prompt: 'Enter variable value',
			placeHolder: 'e.g., localhost:3000, abc123'
		});

		if (variableValue === undefined) {
			return; // Allow empty values
		}

		// Add variable to environment
		const updatedEnvironment = {
			...environment,
			variables: {
				...environment.variables,
				[variableName]: variableValue
			}
		};

		await environmentService.updateEnvironment(updatedEnvironment);
		environmentsProvider.refresh();
		vscode.window.showInformationMessage(`Variable "${variableName}" added to environment "${environment.name}"`);
	});

	// Edit Variable Command
	const editVariableCommand = vscode.commands.registerCommand('liteclient.editVariable', async (variableNode: any) => {
		if (!variableNode || !variableNode.environmentId) {
			return;
		}

		// Get all environments to find the one containing this variable
		const environments = await environmentService.load();
		const environment = environments.find(env => env.id === variableNode.environmentId);
		if (!environment) {
			return;
		}

		// Ask for new variable value (prefill with existing value)
		const newVariableValue = await vscode.window.showInputBox({
			prompt: `Edit value for "${variableNode.variableName}"`,
			value: variableNode.variableValue,
			placeHolder: 'Enter new value'
		});

		if (newVariableValue === undefined) {
			return; // User cancelled
		}

		// Update variable in environment
		const updatedEnvironment = {
			...environment,
			variables: {
				...environment.variables,
				[variableNode.variableName]: newVariableValue
			}
		};

		await environmentService.updateEnvironment(updatedEnvironment);
		environmentsProvider.refresh();
		vscode.window.showInformationMessage(`Variable "${variableNode.variableName}" updated`);
	});

	// Delete Variable Command
	const deleteVariableCommand = vscode.commands.registerCommand('liteclient.deleteVariable', async (variableNode: any) => {
		if (!variableNode || !variableNode.environmentId) {
			return;
		}

		// Show confirmation dialog
		const result = await vscode.window.showInformationMessage(
			`Delete variable "${variableNode.variableName}" from environment?`,
			{ modal: true },
			"Yes", "No"
		);

		if (result !== "Yes") {
			return;
		}

		// Get all environments to find the one containing this variable
		const environments = await environmentService.load();
		const environment = environments.find(env => env.id === variableNode.environmentId);
		if (!environment) {
			return;
		}

		// Remove variable from environment
		const updatedVariables = { ...environment.variables };
		delete updatedVariables[variableNode.variableName];

		const updatedEnvironment = {
			...environment,
			variables: updatedVariables
		};

		await environmentService.updateEnvironment(updatedEnvironment);
		environmentsProvider.refresh();
		vscode.window.showInformationMessage(`Variable "${variableNode.variableName}" deleted`);
	});

	// Save Collection Request Command
	const saveCollectionRequestCommand = vscode.commands.registerCommand('liteclient.saveRequestToCollection', async (request: RequestItem, collectionId: string) => {
		// This command will be called from the webview to save a request back to collection
		// Implementation will be completed when we add the save button to the webview
		// For now, this is just a placeholder
	});

	// Open Collection Request Command
	const openCollectionRequestCommand = vscode.commands.registerCommand('liteclient.openCollectionRequest', async (request: RequestItem) => {
		// Find which collection contains this request and get collection details
		const collections = await collectionService.load();
		let collectionId = '';
		let collectionName = '';
		for (const collection of collections) {
			if (collection.requests.some(r => r.id === request.id)) {
				collectionId = collection.id;
				collectionName = collection.name;
				break;
			}
		}

		// Create request identity key for collection requests: collectionId-requestId
		const requestIdentity = `collection-${collectionId}-${request.id}`;

		const existingPanel = requestPanels.get(requestIdentity);

		if (existingPanel) {
			// Reuse the existing panel and bring it to the front
			existingPanel.reveal();

			// Update the panel title based on the request name
			const panelTitle = getShortenedTitle(request.name ? request.name : request.url);
			existingPanel.title = panelTitle;

			// Resend the data to the webview so it populates the fields
			existingPanel.webview.postMessage({
				type: "load-request",
				payload: { ...request, collectionId, collectionPath: [collectionName], source: 'collection' }
			});
		} else {
			// Create a new panel
			const panelTitle = getShortenedTitle(request.name ? request.name : request.url);
			const panel = vscode.window.createWebviewPanel(
				"requestWebview",
				panelTitle,
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			);

			// Set up message handling for collection requests with both send and save functionality
			panel.webview.onDidReceiveMessage(async (message) => {
				// Handle save request
				if (message.type === 'save-request') {
					// Determine the name based on whether the original name was custom or URL-derived
					const wasUrlDerived = request.name === request.url;
					let finalName;

					if (wasUrlDerived) {
						// If the original name was URL-derived, update it to match the new URL
						finalName = message.name || message.payload.url || 'Unnamed Request';
					} else {
						// If the original name was custom, preserve it
						finalName = request.name;
					}

					const updatedRequest: RequestItem = {
						...request,
						name: finalName,
						method: message.payload.method,
						url: message.payload.url,
						headers: message.payload.headers,
						body: message.payload.body,
						auth: message.payload.auth
					};

					await collectionService.updateRequest(collectionId, updatedRequest);
					collectionsProvider.refresh();
					vscode.window.showInformationMessage('Request saved to collection!');

					// Update the webview header to reflect the new name immediately
					// Find the collection name for the path display
					const collections = await collectionService.load();
					let collectionName = '';
					for (const collection of collections) {
						if (collection.id === collectionId) {
							collectionName = collection.name;
							break;
						}
					}

					panel.webview.postMessage({
						type: "load-request",
						payload: { ...updatedRequest, collectionId, collectionPath: [collectionName], source: 'collection' }
					});
				}
				// Handle send request (same as history requests)
				else if (message.type === 'send-request') {
					// Get the selected environment ID and its variables for substitution
					let environmentVariables: Record<string, string> = {};
					const selectedEnvironmentId = await settingsService.getSelectedEnvironmentId();

					if (selectedEnvironmentId) {
						const selectedEnvironment = await environmentService.getEnvironmentById(selectedEnvironmentId);
						if (selectedEnvironment) {
							environmentVariables = selectedEnvironment.variables;
						}
					}

					const response = await HttpRequestService.sendRequest(message, environmentVariables);

					await historyService.add({
						id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
						timestamp: Date.now(),
						name: message.name, // Store the current request name from the UI
						method: message.method,
						url: message.url, // Store original URL (not substituted)
						headers: message.headers || {}, // Store original headers (not substituted)
						body: message.body || null, // Store original body (not substituted)
						auth: message.auth,
						status: response.status
					});

					// Refresh the history view
					historyProvider.refresh();

					panel.webview.postMessage({
						type: 'response',
						body: response.body,
						status: response.status,
						isError: response.isError
					});
				}
				// Handle request for environments list
				else if (message.type === 'get-environments') {
					const environments = await environmentService.load();
					const selectedEnvironmentId = await settingsService.getSelectedEnvironmentId();
					panel.webview.postMessage({
						type: 'environments-list',
						environments,
						selectedEnvironmentId
					});
				}
				// Handle environment selection
				else if (message.type === 'set-environment') {
					const environmentId = message.environmentId;
					await settingsService.setSelectedEnvironmentId(environmentId);

					// Show feedback to user
					if (environmentId) {
						const selectedEnv = await environmentService.getEnvironmentById(environmentId);
						if (selectedEnv) {
							vscode.window.showInformationMessage(`Environment set to: ${selectedEnv.name}`);
						}
					} else {
						vscode.window.showInformationMessage('Environment cleared');
					}
				}
			});

			panel.webview.html = RequestWebView.getHtmlContent(context);

			// Send the data to the webview
			panel.webview.postMessage({
				type: "load-request",
				payload: { ...request, collectionId, collectionPath: [collectionName], source: 'collection' }
			});

			// Store the panel in the unified map
			requestPanels.set(requestIdentity, panel);

			// Clean up the map when the panel is disposed
			panel.onDidDispose(() => {
				requestPanels.delete(requestIdentity);
			});
		}
	});

	context.subscriptions.push(
		newRequest,
		newCollection,
		newEnvironment,
		addCollectionCommand,
		renameCollectionCommand,
		deleteCollectionCommand,
		addRequestToCollectionCommand,
		deleteRequestFromCollectionCommand,
		addEnvironmentCommand,
		renameEnvironmentCommand,
		deleteEnvironmentCommand,
		setSelectedEnvironmentCommand,
		addVariableToEnvironmentCommand,
		editVariableCommand,
		deleteVariableCommand,
		openCollectionRequestCommand,
		saveCollectionRequestCommand,
		openHistoryRequestCommand,
		deleteHistoryItemCommand,
		clearHistoryCommand,
		renameHistoryRequestCommand,
		renameCollectionRequestCommand
	);
}

export function deactivate() { }