/**
 * Type-safe messaging between extension and webview
 */

export interface AuthConfig {
    type: 'none' | 'basic' | 'bearer' | 'apikey';
    basic?: { username: string; password: string };
    bearer?: { token: string };
    apikey?: { key: string; value: string; addTo: 'header' | 'query' };
}

export interface HistoryItem {
    id: string;
    name?: string;
    timestamp: number;
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string | null;
    auth?: AuthConfig;
    status: string;
}

export interface RequestItem {
    id: string;
    name: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string | null;
    auth?: AuthConfig;
}

export interface Collection {
    id: string;
    name: string;
    requests: RequestItem[];
}

// Message types from extension to webview
export interface ResponseMessage {
    type: 'response';
    body: string;
    status: string;
    headers: Record<string, string>;
    isError: boolean;
}

export interface LoadRequestMessage {
    type: 'load-request';
    payload: {
        method: string;
        url: string;
        headers: Record<string, string>;
        body: string;
        auth?: AuthConfig;
        source: 'history' | 'collection' | 'new';
        collectionId?: string;
        collectionPath?: string[];
    };
}

export interface EnvironmentsListMessage {
    type: 'environments-list';
    environments: Array<{ id: string; name: string }>;
    selectedEnvironmentId: string | null;
}

export interface SetEnvironmentMessage {
    type: 'set-environment';
    environmentId: string | null;
}

export interface HistoryListMessage {
    type: 'history-list';
    items: HistoryItem[];
}

export interface CollectionsListMessage {
    type: 'collections-list';
    collections: Collection[];
}

export type ExtensionMessage =
    | ResponseMessage
    | LoadRequestMessage
    | EnvironmentsListMessage
    | HistoryListMessage
    | CollectionsListMessage
    | SetEnvironmentMessage;

// Message types from webview to extension
export interface SendRequestMessage {
    type: 'send-request';
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string;
    bodyType: string;
    name: string;
    auth?: AuthConfig;
    environmentId?: string | null;
}

export interface SaveRequestMessage {
    type: 'save-request';
    name: string;
    collectionId?: string;
    payload: {
        method: string;
        url: string;
        headers: Record<string, string>;
        body: string;
        bodyType: string;
        auth?: AuthConfig;
    };
}

export interface GetHistoryMessage { type: 'get-history' }
export interface GetCollectionsMessage { type: 'get-collections' }
export interface GetEnvironmentsMessage { type: 'get-environments' }
export interface NewRequestMessage { type: 'new-request' }
export interface AddCollectionMessage { type: 'add-collection' }
export interface OpenRequestMessage {
    type: 'open-request';
    source: 'history' | 'collection';
    id: string;
    sourceCollectionId?: string;
}
export interface HistoryActionMessage {
    type: 'history-action';
    action: 'delete' | 'rename' | 'clear-all' | 'delete-all' | 'add-to-collection';
    id?: string;
}

export interface CollectionActionMessage {
    type: 'collection-action';
    action: 'delete' | 'rename';
    collectionId: string;
}
export interface AddCollectionRequestMessage {
    type: 'add-collection-request';
    collectionId: string;
    parentId?: string;
}

export interface AddCollectionFolderMessage {
    type: 'add-collection-folder';
    collectionId: string;
    parentId?: string;
}

export interface CollectionRequestActionMessage {
    type: 'collection-request-action';
    action: 'delete' | 'rename';
    id: string;
    collectionId: string;
}

export interface CollectionItemActionMessage {
    type: 'collection-item-action';
    action: 'delete' | 'rename';
    collectionId: string;
    itemId: string;
    name?: string;
}

export interface EnvActionMessage {
    type: 'env-action';
    action: 'add' | 'delete' | 'rename' | 'update-vars';
    id?: string;
    variables?: Record<string, string>;
}

export interface EnvVariableActionMessage {
    type: 'env-variable-action';
    action: 'add-variable' | 'edit-variable' | 'delete-variable';
    envId: string;
    varName?: string;
    newValue?: string;
}

export interface SetEnvironmentMessage {
    type: 'set-environment';
    environmentId: string | null;
}

export type WebviewMessage =
    | SendRequestMessage
    | SaveRequestMessage
    | GetHistoryMessage
    | GetCollectionsMessage
    | GetEnvironmentsMessage
    | NewRequestMessage
    | AddCollectionMessage
    | OpenRequestMessage
    | HistoryActionMessage
    | CollectionActionMessage
    | AddCollectionRequestMessage
    | AddCollectionFolderMessage
    | CollectionRequestActionMessage
    | CollectionItemActionMessage
    | EnvActionMessage
    | EnvVariableActionMessage
    | SetEnvironmentMessage;

/**
 * Acquire VS Code API (called once at startup)
 */
declare function acquireVsCodeApi(): {
    postMessage(message: WebviewMessage): void;
    getState<T>(): T | undefined;
    setState<T>(state: T): T;
};

let vscodeApi: any;

/**
 * Get the VS Code API instance
 */
export function getVsCodeApi() {
    if (!vscodeApi) {
        if (typeof acquireVsCodeApi === 'function') {
            vscodeApi = acquireVsCodeApi();
        } else {
            console.warn('[LiteClient] acquireVsCodeApi not found, using mock');
            vscodeApi = {
                postMessage: (msg: any) => console.log('Mock postMessage:', msg),
                getState: () => undefined,
                setState: (s: any) => s
            };
        }
    }
    return vscodeApi;
}

export const vscode = getVsCodeApi();


/**
 * Send a message to the extension
 */
export function postMessage(message: WebviewMessage): void {
    vscode.postMessage(message);
}

/**
 * Listen for messages from the extension
 */
export function onMessage(callback: (message: ExtensionMessage) => void): void {
    window.addEventListener('message', (event: MessageEvent<ExtensionMessage>) => {
        callback(event.data);
    });
}
