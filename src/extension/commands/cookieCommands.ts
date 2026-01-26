import * as vscode from 'vscode';
import { CookieJarService } from '../services/cookieJarService';

interface CookieCommandDependencies {
    cookieJarService: CookieJarService;
}

export function registerCookieCommands(
    context: vscode.ExtensionContext,
    deps: CookieCommandDependencies
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('liteclient.toggleCookieJar', async () => {
            const isEnabled = deps.cookieJarService.isEnabled();
            deps.cookieJarService.setEnabled(!isEnabled);
            
            if (!isEnabled) {
                vscode.window.showInformationMessage('Cookie Jar enabled. Cookies will be persisted across requests.');
            } else {
                vscode.window.showInformationMessage('Cookie Jar disabled.');
            }
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
