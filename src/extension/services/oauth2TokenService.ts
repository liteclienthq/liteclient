import * as vscode from 'vscode';
import * as crypto from 'crypto';
import type { OAuth2AuthConfig } from '../../shared/models';

interface TokenRecord {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    tokenType: string;
    scope?: string;
}

interface PendingAuthRequest {
    codeVerifier: string;
    config: OAuth2AuthConfig;
    resolve: (code: string) => void;
    reject: (error: Error) => void;
    timeoutId: NodeJS.Timeout;
}

export class OAuth2TokenService {
    private static readonly TOKEN_PREFIX = 'liteclient.oauth2.token.';
    private static readonly AUTH_TIMEOUT = 120000;

    private secrets: vscode.SecretStorage;
    private pendingAuthRequests: Map<string, PendingAuthRequest> = new Map();
    private refreshPromises: Map<string, Promise<TokenRecord>> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.secrets = context.secrets;
    }

    async getValidAccessToken(config: OAuth2AuthConfig): Promise<string> {
        const cacheKey = this.computeCacheKey(config);
        const tokenRecord = await this.loadTokenRecord(cacheKey);

        if (tokenRecord && tokenRecord.expiresAt > Date.now() + 60000) {
            return tokenRecord.accessToken;
        }

        if (tokenRecord?.refreshToken) {
            try {
                const refreshed = await this.refreshToken(config, tokenRecord.refreshToken, cacheKey);
                return refreshed.accessToken;
            } catch {
                await this.clearToken(config);
            }
        }

        if (config.grantType === 'client_credentials') {
            const newToken = await this.requestClientCredentialsToken(config);
            await this.saveTokenRecord(cacheKey, newToken);
            return newToken.accessToken;
        }

        throw new Error('Token expired. Please sign in again.');
    }

    async requestClientCredentialsToken(config: OAuth2AuthConfig): Promise<TokenRecord> {
        if (!config.clientSecret) {
            throw new Error('Client Secret is required for Client Credentials flow');
        }

        const params = new URLSearchParams();
        params.set('grant_type', 'client_credentials');
        
        const useBasicAuth = config.clientAuthMethod === 'basic_header';
        
        if (!useBasicAuth) {
            params.set('client_id', config.clientId);
            params.set('client_secret', config.clientSecret);
        }
        
        if (config.scopes?.length) {
            params.set('scope', config.scopes.join(' '));
        }
        if (config.audience) {
            params.set('audience', config.audience);
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        
        if (useBasicAuth) {
            const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
        }

        const response = await fetch(config.tokenUrl, {
            method: 'POST',
            headers,
            body: params.toString(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Token request failed: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error_description || errorJson.error || errorMessage;
            } catch {
                if (errorText) {
                    errorMessage = errorText;
                }
            }
            throw new Error(errorMessage);
        }

        const data = await response.json() as Record<string, unknown>;
        return this.parseTokenResponse(data);
    }

    async startAuthorizationCodeFlow(config: OAuth2AuthConfig): Promise<TokenRecord> {
        if (!config.authorizationUrl) {
            throw new Error('Authorization URL is required for Authorization Code flow');
        }

        const state = this.generateRandomString(32);
        const codeVerifier = config.pkce !== false ? this.generateRandomString(64) : undefined;
        const codeChallenge = codeVerifier ? await this.generateCodeChallenge(codeVerifier) : undefined;

        const authUrl = new URL(config.authorizationUrl);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', config.clientId);
        authUrl.searchParams.set('state', state);

        const redirectUri = await this.getRedirectUri();
        authUrl.searchParams.set('redirect_uri', redirectUri);

        if (config.scopes?.length) {
            authUrl.searchParams.set('scope', config.scopes.join(' '));
        }
        if (config.audience) {
            authUrl.searchParams.set('audience', config.audience);
        }
        if (codeChallenge) {
            authUrl.searchParams.set('code_challenge', codeChallenge);
            authUrl.searchParams.set('code_challenge_method', 'S256');
        }

        const codePromise = new Promise<string>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pendingAuthRequests.delete(state);
                reject(new Error('Authorization timed out'));
            }, OAuth2TokenService.AUTH_TIMEOUT);

            this.pendingAuthRequests.set(state, {
                codeVerifier: codeVerifier || '',
                config,
                resolve,
                reject,
                timeoutId,
            });
        });

        await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));

        const code = await codePromise;
        return this.exchangeCodeForToken(config, code, codeVerifier);
    }

    async handleAuthCallback(uri: vscode.Uri): Promise<void> {
        const params = new URLSearchParams(uri.query);
        const state = params.get('state');
        const code = params.get('code');
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        if (!state) {
            vscode.window.showErrorMessage('OAuth callback missing state parameter');
            return;
        }

        const pending = this.pendingAuthRequests.get(state);
        if (!pending) {
            vscode.window.showErrorMessage('OAuth callback received but no pending auth request found');
            return;
        }

        clearTimeout(pending.timeoutId);
        this.pendingAuthRequests.delete(state);

        if (error) {
            pending.reject(new Error(errorDescription || error));
            return;
        }

        if (!code) {
            pending.reject(new Error('No authorization code received'));
            return;
        }

        pending.resolve(code);
    }

    private async exchangeCodeForToken(
        config: OAuth2AuthConfig,
        code: string,
        codeVerifier?: string
    ): Promise<TokenRecord> {
        const params = new URLSearchParams();
        params.set('grant_type', 'authorization_code');
        params.set('code', code);
        params.set('client_id', config.clientId);
        params.set('redirect_uri', await this.getRedirectUri());

        if (config.clientSecret) {
            params.set('client_secret', config.clientSecret);
        }
        if (codeVerifier) {
            params.set('code_verifier', codeVerifier);
        }

        const response = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Token exchange failed: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error_description || errorJson.error || errorMessage;
            } catch {
                if (errorText) {
                    errorMessage = errorText;
                }
            }
            throw new Error(errorMessage);
        }

        const data = await response.json() as Record<string, unknown>;
        const tokenRecord = this.parseTokenResponse(data);

        const cacheKey = this.computeCacheKey(config);
        await this.saveTokenRecord(cacheKey, tokenRecord);

        return tokenRecord;
    }

    private async refreshToken(
        config: OAuth2AuthConfig,
        refreshToken: string,
        cacheKey: string
    ): Promise<TokenRecord> {
        const existingPromise = this.refreshPromises.get(cacheKey);
        if (existingPromise) {
            return existingPromise;
        }

        const refreshPromise = (async () => {
            try {
                const params = new URLSearchParams();
                params.set('grant_type', 'refresh_token');
                params.set('refresh_token', refreshToken);
                params.set('client_id', config.clientId);
                if (config.clientSecret) {
                    params.set('client_secret', config.clientSecret);
                }

                const response = await fetch(config.tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: params.toString(),
                });

                if (!response.ok) {
                    throw new Error('Failed to refresh token');
                }

                const data = await response.json() as Record<string, unknown>;
                const tokenRecord = this.parseTokenResponse(data);

                if (!tokenRecord.refreshToken) {
                    tokenRecord.refreshToken = refreshToken;
                }

                await this.saveTokenRecord(cacheKey, tokenRecord);
                return tokenRecord;
            } finally {
                this.refreshPromises.delete(cacheKey);
            }
        })();

        this.refreshPromises.set(cacheKey, refreshPromise);
        return refreshPromise;
    }

    async clearToken(config: OAuth2AuthConfig): Promise<void> {
        const cacheKey = this.computeCacheKey(config);
        await this.secrets.delete(OAuth2TokenService.TOKEN_PREFIX + cacheKey);
    }

    async getTokenStatus(config: OAuth2AuthConfig): Promise<{ hasToken: boolean; expiresAt?: number }> {
        const cacheKey = this.computeCacheKey(config);
        const tokenRecord = await this.loadTokenRecord(cacheKey);
        if (tokenRecord) {
            return { hasToken: true, expiresAt: tokenRecord.expiresAt };
        }
        return { hasToken: false };
    }

    private parseTokenResponse(data: Record<string, unknown>): TokenRecord {
        const accessToken = data.access_token as string;
        if (!accessToken) {
            throw new Error('No access token in response');
        }

        const expiresIn = (data.expires_in as number) || 3600;
        const expiresAt = Date.now() + expiresIn * 1000;

        return {
            accessToken,
            refreshToken: data.refresh_token as string | undefined,
            expiresAt,
            tokenType: (data.token_type as string) || 'Bearer',
            scope: data.scope as string | undefined,
        };
    }

    private computeCacheKey(config: OAuth2AuthConfig): string {
        const parts = [
            config.tokenUrl,
            config.clientId,
            (config.scopes || []).sort().join(' '),
            config.audience || '',
        ];
        return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
    }

    private async loadTokenRecord(cacheKey: string): Promise<TokenRecord | null> {
        const stored = await this.secrets.get(OAuth2TokenService.TOKEN_PREFIX + cacheKey);
        if (!stored) {return null;}
        try {
            return JSON.parse(stored) as TokenRecord;
        } catch {
            return null;
        }
    }

    private async saveTokenRecord(cacheKey: string, record: TokenRecord): Promise<void> {
        await this.secrets.store(OAuth2TokenService.TOKEN_PREFIX + cacheKey, JSON.stringify(record));
    }

    private async getRedirectUri(): Promise<string> {
        const uri = await vscode.env.asExternalUri(
            vscode.Uri.parse(`${vscode.env.uriScheme}://liteclient.liteclient/oauth-callback`)
        );
        return uri.toString();
    }

    private generateRandomString(length: number): string {
        const bytes = crypto.randomBytes(length);
        return bytes.toString('base64url').slice(0, length);
    }

    private async generateCodeChallenge(verifier: string): Promise<string> {
        const hash = crypto.createHash('sha256').update(verifier).digest();
        return hash.toString('base64url');
    }
}
