import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'apikey';
  basic?: {
    username: string;
    password: string;
  };
  bearer?: {
    token: string;
  };
  apikey?: {
    key: string;
    value: string;
    addTo: 'header' | 'query';
  };
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
        background: transparent;
        color: var(--vscode-dropdown-foreground);
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
        background: transparent;
        color: var(--vscode-input-foreground);
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
    `;


  @property({ type: Object })
  auth: AuthConfig = { type: 'none' };

  handleTypeChange(e: Event) {
    const type = (e.target as HTMLSelectElement).value as AuthConfig['type'];
    const newAuth: AuthConfig = { type };

    if (type === 'basic') {
      newAuth.basic = { username: '', password: '' };
    } else if (type === 'bearer') {
      newAuth.bearer = { token: '' };
    } else if (type === 'apikey') {
      newAuth.apikey = { key: '', value: '', addTo: 'header' };
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

      default:
        return html``;
    }
  }
}
