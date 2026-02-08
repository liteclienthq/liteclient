import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageService } from '../storage/storageService';
import { SidebarProvider } from '../providers/webviews/sidebarProvider';

interface StorageCommandDependencies {
    storageService: StorageService;
    sidebarProvider: SidebarProvider;
    onScopeChanged: () => Promise<void>;
}

const MIGRATED_FILES = ['collections.json', 'environments.json', 'history.json'];

export function registerStorageCommands(
    context: vscode.ExtensionContext,
    deps: StorageCommandDependencies
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('liteclient.migrateToWorkspace', async () => {
            const workspacePath = deps.storageService.workspaceStoragePath;
            if (!workspacePath) {
                vscode.window.showErrorMessage('No workspace folder open. Open a folder first.');
                return;
            }

            const collectionsPath = path.join(workspacePath, 'collections.json');
            try {
                await fs.access(collectionsPath);
                const confirm = await vscode.window.showWarningMessage(
                    'Workspace already has LiteClient data. Overwrite?',
                    { modal: true },
                    'Overwrite'
                );
                if (confirm !== 'Overwrite') {
                    return;
                }
            } catch {
                // No existing data, proceed
            }

            await fs.mkdir(workspacePath, { recursive: true });

            const globalPath = deps.storageService.globalStoragePath;
            for (const file of MIGRATED_FILES) {
                const src = path.join(globalPath, file);
                const dest = path.join(workspacePath, file);
                try {
                    await fs.access(src);
                    await fs.copyFile(src, dest);
                } catch {
                    // Source file doesn't exist, skip
                }
            }

            await vscode.workspace.getConfiguration('liteclient').update(
                'storageScope',
                'workspace',
                vscode.ConfigurationTarget.Workspace
            );

            deps.storageService.setScope('workspace');
            await deps.onScopeChanged();

            vscode.window.showInformationMessage(
                'Data migrated to .liteclient/ folder. Storage scope set to workspace.'
            );
        }),

        vscode.commands.registerCommand('liteclient.switchStorageScope', async () => {
            const selection = await vscode.window.showQuickPick(['Global', 'Workspace'], {
                placeHolder: 'Select storage scope'
            });
            if (!selection) {
                return;
            }

            const scope = selection === 'Global' ? 'global' : 'workspace';

            if (scope === 'workspace' && !deps.storageService.workspaceStoragePath) {
                vscode.window.showErrorMessage('No workspace folder open. Open a folder first.');
                return;
            }

            const target = scope === 'workspace'
                ? vscode.ConfigurationTarget.Workspace
                : vscode.ConfigurationTarget.Global;

            await vscode.workspace.getConfiguration('liteclient').update(
                'storageScope',
                scope,
                target
            );

            deps.storageService.setScope(scope);
            await deps.onScopeChanged();

            vscode.window.showInformationMessage(`Storage scope set to ${selection}.`);
        })
    );
}
