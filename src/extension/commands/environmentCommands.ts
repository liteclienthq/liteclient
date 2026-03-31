import * as vscode from 'vscode';
import { EnvironmentService } from '../services/environmentService';
import { SettingsService } from '../services/settingsService';
import { SidebarProvider } from '../providers/webviews/sidebarProvider';
import { RequestPanelManager } from '../providers/webviews/requestPanelManager';

export interface EnvironmentCommandDeps {
    environmentService: EnvironmentService;
    settingsService: SettingsService;
    sidebarProvider: SidebarProvider;
    requestPanelManager: RequestPanelManager;
}

export function registerEnvironmentCommands(
    context: vscode.ExtensionContext,
    deps: EnvironmentCommandDeps
): void {
    const { environmentService, settingsService, sidebarProvider, requestPanelManager } = deps;

    context.subscriptions.push(
        vscode.commands.registerCommand('liteclient.newEnvironment', async () => {
            const name = await vscode.window.showInputBox({ prompt: 'Enter environment name' });
            if (name) {
                await environmentService.addEnvironment(name);
                sidebarProvider.refreshEnvironments();
                requestPanelManager.broadcastEnvironments();
            }
        }),

        vscode.commands.registerCommand('liteclient.renameEnvironment', async (node: any) => {
            const newName = await vscode.window.showInputBox({ prompt: "New name", value: node.env.name });
            if (newName) {
                await environmentService.renameEnvironment(node.env.id, newName);
                sidebarProvider.refreshEnvironments();
                requestPanelManager.broadcastEnvironments();
            }
        }),

        vscode.commands.registerCommand('liteclient.deleteEnvironment', async (node: any) => {
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
        }),

        vscode.commands.registerCommand('liteclient.setSelectedEnvironment', async (id: string) => {
            await settingsService.setSelectedEnvironmentId(id);
            sidebarProvider.refreshEnvironments();
            requestPanelManager.broadcastEnvironments();
        }),

        vscode.commands.registerCommand('liteclient.addVariableToEnvironment', async (node: any) => {
            const key = await vscode.window.showInputBox({ prompt: 'Variable name' });
            if (key) {
                const value = await vscode.window.showInputBox({ prompt: 'Variable value' });
                if (value !== undefined) {
                    await environmentService.applyVariableUpdates(node.env.id, { [key]: value });
                    sidebarProvider.refreshEnvironments();
                    requestPanelManager.broadcastEnvironments();
                }
            }
        }),

        vscode.commands.registerCommand('liteclient.editVariable', async (node: any) => {
            const variableName = node.variableName || node.varName;
            const variableValue = node.variableValue || node.newValue;
            const environmentId = node.environmentId || node.envId;

            const newValue = await vscode.window.showInputBox({
                prompt: `Value for ${variableName}`,
                value: variableValue
            });
            if (newValue !== undefined) {
                await environmentService.applyVariableUpdates(environmentId, { [variableName]: newValue });
                sidebarProvider.refreshEnvironments();
                requestPanelManager.broadcastEnvironments();
            }
        }),

        vscode.commands.registerCommand('liteclient.duplicateEnvironment', async (node: any) => {
            const source = await environmentService.getEnvironmentById(node.environmentId);
            if (!source) { return; }

            const copyName = `${source.name} (Copy)`;
            const newEnv = await environmentService.duplicateEnvironment(node.environmentId, copyName);
            if (newEnv) {
                sidebarProvider.refreshEnvironments();
                requestPanelManager.broadcastEnvironments();
                vscode.commands.executeCommand('liteclient.openEnvironmentManager', { environmentId: newEnv.id });
            }
        }),

        vscode.commands.registerCommand('liteclient.deleteVariable', async (node: any) => {
            const confirmation = await vscode.window.showInformationMessage(
                `Delete variable "${node.variableName}"?`,
                { modal: true },
                "Delete"
            );

            if (confirmation === "Delete") {
                await environmentService.applyVariableUpdates(node.environmentId, { [node.variableName]: null });
                sidebarProvider.refreshEnvironments();
                requestPanelManager.broadcastEnvironments();
            }
        })
    );
}
