import * as vscode from 'vscode';
import { CookieJarService } from '../../services/cookieJarService';
import type { CookieManagerToExtensionMessage } from '../../../shared/messages';

export class CookieManagerProvider {
    private static panel: vscode.WebviewPanel | undefined;

    constructor(
        private context: vscode.ExtensionContext,
        private cookieJarService: CookieJarService
    ) {}

    async open(): Promise<void> {
        if (CookieManagerProvider.panel) {
            CookieManagerProvider.panel.reveal();
            await this.sendCookies();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'cookieManager',
            'Cookie Manager',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'file_icon.png');
        panel.webview.html = this.getHtmlContent(panel.webview);

        panel.webview.onDidReceiveMessage(async (message: CookieManagerToExtensionMessage) => {
            switch (message.type) {
                case 'get-cookies':
                    await this.sendCookies(panel);
                    break;
                case 'delete-cookie':
                    await this.cookieJarService.deleteCookie(message.domain, message.name);
                    await this.sendCookies(panel);
                    break;
                case 'delete-domain-cookies':
                    await this.cookieJarService.deleteAllCookiesForDomain(message.domain);
                    await this.sendCookies(panel);
                    break;
                case 'clear-all-cookies':
                    await this.cookieJarService.clearAll();
                    await this.sendCookies(panel);
                    vscode.window.showInformationMessage('All cookies cleared.');
                    break;
            }
        });

        panel.onDidDispose(() => {
            CookieManagerProvider.panel = undefined;
        });

        CookieManagerProvider.panel = panel;
        await this.sendCookies(panel);
    }

    private async sendCookies(panel?: vscode.WebviewPanel): Promise<void> {
        const targetPanel = panel || CookieManagerProvider.panel;
        if (!targetPanel) {
            return;
        }

        const domains = await this.cookieJarService.getAllCookies();
        targetPanel.webview.postMessage({
            type: 'cookies-list',
            domains
        });
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'cookie-manager.js')
        );
        const nonce = getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <title>Cookie Manager</title>
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
