import * as vscode from 'vscode';
import { StorageService } from './storage/storageService';
import { SettingsService } from './services/settingsService';
import { CollectionService } from './services/collectionService';
import { EnvironmentService } from './services/environmentService';
import { HistoryService } from './services/historyService';
import { CookieJarService } from './services/cookieJarService';
import { CurrentValuesService } from './services/currentValuesService';
import { SidebarProvider } from './providers/webviews/sidebarProvider';
import { RequestPanelManager } from './providers/webviews/requestPanelManager';
import { CookieManagerProvider } from './providers/webviews/cookieManagerProvider';
import { EnvironmentManagerProvider } from './providers/webviews/environmentManagerProvider';
import { registerAllCommands } from './commands';

export async function activate(context: vscode.ExtensionContext) {
	const storage = new StorageService(context);
	const settingsService = new SettingsService(context);
	const collectionService = new CollectionService(storage);
	const environmentService = new EnvironmentService(storage);
	const historyService = new HistoryService(storage);
	const cookieJarService = new CookieJarService(storage);
	await cookieJarService.initialize();
	const currentValuesService = new CurrentValuesService(context);

	const sidebarProvider = new SidebarProvider(
		context.extensionUri,
		historyService,
		collectionService,
		environmentService,
		settingsService,
		currentValuesService
	);

	vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider);

	const requestPanelManager = new RequestPanelManager(
		context,
		historyService,
		collectionService,
		environmentService,
		settingsService,
		cookieJarService,
		currentValuesService,
		() => sidebarProvider.refreshHistory(),
		() => sidebarProvider.refreshCollections()
	);

	const cookieManagerProvider = new CookieManagerProvider(context, cookieJarService);

	const environmentManagerProvider = new EnvironmentManagerProvider(
		context,
		environmentService,
		settingsService,
		currentValuesService,
		async () => {
			await sidebarProvider.refreshEnvironments();
			await requestPanelManager.broadcastEnvironments();
		}
	);

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

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	statusBarItem.command = 'liteclient.switchStorageScope';
	const updateStatusBar = () => {
		const label = storage.scope === 'workspace' ? 'Workspace' : 'Global';
		statusBarItem.text = `$(database) LiteClient: ${label}`;
		statusBarItem.tooltip = `LiteClient storage scope: ${label}. Click to switch.`;
	};
	updateStatusBar();
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		const pattern = new vscode.RelativePattern(
			vscode.workspace.workspaceFolders[0],
			'.liteclient/*.json'
		);
		const watcher = vscode.workspace.createFileSystemWatcher(pattern);

		const refreshAll = async () => {
			if (storage.scope === 'workspace') {
				await sidebarProvider.refreshCollections();
				await sidebarProvider.refreshEnvironments();
				await sidebarProvider.refreshHistory();
			}
		};

		watcher.onDidChange(refreshAll);
		watcher.onDidCreate(refreshAll);
		watcher.onDidDelete(refreshAll);
		context.subscriptions.push(watcher);
	}

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('liteclient.storageScope')) {
				const config = vscode.workspace.getConfiguration('liteclient');
				const newScope = config.get<'global' | 'workspace'>('storageScope') ?? 'global';
				storage.setScope(newScope);
				updateStatusBar();
				sidebarProvider.refreshCollections();
				sidebarProvider.refreshEnvironments();
				sidebarProvider.refreshHistory();
			}
		})
	);

	registerAllCommands(context, {
		storageService: storage,
		historyService,
		collectionService,
		environmentService,
		settingsService,
		cookieJarService,
		currentValuesService,
		sidebarProvider,
		requestPanelManager,
		cookieManagerProvider,
		environmentManagerProvider
	});
}

export function deactivate() { }
