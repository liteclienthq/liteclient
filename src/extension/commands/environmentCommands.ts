import * as vscode from 'vscode';
import { EnvironmentService } from '../services/environmentService';
import { SettingsService } from '../services/settingsService';
import { SidebarProvider } from '../providers/webviews/sidebarProvider';
import { RequestPanelManager } from '../providers/webviews/requestPanelManager';
import { generateId } from '../utils/idUtils';
import type { EnvironmentVariable } from '../../shared/models';

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
                await environmentService.updateEnvironment({ ...node.env, name: newName });
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
                    const newVar: EnvironmentVariable = { id: generateId(), name: key, initialValue: value, type: 'default', enabled: true };
                    node.env.variables.push(newVar);
                    await environmentService.updateEnvironment(node.env);
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
                const envs = await environmentService.load();
                const env = envs.find(e => e.id === environmentId);
                if (env) {
                    const envVar = env.variables.find(v => v.name === variableName);
                    if (envVar) {
                        envVar.initialValue = newValue;
                        await environmentService.updateEnvironment(env);
                        sidebarProvider.refreshEnvironments();
                        requestPanelManager.broadcastEnvironments();
                    }
                }
            }
        }),

        vscode.commands.registerCommand('liteclient.duplicateEnvironment', async (node: any) => {
            const envs = await environmentService.load();
            const source = envs.find(e => e.id === node.environmentId);
            if (!source) { return; }

            const copyName = `${source.name} (Copy)`;
            await environmentService.addEnvironment(copyName);
            const updatedEnvs = await environmentService.load();
            const newEnv = updatedEnvs.find(e => e.name === copyName);
            if (newEnv) {
                newEnv.variables = source.variables.map(v => ({
                    ...v,
                    id: generateId()
                }));
                await environmentService.updateEnvironment(newEnv);
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
                const envs = await environmentService.load();
                const env = envs.find(e => e.id === node.environmentId);
                if (env) {
                    env.variables = env.variables.filter(v => v.name !== node.variableName);
                    await environmentService.updateEnvironment(env);
                    sidebarProvider.refreshEnvironments();
                    requestPanelManager.broadcastEnvironments();
                }
            }
        })
    );
}
