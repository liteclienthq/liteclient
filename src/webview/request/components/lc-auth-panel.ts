import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';
import { postMessage } from '../../shared/messaging';
import type { AuthConfig, OAuth2AuthConfig, OAuth2ClientAuthMethod } from '../../../shared/models';
export type { AuthConfig };

type OAuth2GrantTypeDisplay = 
  | 'authorization_code' 
  | 'authorization_code_pkce' 
  | 'client_credentials';

interface OAuth2TokenStatus {
  hasToken: boolean;
  expiresAt?: number;
  error?: string;
  errorType?: 'config' | 'network' | 'auth' | 'unknown';
}

@customElement('lc-auth-panel')
export class LcAuthPanel extends LcBaseElement {
  static override styles = css`
    :host {
      display: block;
      padding: 16px;
    }

    .auth-selector {
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .auth-selector label {
      font-size: 12px;
      white-space: nowrap;
    }

    .auth-selector select {
      padding: 4px 8px;
      background: transparent;
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-input-border);
      outline: none;
      border-radius: 2px;
    }

    .auth-selector select:focus {
      border-color: var(--vscode-focusBorder);
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 500px;
    }

    .form-heading {
      font-size: 14px;
      font-weight: 500;
      color: var(--vscode-foreground);
      margin-bottom: 4px;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-header {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 4px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }

    .form-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .form-group label {
      font-size: 12px;
      min-width: 130px;
      flex-shrink: 0;
      color: var(--vscode-foreground);
    }

    .form-group input,
    .form-group select {
      flex: 1;
      padding: 6px 8px;
      background: transparent;
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      outline: none;
      border-radius: 2px;
    }

    .form-group input:focus,
    .form-group select:focus {
      border-color: var(--vscode-focusBorder);
    }

    .form-group input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    .description {
      font-size: 12px;
      opacity: 0.7;
      margin-bottom: 12px;
      line-height: 1.4;
    }

    .oauth-info {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-left: 8px;
    }

    .oauth-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    .oauth-actions button {
      padding: 6px 14px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    }

    .oauth-actions button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .oauth-actions button.primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground);
    }

    .oauth-actions button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .oauth-actions button.secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .oauth-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .token-state {
      margin-top: 12px;
      border-radius: 3px;
      overflow: hidden;
    }

    .token-state-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      font-size: 12px;
    }

    .token-state.success .token-state-header {
      background: var(--vscode-inputValidation-infoBackground);
      border: 1px solid var(--vscode-inputValidation-infoBorder);
    }

    .token-state.error .token-state-header {
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
    }

    .token-state.pending .token-state-header {
      background: var(--vscode-inputValidation-warningBackground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
    }

    .token-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .token-state.success .token-indicator {
      background: var(--vscode-testing-iconPassed, #4caf50);
    }

    .token-state.error .token-indicator {
      background: var(--vscode-testing-iconFailed, #f44336);
    }

    .token-state.pending .token-indicator {
      background: var(--vscode-debugIcon-pauseForeground, #ffc107);
    }

    .token-info {
      flex: 1;
    }

    .token-label {
      font-weight: 500;
    }

    .token-expiry {
      font-size: 11px;
      opacity: 0.8;
      margin-top: 2px;
    }

    .error-details {
      padding: 10px 12px;
      font-size: 11px;
      font-family: var(--vscode-editor-font-family, monospace);
      border-top: 1px solid var(--vscode-inputValidation-errorBorder);
      background: var(--vscode-inputValidation-errorBackground);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .error-hint {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed var(--vscode-inputValidation-errorBorder);
      font-family: var(--vscode-font-family);
      font-style: italic;
      opacity: 0.9;
    }

    .inline-row {
      display: flex;
      gap: 12px;
    }

    .inline-row .form-group {
      flex: 1;
    }

    .optional-label {
      font-size: 10px;
      opacity: 0.6;
      margin-left: 4px;
      font-weight: normal;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid var(--vscode-button-foreground);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
  `;

