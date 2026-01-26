import * as vscode from 'vscode';
import { StorageService } from './storage/storageService';
import { SettingsService } from './services/settingsService';
import { CollectionService } from './services/collectionService';
import { EnvironmentService } from './services/environmentService';
import { HistoryService } from './services/historyService';
import { CookieJarService } from './services/cookieJarService';
import { SidebarProvider } from './providers/webviews/sidebarProvider';
import { RequestPanelManager } from './providers/webviews/requestPanelManager';
import { registerAllCommands } from './commands';

export async function activate(context: vscode.ExtensionContext) {
	// Initialize storage and services
	const storage = new StorageService(context);
	const settingsService = new SettingsService(context);
	const collectionService = new CollectionService(storage);
	const environmentService = new EnvironmentService(storage);
	const historyService = new HistoryService(storage);
	const cookieJarService = new CookieJarService(storage);
	await cookieJarService.initialize();

	// Initialize sidebar provider
	const sidebarProvider = new SidebarProvider(
		context.extensionUri,
		historyService,
		collectionService,
		environmentService,
		settingsService
	);

	vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider);

	// Initialize request panel manager
	const requestPanelManager = new RequestPanelManager(
		context,
		historyService,
		collectionService,
		environmentService,
		settingsService,
		cookieJarService,
		() => sidebarProvider.refreshHistory(),
		() => sidebarProvider.refreshCollections()
	);

	// Register all commands
	registerAllCommands(context, {
		historyService,
		collectionService,
		environmentService,
		settingsService,
		cookieJarService,
		sidebarProvider,
		requestPanelManager
	});
}

export function deactivate() { }
