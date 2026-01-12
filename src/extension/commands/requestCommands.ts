import * as vscode from 'vscode';
import { RequestPanelManager } from '../providers/webviews/requestPanelManager';

export interface RequestCommandDeps {
    requestPanelManager: RequestPanelManager;
}

export function registerRequestCommands(
    context: vscode.ExtensionContext,
    deps: RequestCommandDeps
): void {
    const { requestPanelManager } = deps;

    context.subscriptions.push(
        vscode.commands.registerCommand('liteclient.newRequest', () => {
            requestPanelManager.openRequest(
                {
                    method: "GET",
                    url: "https://liteclient.com/hello",
                    headers: {},
                    body: { mode: 'none' }
                },
                'new'
            );
        })
    );
}
