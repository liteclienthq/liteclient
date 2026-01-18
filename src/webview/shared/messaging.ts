/**
 * Webview messaging utilities.
 * 
 * Re-exports types from shared/messages.ts and provides
 * the postMessage helper for webview code.
 */

// Re-export all message types for webview components
export type {
    // Data types
    RequestExecution,
    RequestExecutionSource,
    Environment,
    // Extension → Webview
    ResponseMessage,
    LoadRequestMessage,
    EnvironmentsListMessage,
    SetEnvironmentBroadcastMessage,
    HistoryListMessage,
    CollectionsListMessage,
    ExtensionToWebviewMessage,
    // Webview → Extension (Sidebar)
    GetHistoryMessage,
    GetCollectionsMessage,
    GetEnvironmentsMessage,
    NewRequestMessage,
    AddCollectionMessage,
    ImportCollectionMessage,
    OpenRequestMessage,
    HistoryActionMessage,
    CollectionActionMessage,
    AddCollectionRequestMessage,
    AddCollectionFolderMessage,
    CollectionItemActionMessage,
    EnvActionMessage,
    EnvVariableActionMessage,
    SetEnvironmentMessage,
    SidebarToExtensionMessage,
    // Webview → Extension (Request Panel)
    SendRequestMessage,
    SaveRequestMessage,
    DirtyStateMessage,
    RequestPanelToExtensionMessage,
    // Combined
    WebviewToExtensionMessage,
} from '../../shared/messages.js';

// Re-export model types for convenience
export type { AuthConfig, RequestBody, KeyValueRow } from '../../shared/models.js';

// Legacy type aliases for backward compatibility
export type ExtensionMessage = import('../../shared/messages.js').ExtensionToWebviewMessage;
export type WebviewMessage = import('../../shared/messages.js').WebviewToExtensionMessage;

// ============================================================================
// VS Code API
// ============================================================================

declare function acquireVsCodeApi(): {
    postMessage(message: import('../../shared/messages.js').WebviewToExtensionMessage): void;
    getState<T>(): T | undefined;
    setState<T>(state: T): T;
};

let vscodeApi: ReturnType<typeof acquireVsCodeApi> | undefined;

/**
 * Get the VS Code API instance (singleton)
 */
export function getVsCodeApi(): ReturnType<typeof acquireVsCodeApi> {
    if (!vscodeApi) {
        if (typeof acquireVsCodeApi === 'function') {
            vscodeApi = acquireVsCodeApi();
        } else {
            console.warn('[LiteClient] acquireVsCodeApi not found, using mock');
            vscodeApi = {
                postMessage: () => { },
                getState: () => undefined,
                setState: <T>(s: T) => s
            };
        }
    }
    return vscodeApi;
}

export const vscode = getVsCodeApi();

/**
 * Send a typed message to the extension
 */
export function postMessage(message: import('../../shared/messages.js').WebviewToExtensionMessage): void {
    vscode.postMessage(message);
}

/**
 * Listen for typed messages from the extension
 */
export function onMessage(callback: (message: import('../../shared/messages.js').ExtensionToWebviewMessage) => void): void {
    window.addEventListener('message', (event: MessageEvent<import('../../shared/messages.js').ExtensionToWebviewMessage>) => {
        callback(event.data);
    });
}

// ============================================================================
// Legacy exports for existing components
// ============================================================================

export interface RequestItem {
    id: string;
    name: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body: import('../../shared/models.js').RequestBody;
    auth?: import('../../shared/models.js').AuthConfig;
}

export interface Collection {
    id: string;
    name: string;
    requests: RequestItem[];
}
