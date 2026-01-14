export interface AuthConfig {
    type: 'none' | 'basic' | 'bearer' | 'apikey';
    basic?: { username: string; password: string };
    bearer?: { token: string };
    apikey?: { key: string; value: string; addTo: 'header' | 'query' };
}

export interface KeyValueRow {
    id: string;
    key: string;
    value: string;
    active: boolean;
}

// ============================================================================
// Execution Ledger Types (Postman-style immutable history)
// ============================================================================

export type RequestExecutionSource =
    | { type: 'scratch' }
    | { type: 'collection'; collectionId: string; requestId: string }
    | { type: 'history'; executionId: string }
    | { type: 'unknown' };

export interface RequestSnapshot {
    name?: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body: RequestBody;
    auth?: AuthConfig;
}

export interface RequestExecution {
    id: string;
    timestamp: number;
    source: RequestExecutionSource;
    request: RequestSnapshot;
    result: {
        status: string;
    };
}

export type RequestBody =
    | {
        mode: "none";
    }
    | {
        mode: "raw";
        rawType: "text" | "javascript" | "json" | "html" | "xml";
        value: string;
    }
    | {
        mode: "form-data";
        rows: KeyValueRow[];
    }
    | {
        mode: "x-www-form-urlencoded";
        rows: KeyValueRow[];
    };
