import * as vscode from 'vscode';
import { EnvironmentService } from '../../services/environmentService';
import { SettingsService } from '../../services/settingsService';
import { CurrentValuesService } from '../../services/currentValuesService';

export class EnvironmentManagerProvider {
    private panels = new Map<string, vscode.WebviewPanel>();

    constructor(
        private context: vscode.ExtensionContext,
        private environmentService: EnvironmentService,
        private settingsService: SettingsService,
        private currentValuesService: CurrentValuesService,
        private onEnvironmentsChanged: () => Promise<void>
    ) {}

    async open(options?: { environmentId?: string }): Promise<void> {
        const environmentId = options?.environmentId;
        if (!environmentId) {
            return;
        }

        const existing = this.panels.get(environmentId);
        if (existing) {
            existing.reveal();
            await this.sendState(environmentId, existing);
            return;
        }

        const env = await this.environmentService.getEnvironmentById(environmentId);
        if (!env) {
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'environmentManager',
            env.name,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'file_icon.png');
        panel.webview.html = this.getHtmlContent(panel.webview);

        panel.webview.onDidReceiveMessage(async (message: any) => {
            switch (message.type) {
                case 'envmgr-get-state':
                    await this.sendState(environmentId, panel);
                    break;
                case 'envmgr-rename-environment': {
                    await this.environmentService.renameEnvironment(message.id, message.name);
                    panel.title = message.name;
                    await this.onEnvironmentsChanged();
                    await this.sendState(environmentId, panel);
                    break;
                }
                case 'envmgr-delete-environment': {
                    const selectedId = await this.settingsService.getSelectedEnvironmentId();
                    if (selectedId === message.id) {
                        await this.settingsService.setSelectedEnvironmentId(undefined);
                    }
                    await this.currentValuesService.clearEnvironment(message.id);
                    await this.environmentService.deleteEnvironment(message.id);
                    await this.onEnvironmentsChanged();
                    panel.dispose();
                    break;
                }
                case 'envmgr-duplicate-environment': {
                    const source = await this.environmentService.getEnvironmentById(message.id);
                    if (!source) {
                        break;
                    }

                    const copyName = `${source.name} (Copy)`;
                    const newEnv = await this.environmentService.duplicateEnvironment(message.id, copyName);
                    if (newEnv) {
                        await this.onEnvironmentsChanged();
                        await this.open({ environmentId: newEnv.id });
                    }
                    break;
                }
                case 'envmgr-update-variables': {
                    await this.environmentService.setVariables(message.envId, message.variables);
                    await this.onEnvironmentsChanged();
                    await this.sendState(environmentId, panel);
                    break;
                }
                case 'envmgr-set-current-value':
                    await this.currentValuesService.setCurrentValue(message.envId, message.varId, message.value);
                    await this.onEnvironmentsChanged();
                    await this.sendState(environmentId, panel);
                    break;
                case 'envmgr-clear-current-value':
                    await this.currentValuesService.clearCurrentValue(message.envId, message.varId);
                    await this.onEnvironmentsChanged();
                    await this.sendState(environmentId, panel);
                    break;
            }
        });

        panel.onDidDispose(() => {
            this.panels.delete(environmentId);
        });

        this.panels.set(environmentId, panel);
        await this.sendState(environmentId, panel);
    }

    private async sendState(environmentId: string, panel?: vscode.WebviewPanel): Promise<void> {
        const targetPanel = panel || this.panels.get(environmentId);
        if (!targetPanel) {
            return;
        }

        const env = await this.environmentService.getEnvironmentById(environmentId);
        if (!env) {
            return;
        }

        const merged = this.currentValuesService.mergeIntoEnvironments([env]);
        const selectedEnvironmentId = await this.settingsService.getSelectedEnvironmentId();

        targetPanel.webview.postMessage({
            type: 'envmgr-state',
            environment: merged[0],
            selectedEnvironmentId
        });
    }

    public async refresh(): Promise<void> {
        for (const [envId, panel] of this.panels) {
            await this.sendState(envId, panel);
        }
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'environment-manager.js')
        );
        const nonce = getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <title>Environment Manager</title>
            </head>
            <body style="padding: 0; margin: 0;">
                <div id="app"></div>
                <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
