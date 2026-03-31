import * as vscode from 'vscode';
import { CollectionService } from '../../services/collectionService';

export class CollectionManagerProvider {
    private panels = new Map<string, vscode.WebviewPanel>();

    constructor(
        private context: vscode.ExtensionContext,
        private collectionService: CollectionService,
        private onCollectionsChanged: (collectionId?: string) => Promise<void>
    ) {}

    async open(options?: { collectionId?: string }): Promise<void> {
        const collectionId = options?.collectionId;
        if (!collectionId) {
            return;
        }

        const existing = this.panels.get(collectionId);
        if (existing) {
            existing.reveal();
            await this.sendState(collectionId, existing);
            return;
        }

        const collection = await this.collectionService.getCollectionById(collectionId);
        if (!collection) {
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'collectionManager',
            `${collection.name} Variables`,
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
                case 'collectionmgr-get-state':
                    await this.sendState(collectionId, panel);
                    break;
                case 'collectionmgr-rename-collection': {
                    await this.collectionService.renameCollection(message.id, message.name);
                    panel.title = `${message.name} Variables`;
                    await this.onCollectionsChanged(message.id);
                    await this.sendState(collectionId, panel);
                    break;
                }
                case 'collectionmgr-update-variables': {
                    await this.collectionService.updateCollectionVariables(message.collectionId, message.variables);
                    await this.onCollectionsChanged(message.collectionId);
                    await this.sendState(collectionId, panel);
                    break;
                }
            }
        });

        panel.onDidDispose(() => {
            this.panels.delete(collectionId);
        });

        this.panels.set(collectionId, panel);
        await this.sendState(collectionId, panel);
    }

    async refresh(): Promise<void> {
        for (const [collectionId, panel] of this.panels) {
            await this.sendState(collectionId, panel);
        }
    }

    private async sendState(collectionId: string, panel?: vscode.WebviewPanel): Promise<void> {
        const targetPanel = panel || this.panels.get(collectionId);
        if (!targetPanel) {
            return;
        }

        const collection = await this.collectionService.getCollectionById(collectionId);
        if (!collection) {
            return;
        }

        targetPanel.webview.postMessage({
            type: 'collectionmgr-state',
            collection: {
                id: collection.id,
                name: collection.name,
                variables: collection.variables || []
            }
        });
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'collection-manager.js')
        );
        const nonce = getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <title>Collection Manager</title>
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
