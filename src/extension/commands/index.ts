import * as vscode from 'vscode';
import { HistoryService } from '../services/historyService';
import { CollectionService } from '../services/collectionService';
import { EnvironmentService } from '../services/environmentService';
import { SettingsService } from '../services/settingsService';
import { CookieJarService } from '../services/cookieJarService';
import { CurrentValuesService } from '../services/currentValuesService';
import { SidebarProvider } from '../providers/webviews/sidebarProvider';
import { RequestPanelManager } from '../providers/webviews/requestPanelManager';
import { CookieManagerProvider } from '../providers/webviews/cookieManagerProvider';
import { EnvironmentManagerProvider } from '../providers/webviews/environmentManagerProvider';

import { registerHistoryCommands } from './historyCommands';
import { registerCollectionCommands } from './collectionCommands';
import { registerEnvironmentCommands } from './environmentCommands';
import { registerRequestCommands } from './requestCommands';
import { registerCookieCommands } from './cookieCommands';
import { registerStorageCommands } from './storageCommands';
import { StorageService } from '../storage/storageService';

export interface CommandDependencies {
    storageService: StorageService;
    historyService: HistoryService;
    collectionService: CollectionService;
    environmentService: EnvironmentService;
    settingsService: SettingsService;
    cookieJarService: CookieJarService;
    currentValuesService: CurrentValuesService;
    sidebarProvider: SidebarProvider;
    requestPanelManager: RequestPanelManager;
    cookieManagerProvider: CookieManagerProvider;
    environmentManagerProvider: EnvironmentManagerProvider;
}

export function registerAllCommands(
    context: vscode.ExtensionContext,
    deps: CommandDependencies
): void {
    registerHistoryCommands(context, {
        historyService: deps.historyService,
        collectionService: deps.collectionService,
        sidebarProvider: deps.sidebarProvider,
        requestPanelManager: deps.requestPanelManager
    });

    registerCollectionCommands(context, {
        collectionService: deps.collectionService,
        sidebarProvider: deps.sidebarProvider,
        requestPanelManager: deps.requestPanelManager
    });

    registerEnvironmentCommands(context, {
        environmentService: deps.environmentService,
        settingsService: deps.settingsService,
        sidebarProvider: deps.sidebarProvider,
        requestPanelManager: deps.requestPanelManager
    });

    registerRequestCommands(context, {
        requestPanelManager: deps.requestPanelManager
    });

    registerCookieCommands(context, {
        cookieJarService: deps.cookieJarService,
        cookieManagerProvider: deps.cookieManagerProvider
    });

    registerStorageCommands(context, {
        storageService: deps.storageService,
        sidebarProvider: deps.sidebarProvider,
        onScopeChanged: async () => {
            await deps.sidebarProvider.refreshCollections();
            await deps.sidebarProvider.refreshEnvironments();
            await deps.sidebarProvider.refreshHistory();
        }
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('liteclient.openEnvironmentManager', async (args?: { environmentId?: string }) => {
            await deps.environmentManagerProvider.open(args);
        })
    );
}
