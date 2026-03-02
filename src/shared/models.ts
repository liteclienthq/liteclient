export type VariableType = 'default' | 'secret';

export interface EnvironmentVariable {
  id: string;
  name: string;
  initialValue: string;
  type: VariableType;
  enabled: boolean;
  currentValue?: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

export type OAuth2GrantType = 'authorization_code' | 'client_credentials';

export type OAuth2ClientAuthMethod = 'body' | 'basic_header';

export interface OAuth2AuthConfig {
    grantType: OAuth2GrantType;
    authorizationUrl?: string;
    tokenUrl: string;
    clientId: string;
    clientSecret?: string;
    scopes?: string[];
    audience?: string;
    pkce?: boolean;
    clientAuthMethod?: OAuth2ClientAuthMethod;
}

export interface AuthConfig {
    type: 'none' | 'basic' | 'bearer' | 'apikey' | 'oauth2';
    basic?: { username: string; password: string };
    bearer?: { token: string };
    apikey?: { key: string; value: string; addTo: 'header' | 'query' };
    oauth2?: OAuth2AuthConfig;
}

export interface KeyValueRow {
    id: string;
    key: string;
    value: string;
    active: boolean;
}

export interface FormDataRow {
    id: string;
    key: string;
    type: 'text' | 'file';
    value: string;
    file?: {
        name: string;
        size: number;
        type: string;
        data: string; // base64 encoded
    };
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
    preRequestScript?: string;
    postResponseScript?: string;
}

// ============================================================================
// Script Execution Types
// ============================================================================

export interface ScriptTestResult {
    name: string;
    passed: boolean;
    error?: string;
}

export interface ScriptConsoleEntry {
    level: 'log' | 'warn' | 'error' | 'info';
    args: string[];
}

export interface ScriptResult {
    testResults: ScriptTestResult[];
    consoleLogs: ScriptConsoleEntry[];
    error?: string;
    variableUpdates?: {
        environment: Record<string, string | null>;
        globals: Record<string, string | null>;
    };
}

export interface RequestExecution {
    id: string;
    timestamp: number;
    source: RequestExecutionSource;
    request: RequestSnapshot;
    result: {
        status: string;
        durationMs?: number;
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
        rows: FormDataRow[];
    }
    | {
        mode: "x-www-form-urlencoded";
        rows: KeyValueRow[];
    };

// ============================================================================
// Cookie Types (for response display)
// ============================================================================

export interface ParsedCookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite?: string;
}

export interface DomainCookies {
    domain: string;
    cookies: ParsedCookie[];
}