  @property({ type: Object })
  auth: AuthConfig = { type: 'none' };

  @state()
  private tokenStatus: OAuth2TokenStatus = { hasToken: false };

  @state()
  private isAuthenticating = false;

  handleTypeChange(e: Event) {
    const type = (e.target as HTMLSelectElement).value as AuthConfig['type'];
    const newAuth: AuthConfig = { type };

    if (type === 'basic') {
      newAuth.basic = { username: '', password: '' };
    } else if (type === 'bearer') {
      newAuth.bearer = { token: '' };
    } else if (type === 'apikey') {
      newAuth.apikey = { key: '', value: '', addTo: 'header' };
    } else if (type === 'oauth2') {
      newAuth.oauth2 = {
        grantType: 'authorization_code',
        pkce: false,
        tokenUrl: '',
        clientId: '',
        clientSecret: '',
        scopes: [],
        clientAuthMethod: 'basic_header',
      };
      this.tokenStatus = { hasToken: false };
    }

    this.auth = newAuth;
    this._dispatchAuthChange();
  }

  handleFieldChange(e: Event, section: keyof AuthConfig, field: string) {
    const value = (e.target as HTMLInputElement | HTMLSelectElement).value;
    const newAuth = { ...this.auth };

    if (section === 'basic') {
      newAuth.basic = { ...(newAuth.basic || { username: '', password: '' }), [field]: value };
    } else if (section === 'bearer') {
      newAuth.bearer = { ...(newAuth.bearer || { token: '' }), [field]: value };
    } else if (section === 'apikey') {
      newAuth.apikey = { ...(newAuth.apikey || { key: '', value: '', addTo: 'header' }), [field]: value };
    } else if (section === 'oauth2') {
      this._handleOAuth2FieldChange(newAuth, field, value);
    }

    this.auth = newAuth;
    this._dispatchAuthChange();
  }

  private _handleOAuth2FieldChange(newAuth: AuthConfig, field: string, value: string) {
    const defaultOAuth2: OAuth2AuthConfig = {
      grantType: 'authorization_code',
      pkce: false,
      tokenUrl: '',
      clientId: '',
      clientSecret: '',
      scopes: [],
      clientAuthMethod: 'basic_header',
    };

    if (field === 'scopes') {
      const scopes = value.split(/[\s,]+/).filter(s => s.trim());
      newAuth.oauth2 = { ...(newAuth.oauth2 || defaultOAuth2), scopes };
    } else if (field === 'displayGrantType') {
      const displayValue = value as OAuth2GrantTypeDisplay;
      if (displayValue === 'authorization_code') {
        newAuth.oauth2 = { ...(newAuth.oauth2 || defaultOAuth2), grantType: 'authorization_code', pkce: false };
      } else if (displayValue === 'authorization_code_pkce') {
        newAuth.oauth2 = { ...(newAuth.oauth2 || defaultOAuth2), grantType: 'authorization_code', pkce: true };
      } else {
        newAuth.oauth2 = { ...(newAuth.oauth2 || defaultOAuth2), grantType: 'client_credentials' };
      }
      this.tokenStatus = { hasToken: false };
    } else {
      newAuth.oauth2 = { ...(newAuth.oauth2 || defaultOAuth2), [field]: value };
    }

    if (field !== 'displayGrantType') {
      this.tokenStatus = { hasToken: false };
    }
  }

  private _dispatchAuthChange() {
    this.dispatchEvent(new CustomEvent('auth-change', {
      detail: { auth: this.auth },
      bubbles: false,
      composed: false
    }));
  }

  private _getDisplayGrantType(): OAuth2GrantTypeDisplay {
    const oauth2 = this.auth.oauth2;
    if (!oauth2) {return 'authorization_code';}
    if (oauth2.grantType === 'authorization_code') {
      return oauth2.pkce !== false ? 'authorization_code_pkce' : 'authorization_code';
    }
    return 'client_credentials';
  }

