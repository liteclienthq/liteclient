import * as assert from 'assert';
import { isOAuthCallbackPath } from '../extension/utils/oauthCallback';

suite('OAuth callback path', () => {
    test('accepts the callback path without a VS Code window ID', () => {
        assert.strictEqual(isOAuthCallbackPath('/oauth-callback'), true);
    });

    test('accepts encoded and decoded VS Code window ID suffixes', () => {
        assert.strictEqual(isOAuthCallbackPath('/oauth-callback?windowId=3'), true);
        assert.strictEqual(isOAuthCallbackPath('/oauth-callback%3FwindowId%3D3'), true);
    });

    test('rejects unrelated paths and extra path segments', () => {
        assert.strictEqual(isOAuthCallbackPath('/other-path'), false);
        assert.strictEqual(isOAuthCallbackPath('/oauth-callback/other'), false);
        assert.strictEqual(isOAuthCallbackPath('/oauth-callback-extra'), false);
    });
});
