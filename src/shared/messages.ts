/**
 * Type-safe messaging protocol between extension and webview.
 * 
 * This file is shared by both the extension (Node.js) and webview (browser).
 * Do NOT add any runtime code here — only type definitions.
 */

import { AuthConfig, RequestBody, RequestExecution, RequestExecutionSource, KeyValueRow, FormDataRow, ParsedCookie, DomainCookies, OAuth2AuthConfig, Environment, EnvironmentVariable } from './models';

// Re-export for convenience
export type { RequestExecution, RequestExecutionSource, KeyValueRow, FormDataRow, ParsedCookie, DomainCookies, EnvironmentVariable };

export type { Environment };

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

// ExtensionToWebviewMessage is defined in Combined Types section below

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

export interface MoveCollectionItemMessage {
    type: 'move-collection-item';
    sourceCollectionId: string;
    targetCollectionId: string;
    itemId: string;
    targetParentId?: string;
    insertBeforeId?: string;
}

export interface EnvActionMessage {
    type: 'env-action';
    action: 'add' | 'delete' | 'rename' | 'update-vars';
    id?: string;
    variables?: EnvironmentVariable[];
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
    | MoveCollectionItemMessage
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

export interface OAuth2GetTokenMessage {
    type: 'oauth2-get-token';
    config: OAuth2AuthConfig;
}

export interface OAuth2ClearTokenMessage {
    type: 'oauth2-clear-token';
    config: OAuth2AuthConfig;
}

/** Messages from request panel webview to extension */
export type RequestPanelToExtensionMessage =
    | SendRequestMessage
    | SaveRequestMessage
    | GetEnvironmentsFromPanelMessage
    | SetEnvironmentFromPanelMessage
    | DirtyStateMessage
    | ShowNotificationMessage
    | CancelRequestMessage
    | OAuth2GetTokenMessage
    | OAuth2ClearTokenMessage;

// ============================================================================
// Messages: Webview → Extension (Cookie Manager)
// ============================================================================

export interface GetCookiesMessage {
    type: 'get-cookies';
}

export interface DeleteCookieMessage {
    type: 'delete-cookie';
    domain: string;
    name: string;
}

export interface DeleteDomainCookiesMessage {
    type: 'delete-domain-cookies';
    domain: string;
}

export interface ClearAllCookiesMessage {
    type: 'clear-all-cookies';
}

/** Messages from cookie manager webview to extension */
export type CookieManagerToExtensionMessage =
    | GetCookiesMessage
    | DeleteCookieMessage
    | DeleteDomainCookiesMessage
    | ClearAllCookiesMessage;

// ============================================================================
// Messages: Extension → Webview (Cookie Manager)
// ============================================================================

export interface CookiesListMessage {
    type: 'cookies-list';
    domains: DomainCookies[];
}

export interface OAuth2TokenResultMessage {
    type: 'oauth2-token-result';
    success: boolean;
    expiresAt?: number;
    error?: string;
}

// ============================================================================
// Combined Types
// ============================================================================

/** All message types sent from extension to webview */
export type ExtensionToWebviewMessage =
    | ResponseMessage
    | LoadRequestMessage
    | EnvironmentsListMessage
    | SetEnvironmentBroadcastMessage
    | HistoryListMessage
    | CollectionsListMessage
    | CookiesListMessage
    | OAuth2TokenResultMessage;

/** All messages from any webview to extension */
export type WebviewToExtensionMessage =
    | SidebarToExtensionMessage
    | RequestPanelToExtensionMessage
    | CookieManagerToExtensionMessage;
