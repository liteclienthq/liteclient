const OAUTH_CALLBACK_PATH = '/oauth-callback';

export function isOAuthCallbackPath(path: string): boolean {
    const callbackPath = path.replace(/(?:%3F|\?)windowId(?:%3D|=)[^/]*$/i, '');
    return callbackPath === OAUTH_CALLBACK_PATH;
}
