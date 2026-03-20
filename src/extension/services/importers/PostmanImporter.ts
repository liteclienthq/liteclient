import { Importer } from './Importer';
import { Collection, CollectionItem, RequestItem, FolderItem } from '../collectionService';
import { AuthConfig, RequestBody, EnvironmentVariable } from '../../../shared/models';
import { generateId } from '../../utils/idUtils';

export class PostmanImporter implements Importer {
    id = 'postman-v2.1';
    name = 'Postman Collection v2.1';
    description = 'Imports Postman Collection v2.1 format';
    warnings: string[] = [];

    canImport(content: any): boolean {
        try {
            // Check for v2.1 schema signature
            if (content?.info?.schema) {
                return content.info.schema.includes('v2.1.0');
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    async import(content: any): Promise<Collection[]> {
        this.warnings = [];
        this.detectUnsupportedScripts(content);

        const collection: Collection = {
            id: this.generateId(),
            name: content.info?.name || 'Imported Collection',
            description: content.info?.description,
            variables: this.parseCollectionVariables(content.variable),
            items: this.parseItems(content.item || [])
        };
        return [collection];
    }

    private parseCollectionVariables(variables: any[]): EnvironmentVariable[] {
        if (!Array.isArray(variables)) {
            return [];
        }

        return variables
            .filter(variable => variable?.key)
            .map(variable => ({
                id: this.generateId(),
                name: variable.key,
                initialValue: variable.value || '',
                type: 'default',
                enabled: !variable.disabled
            }));
    }

    private detectUnsupportedScripts(content: any): void {
        if (Array.isArray(content.event) && content.event.some((e: any) => e?.script?.exec?.length > 0)) {
            this.warnings.push('Collection-level scripts were found but are not supported and will not run.');
        }
        this.detectFolderScripts(content.item || []);
    }

    private detectFolderScripts(items: any[]): void {
        for (const item of items) {
            if (Array.isArray(item.item)) {
                if (Array.isArray(item.event) && item.event.some((e: any) => e?.script?.exec?.length > 0)) {
                    this.warnings.push(`Folder-level scripts in "${item.name}" are not supported and will not run.`);
                }
                this.detectFolderScripts(item.item);
            }
        }
    }

    private parseItems(items: any[]): CollectionItem[] {
        return items.map(item => {
            // Checks based on Postman Collection v2.1 Schema
            // A folder (item-group) has 'item' property (array of items)
            // A request (item) has 'request' property
            if (Array.isArray(item.item)) {
                // It's a folder
                const folder: FolderItem = {
                    id: this.generateId(),
                    name: item.name,
                    description: item.description,
                    type: 'folder',
                    items: this.parseItems(item.item)
                };
                return folder;
            } else if (item.request) {
                // It's a request
                return this.parseRequest(item);
            } else {
                // Unknown item type or invalid structure, skip or handle gracefully
                // For now, return a placeholder folder to preserve hierarchy/structure if needed, or simply null (filtered out later if we supported that)
                // But given strict typing, let's treat it as a folder without items if it has a name, or safe fallback
                return {
                    id: this.generateId(),
                    name: item.name || 'Unknown Item',
                    type: 'folder',
                    items: []
                };
            }
        });
    }

    private parseRequest(item: any): RequestItem {
        const request = item.request;

        let url = '';
        let params: Record<string, string> = {};

        // Handle URL (string or object)
        if (typeof request.url === 'string') {
            url = request.url;
        } else if (request.url) {
            url = request.url.raw || '';
            // Parse query params if available in structured format
            if (Array.isArray(request.url.query)) {
                request.url.query.forEach((q: any) => {
                    if (!q.disabled) {
                        params[q.key] = q.value;
                    }
                });
            }
        }

        // Handle Headers
        const headers: Record<string, string> = {};
        if (Array.isArray(request.header)) {
            request.header.forEach((h: any) => {
                if (!h.disabled) {
                    headers[h.key] = h.value;
                }
            });
        }

        // Handle Body
        let body: RequestBody = { mode: 'none' };

        if (request.body) {
            const mode = request.body.mode;

            if (mode === 'raw') {
                const language = request.body.options?.raw?.language || 'text';
                body = {
                    mode: 'raw',
                    rawType: (['json', 'javascript', 'html', 'xml', 'text'].includes(language) ? language : 'text') as any,
                    value: request.body.raw || ''
                };
            } else if (mode === 'formdata') {
                body = {
                    mode: 'form-data',
                    rows: Array.isArray(request.body.formdata) ? request.body.formdata.map((f: any) => ({
                        id: this.generateId(),
                        key: f.key || '',
                        type: f.type === 'file' ? 'file' as const : 'text' as const,
                        value: f.type === 'file' ? '' : (f.value || ''),
                        active: !f.disabled
                    })) : []
                };
            } else if (mode === 'urlencoded') {
                body = {
                    mode: 'x-www-form-urlencoded',
                    rows: Array.isArray(request.body.urlencoded) ? request.body.urlencoded.map((u: any) => ({
                        id: this.generateId(),
                        key: u.key || '',
                        value: u.value || '',
                        active: !u.disabled
                    })) : []
                };
            }
        }

        const scripts = this.parseScripts(item.event);

        return {
            id: this.generateId(),
            name: item.name,
            description: item.request.description,
            type: 'request',
            method: request.method || 'GET',
            url: url,
            headers: headers,
            params: Object.keys(params).length > 0 ? params : undefined,
            body: body,
            auth: this.mapAuth(request.auth),
            preRequestScript: scripts.preRequestScript,
            postResponseScript: scripts.postResponseScript
        };
    }

    private mapAuth(postmanAuth: any): AuthConfig | undefined {
        if (!postmanAuth || postmanAuth.type === 'noauth' || postmanAuth.type === 'inherit') {
            return undefined;
        }

        const type = postmanAuth.type;
        const attributes = postmanAuth[type];

        if (!Array.isArray(attributes)) {
            return undefined;
        }

        const getAttr = (key: string) => attributes.find((a: any) => a.key === key)?.value;

        if (type === 'basic') {
            return {
                type: 'basic',
                basic: {
                    username: getAttr('username') || '',
                    password: getAttr('password') || ''
                }
            };
        } else if (type === 'bearer') {
            return {
                type: 'bearer',
                bearer: {
                    token: getAttr('token') || ''
                }
            };
        } else if (type === 'apikey') {
            return {
                type: 'apikey',
                apikey: {
                    key: getAttr('key') || '',
                    value: getAttr('value') || '',
                    addTo: getAttr('in') === 'query' ? 'query' : 'header'
                }
            };
        } else if (type === 'oauth2') {
            const grantType = getAttr('grant_type') || getAttr('grantType') || 'authorization_code';
            const scopeValue = getAttr('scope') || '';
            const scopes = scopeValue ? scopeValue.split(/[\s,]+/).filter((s: string) => s) : undefined;

            return {
                type: 'oauth2',
                oauth2: {
                    grantType: grantType === 'client_credentials' ? 'client_credentials' : 'authorization_code',
                    authorizationUrl: getAttr('authUrl') || getAttr('authorizationUrl') || '',
                    tokenUrl: getAttr('accessTokenUrl') || getAttr('tokenUrl') || '',
                    clientId: getAttr('clientId') || '',
                    clientSecret: getAttr('clientSecret') || '',
                    scopes: scopes,
                    audience: getAttr('audience') || '',
                    pkce: grantType === 'authorization_code_with_pkce' || getAttr('useBrowser') === true
                }
            };
        }

        return undefined;
    }

    private parseScripts(events: any[]): { preRequestScript?: string; postResponseScript?: string } {
        if (!Array.isArray(events)) {
            return {};
        }

        let preRequestScript: string | undefined;
        let postResponseScript: string | undefined;

        for (const event of events) {
            const scriptLines = event?.script?.exec;
            if (!Array.isArray(scriptLines) || scriptLines.length === 0) {
                continue;
            }
            const script = scriptLines.join('\n');
            if (event.listen === 'prerequest') {
                preRequestScript = script;
            } else if (event.listen === 'test') {
                postResponseScript = script;
            }
        }

        return { preRequestScript, postResponseScript };
    }

    private generateId(): string {
        return generateId();
    }
}
