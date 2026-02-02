import * as vscode from 'vscode';
import { StorageService } from './storage/storageService';
import { SettingsService } from './services/settingsService';
import { CollectionService } from './services/collectionService';
import { EnvironmentService } from './services/environmentService';
import { HistoryService } from './services/historyService';
import { CookieJarService } from './services/cookieJarService';
import { SidebarProvider } from './providers/webviews/sidebarProvider';
import { RequestPanelManager } from './providers/webviews/requestPanelManager';
import { CookieManagerProvider } from './providers/webviews/cookieManagerProvider';
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

	// Initialize cookie manager provider
	const cookieManagerProvider = new CookieManagerProvider(context, cookieJarService);

	// Register URI handler for OAuth2 callbacks
	const oauth2TokenService = requestPanelManager.getOAuth2TokenService();
	context.subscriptions.push(
		vscode.window.registerUriHandler({
			handleUri(uri: vscode.Uri) {
				if (uri.path === '/oauth-callback') {
					oauth2TokenService.handleAuthCallback(uri);
				}
			}
		})
	);

	// Register all commands
	registerAllCommands(context, {
		historyService,
		collectionService,
		environmentService,
		settingsService,
		cookieJarService,
		sidebarProvider,
		requestPanelManager,
		cookieManagerProvider
	});
}

export function deactivate() { }
