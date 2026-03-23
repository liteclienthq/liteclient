import * as vscode from 'vscode';
import { CollectionRunner, RunConfig } from '../../services/collectionRunner';
import { CollectionService, CollectionItem, FolderItem } from '../../services/collectionService';
import { EnvironmentService } from '../../services/environmentService';
import { SettingsService } from '../../services/settingsService';
import type { RunnerToExtensionMessage } from '../../../shared/messages';

export interface RunnerOpenArgs {
    collectionId: string;
    folderId?: string;
}

export class RunnerProvider {
    private static panel: vscode.WebviewPanel | undefined;
    private runConfig: RunConfig | null = null;

    constructor(
        private context: vscode.ExtensionContext,
        private collectionRunner: CollectionRunner,
        private collectionService: CollectionService,
        private environmentService: EnvironmentService,
        private settingsService: SettingsService,
        private refreshHistory: () => void
    ) {}

    async open(args: RunnerOpenArgs): Promise<void> {
        this.runConfig = {
            collectionId: args.collectionId,
            folderId: args.folderId,
        };

        if (RunnerProvider.panel) {
            RunnerProvider.panel.reveal();
            await this.sendState();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'collectionRunner',
            'Collection Runner',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'file_icon.png');
        panel.webview.html = this.getHtmlContent(panel.webview);

        panel.webview.onDidReceiveMessage(async (message: RunnerToExtensionMessage) => {
            switch (message.type) {
                case 'runner-get-state':
                    await this.sendState(panel);
                    break;
                case 'runner-start':
                    await this.startRun(panel);
                    break;
                case 'runner-cancel':
                    this.collectionRunner.cancel();
                    break;
            }
        });

        panel.onDidDispose(() => {
            RunnerProvider.panel = undefined;
            this.collectionRunner.cancel();
        });

        RunnerProvider.panel = panel;
        await this.sendState(panel);
    }

    private async sendState(panel?: vscode.WebviewPanel): Promise<void> {
        const targetPanel = panel || RunnerProvider.panel;
        if (!targetPanel || !this.runConfig) { return; }

        const collection = await this.collectionService.getCollectionById(this.runConfig.collectionId);
        if (!collection) { return; }

        let folderName: string | undefined;
        let items: CollectionItem[];
        if (this.runConfig.folderId) {
            const folder = this.findFolder(collection.items, this.runConfig.folderId);
            folderName = folder?.name;
            items = folder?.items || [];
        } else {
            items = collection.items;
        }

        const totalRequests = this.countRequests(items);

        const selectedEnvId = await this.settingsService.getSelectedEnvironmentId();
        let environmentName: string | undefined;
        if (selectedEnvId && selectedEnvId !== 'globals') {
            const env = await this.environmentService.getEnvironmentById(selectedEnvId);
            environmentName = env?.name;
        }

        targetPanel.webview.postMessage({
            type: 'runner-state',
            collectionName: collection.name,
            folderName,
            totalRequests,
            environmentName,
        });
    }

    private async startRun(panel: vscode.WebviewPanel): Promise<void> {
        if (!this.runConfig) { return; }

        panel.title = 'Running Collection...';

        await this.collectionRunner.run(
            this.runConfig,
            (current, total, result) => {
                panel.webview.postMessage({
                    type: 'runner-progress',
                    current,
                    total,
                    result,
                });
            },
            (results, summary) => {
                panel.title = `Runner: ${summary.passed}/${summary.total} passed`;
                panel.webview.postMessage({
                    type: 'runner-complete',
                    results,
                    summary,
                });
                this.refreshHistory();
            },
            (error) => {
                panel.title = 'Collection Runner';
                panel.webview.postMessage({
                    type: 'runner-error',
                    error,
                });
            }
        );
    }

    private countRequests(items: CollectionItem[]): number {
        let count = 0;
        for (const item of items) {
            if (item.type === 'request') {
                count++;
            } else if (item.type === 'folder') {
                count += this.countRequests((item as FolderItem).items);
            }
        }
        return count;
    }

    private findFolder(items: CollectionItem[], folderId: string): FolderItem | undefined {
        for (const item of items) {
            if (item.type === 'folder') {
                if (item.id === folderId) {
                    return item as FolderItem;
                }
                const found = this.findFolder((item as FolderItem).items, folderId);
                if (found) { return found; }
            }
        }
        return undefined;
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'runner.js')
        );
        const nonce = getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <title>Collection Runner</title>
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