  override render() {
    return html`
      <div class="auth-selector">
        <label>Auth Type:</label>
        <select @change=${this.handleTypeChange}>
          <option value="none" ?selected=${this.auth.type === 'none'}>No Auth</option>
          <option value="basic" ?selected=${this.auth.type === 'basic'}>Basic Auth</option>
          <option value="bearer" ?selected=${this.auth.type === 'bearer'}>Bearer Token</option>
          <option value="apikey" ?selected=${this.auth.type === 'apikey'}>API Key</option>
          <option value="oauth2" ?selected=${this.auth.type === 'oauth2'}>OAuth 2.0</option>
        </select>
        ${this.auth.type === 'oauth2' ? html`
          <span class="oauth-info">Authorization header will be automatically generated when you send the request.</span>
        ` : nothing}
      </div>

      <div class="auth-content">
        ${this._renderAuthForm()}
      </div>
    `;
  }

  private _renderAuthForm() {
    switch (this.auth.type) {
      case 'none':
        return html`<p class="description">This request does not use any authentication.</p>`;

      case 'basic':
        return html`
          <div class="auth-form">
            <div class="form-group">
              <label>Username</label>
              <input type="text" 
                .value=${this.auth.basic?.username || ''} 
                @input=${(e: Event) => this.handleFieldChange(e, 'basic', 'username')}
                placeholder="Username">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" 
                .value=${this.auth.basic?.password || ''} 
                @input=${(e: Event) => this.handleFieldChange(e, 'basic', 'password')}
                placeholder="Password">
            </div>
          </div>
        `;

      case 'bearer':
        return html`
          <div class="auth-form">
            <div class="form-group">
              <label>Token</label>
              <input type="text" 
                .value=${this.auth.bearer?.token || ''} 
                @input=${(e: Event) => this.handleFieldChange(e, 'bearer', 'token')}
                placeholder="Bearer Token">
            </div>
          </div>
        `;

      case 'apikey':
        return html`
          <div class="auth-form">
            <div class="form-group">
              <label>Key</label>
              <input type="text" 
                .value=${this.auth.apikey?.key || ''} 
                @input=${(e: Event) => this.handleFieldChange(e, 'apikey', 'key')}
                placeholder="Header or Query param name">
            </div>
            <div class="form-group">
              <label>Value</label>
              <input type="text" 
                .value=${this.auth.apikey?.value || ''} 
                @input=${(e: Event) => this.handleFieldChange(e, 'apikey', 'value')}
                placeholder="Value">
            </div>
            <div class="form-group">
              <label>Add to</label>
              <select @change=${(e: Event) => this.handleFieldChange(e, 'apikey', 'addTo')}>
                <option value="header" ?selected=${this.auth.apikey?.addTo === 'header'}>Header</option>
                <option value="query" ?selected=${this.auth.apikey?.addTo === 'query'}>Query Params</option>
              </select>
            </div>
          </div>
        `;

      case 'oauth2':
        return this._renderOAuth2Form();
    }
  }

