/**
 * Type-safe messaging protocol between extension and webview.
 * 
 * This file is shared by both the extension (Node.js) and webview (browser).
 * Do NOT add any runtime code here — only type definitions.
 */

import { AuthConfig, RequestBody, RequestExecution, RequestExecutionSource, KeyValueRow, FormDataRow, ParsedCookie } from './models';

// Re-export for convenience
export type { RequestExecution, RequestExecutionSource, KeyValueRow, FormDataRow, ParsedCookie };

export interface Environment {
    id: string;
    name: string;
    variables: Record<string, string>;
}

// ============================================================================
// Messages: Extension → Webview
// ============================================================================

export interface ResponseMessage {
    type: 'response';
    body: string;
    status: string;
    headers: Record<string, string>;
    cookies: ParsedCookie[];
    time?: number;
    isError: boolean;
}

export interface LoadRequestMessage {
    type: 'load-request';
    payload: {
        id?: string;
        name?: string;
        method: string;
        url: string;
        headers: Record<string, string>;
        body: RequestBody;
        auth?: AuthConfig;
        source: 'history' | 'collection' | 'new';
        collectionId?: string;
        collectionPath?: string[];
    };
}

export interface EnvironmentsListMessage {
    type: 'environments-list';
    environments: Environment[];
    selectedEnvironmentId: string | null | undefined;
}

export interface SetEnvironmentBroadcastMessage {
    type: 'set-environment';
    environmentId: string | null | undefined;
}

export interface HistoryListMessage {
    type: 'history-list';
    items: RequestExecution[];
}

export interface CollectionsListMessage {
    type: 'collections-list';
    collections: Array<{
        id: string;
        name: string;
        items: unknown[];
    }>;
}

/** All message types sent from extension to webview */
export type ExtensionToWebviewMessage =
    | ResponseMessage
    | LoadRequestMessage
    | EnvironmentsListMessage
    | SetEnvironmentBroadcastMessage
    | HistoryListMessage
    | CollectionsListMessage;

// ============================================================================
// Messages: Webview → Extension (Sidebar)
// ============================================================================

export interface GetHistoryMessage {
    type: 'get-history';
}

export interface GetCollectionsMessage {
    type: 'get-collections';
}

export interface GetEnvironmentsMessage {
    type: 'get-environments';
}

export interface NewRequestMessage {
    type: 'new-request';
}

export interface AddCollectionMessage {
    type: 'add-collection';
}

export interface ImportCollectionMessage {
    type: 'import-collection';
}

export interface OpenRequestMessage {
    type: 'open-request';
    source: 'history' | 'collection';
    id: string;
    sourceCollectionId?: string;
}

export interface HistoryActionMessage {
    type: 'history-action';
    action: 'delete' | 'delete-bulk' | 'clear-all';
    id?: string;
    ids?: string[];
}

export interface CollectionActionMessage {
    type: 'collection-action';
    action: 'delete' | 'rename' | 'export';
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
    environmentId: string | undefined;
}

/** Messages from sidebar webview to extension */
export type SidebarToExtensionMessage =
    | GetHistoryMessage
    | GetCollectionsMessage
    | GetEnvironmentsMessage
    | NewRequestMessage
    | AddCollectionMessage
    | ImportCollectionMessage
    | OpenRequestMessage
    | HistoryActionMessage
    | CollectionActionMessage
    | AddCollectionRequestMessage
    | AddCollectionFolderMessage
    | CollectionItemActionMessage
    | EnvActionMessage
    | EnvVariableActionMessage
    | SetEnvironmentMessage;

// ============================================================================
// Messages: Webview → Extension (Request Panel)
// ============================================================================

export interface SendRequestMessage {
    type: 'send-request';
    method: string;
    url: string;
    headers: Record<string, string>;
    body: RequestBody;
    name?: string;
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
        body: RequestBody;
        auth?: AuthConfig;
    };
}

export interface GetEnvironmentsFromPanelMessage {
    type: 'get-environments';
}

export interface SetEnvironmentFromPanelMessage {
    type: 'set-environment';
    environmentId: string | undefined;
}

export interface DirtyStateMessage {
    type: 'dirty-state';
    isDirty: boolean;
}

export interface ShowNotificationMessage {
    type: 'show-notification';
    level: 'info' | 'warning' | 'error';
    message: string;
}

export interface CancelRequestMessage {
    type: 'cancel-request';
}

/** Messages from request panel webview to extension */
export type RequestPanelToExtensionMessage =
    | SendRequestMessage
    | SaveRequestMessage
    | GetEnvironmentsFromPanelMessage
    | SetEnvironmentFromPanelMessage
    | DirtyStateMessage
    | ShowNotificationMessage
    | CancelRequestMessage;

// ============================================================================
// Combined Types
// ============================================================================

/** All messages from any webview to extension */
export type WebviewToExtensionMessage =
    | SidebarToExtensionMessage
    | RequestPanelToExtensionMessage;
