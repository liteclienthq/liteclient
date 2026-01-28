import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';
import { postMessage } from '../../shared/messaging';
import type { AuthConfig, OAuth2GrantType } from '../../../shared/models';
export type { AuthConfig };

interface OAuth2TokenStatus {
  hasToken: boolean;
  expiresAt?: number;
  error?: string;
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

      .auth-selector select {
        padding: 4px 8px;
        background: var(--vscode-editor-background);
        color: var(--vscode-foreground);
        border: 1px solid var(--vscode-dropdown-border);
        outline: none;
        border-radius: 2px;
      }

      .auth-selector select:focus {
        border-color: var(--vscode-focusBorder);
      }

      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .form-group label {
        font-size: 11px;
        text-transform: uppercase;
        opacity: 0.8;
      }

      .form-group input, .form-group select {
        padding: 6px 8px;
        background: var(--vscode-editor-background);
        color: var(--vscode-foreground);
        border: 1px solid var(--vscode-input-border);
        outline: none;
        border-radius: 2px;
      }

      .form-group input:focus, .form-group select:focus {
        border-color: var(--vscode-focusBorder);
      }


      .description {
        font-size: 12px;
        opacity: 0.7;
        margin-bottom: 12px;
        line-height: 1.4;
      }

      .oauth-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .oauth-actions button {
        padding: 6px 12px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 2px;
        cursor: pointer;
        font-size: 12px;
      }

      .oauth-actions button:hover {
        background: var(--vscode-button-hoverBackground);
      }

