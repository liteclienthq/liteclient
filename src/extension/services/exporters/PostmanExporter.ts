import { Exporter } from './Exporter';
import { Collection, CollectionItem, RequestItem } from '../collectionService';
import { AuthConfig } from '../httpRequestService';
import { generateId } from '../../utils/idUtils';

export class PostmanExporter implements Exporter {
    id = 'postman-v2.1';
    name = 'Postman Collection v2.1';
    description = 'Exports to Postman Collection v2.1 format';

    async export(collection: Collection): Promise<string> {
        const postmanCollection = {
            info: {
                _postman_id: collection.id,
                name: collection.name,
                description: collection.description || '',
                schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
            },
            item: collection.items.map(item => this.convertItem(item))
        };

        return JSON.stringify(postmanCollection, null, 2);
    }

    private convertItem(item: CollectionItem): any {
        if (item.type === 'folder') {
            return {
                name: item.name,
                description: item.description,
                item: item.items.map(child => this.convertItem(child))
            };
        } else if (item.type === 'request') {
            return {
                name: item.name,
                request: this.convertRequest(item as RequestItem),
                response: []
            };
        }
    }

    private convertRequest(item: RequestItem): any {
        const url = this.parseUrl(item.url);

        // Use bodyStruct if available, otherwise fallback to basic body string (assumed raw)
        const body = item.bodyStruct ? this.convertBodyStruct(item.bodyStruct) : this.convertLegacyBody(item.body);

        return {
            method: item.method,
            header: Object.entries(item.headers).map(([key, value]) => ({
                key,
                value,
                type: 'text'
            })),
            url: {
                raw: item.url,
                protocol: url.protocol,
                host: url.host?.split('.'),
                path: url.path?.split('/'),
                port: url.port,
                query: item.params ? Object.entries(item.params).map(([key, value]) => ({ key, value })) : []
            },
            body: body,
            auth: this.convertAuth(item.auth),
            description: item.description
        };
    }

    private convertAuth(auth: AuthConfig | undefined): any {
        if (!auth || auth.type === 'none') {
            return undefined;
        }

        const type = auth.type;
        const result: any = { type };

        if (type === 'basic' && auth.basic) {
            result.basic = [
                { key: 'username', value: auth.basic.username, type: 'string' },
                { key: 'password', value: auth.basic.password, type: 'string' }
            ];
        } else if (type === 'bearer' && auth.bearer) {
            result.bearer = [
                { key: 'token', value: auth.bearer.token, type: 'string' }
            ];
        } else if (type === 'apikey' && auth.apikey) {
            result.apikey = [
                { key: 'key', value: auth.apikey.key, type: 'string' },
                { key: 'value', value: auth.apikey.value, type: 'string' },
                { key: 'in', value: auth.apikey.addTo, type: 'string' }
            ];
        }

        return result;
    }

    private convertBodyStruct(bodyStruct: any): any {
        const mode = bodyStruct.mode;
        const result: any = { mode };

        if (mode === 'raw') {
            result.raw = bodyStruct.raw || '';
        } else if (mode === 'formdata') {
            result.formdata = bodyStruct.formdata;
        } else if (mode === 'urlencoded') {
            result.urlencoded = bodyStruct.urlencoded;
        }
        return result;
    }

    private convertLegacyBody(bodyStr: string | null): any {
        if (!bodyStr) { return { mode: 'none' }; }
        return {
            mode: 'raw',
            raw: bodyStr
        };
    }

    private parseUrl(urlStr: string) {
        try {
            // handle simple cases without protocol
            if (!urlStr.match(/^https?:\/\//)) {
                urlStr = 'http://' + urlStr;
            }
            const url = new URL(urlStr);
            return {
                protocol: url.protocol.replace(':', ''),
                host: url.hostname,
                port: url.port,
                path: url.pathname.substring(1) // remove leading slash
            };
        } catch (e) {
            return { protocol: 'http', host: '', port: '', path: '' };
        }
    }

    private generateId(): string {
        return generateId();
    }
}