  private _renderOAuth2Form() {
    const oauth2 = this.auth.oauth2;
    const displayGrantType = this._getDisplayGrantType();
    const isAuthCode = oauth2?.grantType === 'authorization_code';
    const isClientCredentials = oauth2?.grantType === 'client_credentials';

    return html`
      <div class="auth-form">
        <div class="form-heading">Generate New Token</div>
        
        <!-- Grant Type Section -->
        <div class="form-section">
          <div class="form-group">
            <label>Grant Type</label>
            <select @change=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'displayGrantType')}>
              <option value="authorization_code" ?selected=${displayGrantType === 'authorization_code'}>
                Authorization Code
              </option>
              <option value="authorization_code_pkce" ?selected=${displayGrantType === 'authorization_code_pkce'}>
                Authorization Code (with PKCE)
              </option>
              <option value="client_credentials" ?selected=${displayGrantType === 'client_credentials'}>
                Client Credentials
              </option>
            </select>
          </div>
        </div>

        <!-- Endpoints Section -->
        <div class="form-section">
          <div class="section-header">Endpoints</div>
          
          ${isAuthCode ? html`
            <div class="form-group">
              <label>Auth URL</label>
              <input type="text"
                .value=${oauth2?.authorizationUrl || ''}
                @input=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'authorizationUrl')}
                placeholder="Auth URL">
            </div>
          ` : nothing}

          <div class="form-group">
            <label>${isAuthCode ? 'Access Token URL' : 'Token URL'}</label>
            <input type="text"
              .value=${oauth2?.tokenUrl || ''}
              @input=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'tokenUrl')}
              placeholder="Token URL">
          </div>
        </div>

        <!-- Credentials Section -->
        <div class="form-section">
          <div class="section-header">Client Credentials</div>
          
          <div class="form-group">
            <label>Client ID</label>
            <input type="text"
              .value=${oauth2?.clientId || ''}
              @input=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'clientId')}
              placeholder="Client ID">
          </div>

          <div class="form-group">
            <label>Client Secret</label>
            <input type="password"
              .value=${oauth2?.clientSecret || ''}
              @input=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'clientSecret')}
              placeholder="Client Secret">
          </div>

          ${isClientCredentials ? html`
            <div class="form-group">
              <label>Client Authentication</label>
              <select 
                .value=${oauth2?.clientAuthMethod || 'basic_header'}
                @change=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'clientAuthMethod')}>
                <option value="basic_header" ?selected=${(oauth2?.clientAuthMethod || 'basic_header') === 'basic_header'}>Send as Basic Auth Header</option>
                <option value="body" ?selected=${oauth2?.clientAuthMethod === 'body'}>Send credentials in body</option>
              </select>
            </div>
          ` : nothing}
        </div>

        <!-- Scope & Audience Section -->
        <div class="form-section">
          <div class="section-header">Authorization</div>
          
          <div class="form-group">
            <label>Scope</label>
            <input type="text"
              .value=${oauth2?.scopes?.join(' ') || ''}
              @input=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'scopes')}
              placeholder="Scope">
          </div>

          <div class="form-group">
            <label>Audience</label>
            <input type="text"
              .value=${oauth2?.audience || ''}
              @input=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'audience')}
              placeholder="Audience">
          </div>
        </div>

        <!-- Actions & Token State -->
        <div class="form-section">
          <div class="oauth-actions">
            <button
              class="primary"
              @click=${this._handleGetToken}
              ?disabled=${this.isAuthenticating || !this._isConfigValid()}>
              ${this.isAuthenticating 
                ? html`<span class="spinner"></span>` 
                : isAuthCode ? 'Sign In' : 'Generate Token'}
            </button>
            ${this.tokenStatus.hasToken ? html`
              <button class="secondary" @click=${this._handleClearToken}>Clear Token</button>
            ` : nothing}
          </div>

          ${this._renderTokenState()}
        </div>
      </div>
    `;
  }

  private _renderTokenState() {
    if (this.isAuthenticating) {
      return html`
        <div class="token-state pending">
          <div class="token-state-header">
            <span class="token-indicator"></span>
            <div class="token-info">
              <div class="token-label">Authenticating...</div>
              <div class="token-expiry">Waiting for authorization</div>
            </div>
          </div>
        </div>
      `;
    }

    if (this.tokenStatus.error) {
      return html`
        <div class="token-state error">
          <div class="token-state-header">
            <span class="token-indicator"></span>
            <div class="token-info">
              <div class="token-label">Authentication Failed</div>
            </div>
          </div>
          <div class="error-details">
            ${this.tokenStatus.error}
            ${this._renderErrorHint(this.tokenStatus.error)}
          </div>
        </div>
      `;
    }

    if (this.tokenStatus.hasToken) {
      const expiresAt = this.tokenStatus.expiresAt;
      const now = Date.now();
      const expiresInMs = expiresAt ? expiresAt - now : null;
      const expiresInMin = expiresInMs !== null ? Math.round(expiresInMs / 1000 / 60) : null;

      let expiryText = 'Valid token';
      if (expiresInMin !== null) {
        if (expiresInMin > 60) {
          const hours = Math.round(expiresInMin / 60);
          expiryText = `Expires in ${hours} hour${hours !== 1 ? 's' : ''}`;
        } else if (expiresInMin > 0) {
          expiryText = `Expires in ${expiresInMin} minute${expiresInMin !== 1 ? 's' : ''}`;
        } else {
          expiryText = 'Token expired - will refresh on next request';
        }
      }

      return html`
        <div class="token-state success">
          <div class="token-state-header">
            <span class="token-indicator"></span>
            <div class="token-info">
              <div class="token-label">Token Acquired</div>
              <div class="token-expiry">${expiryText}</div>
            </div>
          </div>
        </div>
      `;
    }

    return nothing;
  }

  private _renderErrorHint(error: string): unknown {
    const errorLower = error.toLowerCase();
    let hint = '';

    if (errorLower.includes('audience') || errorLower.includes('bad audience')) {
      hint = 'Check that the Audience field matches what your OAuth provider expects.';
    } else if (errorLower.includes('invalid_client') || errorLower.includes('unauthorized_client')) {
      hint = 'Verify Client ID and Client Secret are correct.';
    } else if (errorLower.includes('invalid_scope') || errorLower.includes('scope')) {
      hint = 'One or more requested scopes may be invalid or not allowed.';
    } else if (errorLower.includes('invalid_grant')) {
      hint = 'Authorization code may have expired. Try signing in again.';
    } else if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
      hint = 'Authorization took too long. Try again.';
    } else if (errorLower.includes('network') || errorLower.includes('fetch')) {
      hint = 'Check your network connection and Token URL.';
    }

    if (!hint) {return nothing;}
    return html`<div class="error-hint">💡 ${hint}</div>`;
  }

  private _isConfigValid(): boolean {
    const oauth2 = this.auth.oauth2;
    if (!oauth2) {return false;}
    if (!oauth2.tokenUrl || !oauth2.clientId) {return false;}
    if (oauth2.grantType === 'authorization_code' && !oauth2.authorizationUrl) {return false;}
    return true;
  }

  private _handleGetToken() {
    if (!this.auth.oauth2) {return;}

    this.isAuthenticating = true;
    this.tokenStatus = { hasToken: false };

    postMessage({
      type: 'oauth2-get-token',
      config: this.auth.oauth2
    });
  }

  private _handleClearToken() {
    if (!this.auth.oauth2) {return;}

    this.tokenStatus = { hasToken: false };
    postMessage({
      type: 'oauth2-clear-token',
      config: this.auth.oauth2
    });
  }

  handleOAuth2TokenResult(result: { success: boolean; expiresAt?: number; error?: string }) {
    this.isAuthenticating = false;
    if (result.success) {
      this.tokenStatus = { hasToken: true, expiresAt: result.expiresAt };
    } else {
      this.tokenStatus = { 
        hasToken: false, 
        error: result.error || 'Failed to get token',
        errorType: this._classifyError(result.error)
      };
    }
  }

  private _classifyError(error?: string): OAuth2TokenStatus['errorType'] {
    if (!error) {return 'unknown';}
    const errorLower = error.toLowerCase();
    if (errorLower.includes('audience') || errorLower.includes('scope') || errorLower.includes('url')) {
      return 'config';
    }
    if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('timeout')) {
      return 'network';
    }
    if (errorLower.includes('unauthorized') || errorLower.includes('invalid_client') || errorLower.includes('invalid_grant')) {
      return 'auth';
    }
    return 'unknown';
  }
}
