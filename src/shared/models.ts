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
