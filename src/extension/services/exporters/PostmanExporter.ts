import { Exporter } from './Exporter';
import { Collection, CollectionItem, RequestItem } from '../collectionService';
import { AuthConfig, RequestBody } from '../../../shared/models';
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

        const body = this.convertBody(item.body);

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

    private convertBody(body: RequestBody | undefined): any {
        if (!body || body.mode === 'none') {
            return { mode: 'none' };
        }

        if (body.mode === 'raw') {
            return {
                mode: 'raw',
                raw: body.value || '',
                options: {
                    raw: {
                        language: body.rawType || 'text'
                    }
                }
            };
        }

        if (body.mode === 'form-data') {
            return {
                mode: 'formdata',
                formdata: (body.rows || []).map((r: any) => ({
                    key: r.key,
                    value: r.type === 'file' ? '' : r.value,
                    type: r.type === 'file' ? 'file' : 'text',
                    disabled: !r.active
                }))
            };
        }

        if (body.mode === 'x-www-form-urlencoded') {
            return {
                mode: 'urlencoded',
                urlencoded: (body.rows || []).map((r: any) => ({
                    key: r.key,
                    value: r.value,
                    type: 'text',
                    disabled: !r.active
                }))
            };
        }

        return { mode: 'none' };
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