      .oauth-actions button.secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }

      .oauth-actions button.secondary:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }

      .token-status {
        font-size: 11px;
        padding: 8px;
        border-radius: 2px;
        margin-top: 8px;
      }

      .token-status.success {
        background: var(--vscode-inputValidation-infoBackground);
        border: 1px solid var(--vscode-inputValidation-infoBorder);
      }

      .token-status.error {
        background: var(--vscode-inputValidation-errorBackground);
        border: 1px solid var(--vscode-inputValidation-errorBorder);
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
        grantType: 'client_credentials',
        tokenUrl: '',
        clientId: '',
        clientSecret: '',
        scopes: [],
      };
      this.tokenStatus = { hasToken: false };
    }

    this.auth = newAuth;
    this.dispatchEvent(new CustomEvent('auth-change', {
      detail: { auth: this.auth },
      bubbles: false,
      composed: false
    }));
  }


  handleFieldChange(e: Event, section: keyof AuthConfig, field: string) {
    const value = (e.target as HTMLInputElement | HTMLSelectElement).value;
    const newAuth = { ...this.auth };

    if (section === 'basic') {
      newAuth.basic = { ... (newAuth.basic || { username: '', password: '' }), [field]: value };
    } else if (section === 'bearer') {
      newAuth.bearer = { ... (newAuth.bearer || { token: '' }), [field]: value };
    } else if (section === 'apikey') {
      newAuth.apikey = { ... (newAuth.apikey || { key: '', value: '', addTo: 'header' }), [field]: value };
    } else if (section === 'oauth2') {
      const defaultOAuth2 = {
        grantType: 'client_credentials' as OAuth2GrantType,
        tokenUrl: '',
        clientId: '',
        clientSecret: '',
        scopes: [],
      };
      if (field === 'scopes') {
        const scopes = value.split(/[\s,]+/).filter(s => s.trim());
        newAuth.oauth2 = { ...(newAuth.oauth2 || defaultOAuth2), scopes };
      } else if (field === 'grantType') {
        newAuth.oauth2 = { ...(newAuth.oauth2 || defaultOAuth2), grantType: value as OAuth2GrantType };
      } else if (field === 'pkce') {
        newAuth.oauth2 = { ...(newAuth.oauth2 || defaultOAuth2), pkce: value === 'true' };
      } else {
        newAuth.oauth2 = { ...(newAuth.oauth2 || defaultOAuth2), [field]: value };
      }
      this.tokenStatus = { hasToken: false };
    }

    this.auth = newAuth;
    this.dispatchEvent(new CustomEvent('auth-change', {
      detail: { auth: this.auth },
      bubbles: false,
      composed: false
    }));
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
      </div>

      <div class="auth-content">
        ${this.renderAuthForm()}
      </div>
    `;
  }

  private renderAuthForm() {
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
        return this.renderOAuth2Form();
    }
  }

  private renderOAuth2Form() {
    const oauth2 = this.auth.oauth2;
    const isAuthCode = oauth2?.grantType === 'authorization_code';

    return html`
      <div class="auth-form">
        <div class="form-group">
          <label>Grant Type</label>
          <select @change=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'grantType')}>
            <option value="client_credentials" ?selected=${oauth2?.grantType === 'client_credentials'}>Client Credentials</option>
            <option value="authorization_code" ?selected=${oauth2?.grantType === 'authorization_code'}>Authorization Code</option>
          </select>
        </div>

        ${isAuthCode ? html`
          <div class="form-group">
            <label>Authorization URL</label>
            <input type="text"
              .value=${oauth2?.authorizationUrl || ''}
              @input=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'authorizationUrl')}
              placeholder="https://provider.com/oauth/authorize">
          </div>
        ` : ''}

        <div class="form-group">
          <label>Token URL</label>
          <input type="text"
            .value=${oauth2?.tokenUrl || ''}
            @input=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'tokenUrl')}
            placeholder="https://provider.com/oauth/token">
        </div>

        <div class="form-group">
          <label>Client ID</label>
          <input type="text"
            .value=${oauth2?.clientId || ''}
            @input=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'clientId')}
            placeholder="your-client-id">
        </div>

        <div class="form-group">
          <label>Client Secret</label>
          <input type="password"
            .value=${oauth2?.clientSecret || ''}
            @input=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'clientSecret')}
            placeholder="your-client-secret">
        </div>

        <div class="form-group">
          <label>Scopes (space or comma separated)</label>
          <input type="text"
            .value=${oauth2?.scopes?.join(' ') || ''}
            @input=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'scopes')}
            placeholder="read write openid">
        </div>

        <div class="form-group">
          <label>Audience (optional)</label>
          <input type="text"
            .value=${oauth2?.audience || ''}
            @input=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'audience')}
            placeholder="https://api.example.com">
        </div>

        ${isAuthCode ? html`
          <div class="form-group">
            <label>
              <input type="checkbox"
                ?checked=${oauth2?.pkce !== false}
                @change=${(e: Event) => this.handleFieldChange(e, 'oauth2', 'pkce')}>
              Use PKCE (recommended)
            </label>
          </div>
        ` : ''}

        <div class="oauth-actions">
          <button
            @click=${this.handleGetToken}
            ?disabled=${this.isAuthenticating || !oauth2?.tokenUrl || !oauth2?.clientId}>
            ${this.isAuthenticating ? 'Authenticating...' : isAuthCode ? 'Sign In' : 'Get Token'}
          </button>
          ${this.tokenStatus.hasToken ? html`
            <button class="secondary" @click=${this.handleClearToken}>Clear Token</button>
          ` : ''}
        </div>

        ${this.renderTokenStatus()}
      </div>
    `;
  }

  private renderTokenStatus() {
    if (this.tokenStatus.error) {
      return html`<div class="token-status error">${this.tokenStatus.error}</div>`;
    }
    if (this.tokenStatus.hasToken) {
      const expiresIn = this.tokenStatus.expiresAt
        ? Math.round((this.tokenStatus.expiresAt - Date.now()) / 1000 / 60)
        : null;
      return html`
        <div class="token-status success">
          Token acquired${expiresIn !== null ? ` (expires in ${expiresIn} min)` : ''}
        </div>
      `;
    }
    return '';
  }

  private handleGetToken() {
    if (!this.auth.oauth2) {return;}

    this.isAuthenticating = true;
    this.tokenStatus = { hasToken: false };

    postMessage({
      type: 'oauth2-get-token',
      config: this.auth.oauth2
    });
  }

  private handleClearToken() {
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
      this.tokenStatus = { hasToken: false, error: result.error || 'Failed to get token' };
    }
  }
}
