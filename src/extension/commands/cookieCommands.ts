import * as vscode from 'vscode';
import { CookieJarService } from '../services/cookieJarService';
import { CookieManagerProvider } from '../providers/webviews/cookieManagerProvider';

interface CookieCommandDependencies {
    cookieJarService: CookieJarService;
    cookieManagerProvider: CookieManagerProvider;
}

export function registerCookieCommands(
    context: vscode.ExtensionContext,
    deps: CookieCommandDependencies
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('liteclient.openCookieManager', async () => {
            await deps.cookieManagerProvider.open();
        }),

        vscode.commands.registerCommand('liteclient.clearCookies', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Clear all stored cookies?',
                { modal: true },
                'Clear'
            );
            
            if (confirm === 'Clear') {
                await deps.cookieJarService.clearAll();
                vscode.window.showInformationMessage('Cookie Jar cleared.');
            }
        })
    );
}
