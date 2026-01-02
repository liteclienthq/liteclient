import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import { postMessage } from '../../shared/messaging.js';

@customElement('lc-url-bar')
export class LcUrlBar extends LcBaseElement {
  static styles = css`
    :host {
      display: block;
    }

    .url-bar-container {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-editor-background);
      height: 32px;
    }

    .method-selector {
      flex-shrink: 0;
    }

    .url-input {
      flex: 1;
      display: flex;
      min-width: 0;
    }

    select {
      width: 100px;
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 2px;
      padding: 3px 6px;
      outline: none;
      font-size: 13px;
    }

    select:focus {
      border-color: var(--vscode-focusBorder);
    }

    input {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 4px 8px;
      border-radius: 2px;
      outline: none;
      font-size: 13px;
    }

    input:focus {
      border-color: var(--vscode-focusBorder);
    }

    .send-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 4px 14px;
      border-radius: 2px;
      cursor: pointer;
      font-weight: normal;
      font-size: 13px;
      flex-shrink: 0;
    }

    .send-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .icon-button {
      width: 26px;
      height: 26px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      color: var(--vscode-foreground);
      opacity: 0.8;
      border: none;
      cursor: pointer;
      flex-shrink: 0;
    }

    .icon-button:hover {
      background: var(--vscode-toolbar-hoverBackground);
      opacity: 1;
    }

    .env-selector {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 4px;
    }

    .env-selector select {
      width: auto;
      min-width: 120px;
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      padding: 4px 8px;
      border-radius: 2px;
      outline: none;
      font-family: inherit;
      font-size: 12px;
    }

    .env-selector select:focus {
      border-color: var(--vscode-focusBorder);
    }
  `;

  @property({ type: String }) method = 'GET';
  @property({ type: String }) url = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: Array }) environments: Array<{ id: string; name: string }> = [];
  @property({ type: String }) selectedEnvironmentId: string | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.requestEnvironments();
    this.setupMessageListener();
  }

  private setupMessageListener() {
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'environments-list') {
        this.environments = message.environments;
        this.selectedEnvironmentId = message.selectedEnvironmentId;
      }
    });
  }

  private requestEnvironments() {
    postMessage({ type: 'get-environments' });
  }

  private handleEnvChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.dispatchEvent(new CustomEvent('set-environment', {
      detail: { environmentId: select.value || null },
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    return html`
      <div class="url-bar-container">
        <div class="method-selector">
          <select @change=${(e: Event) => this.dispatchEvent(new CustomEvent('method-change', { detail: { method: (e.target as HTMLSelectElement).value } }))}>
            ${['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => html`
              <option value=${m} ?selected=${this.method === m}>${m}</option>
            `)}
          </select>
        </div>
        <div class="url-input">
          <input 
            type="text" 
            .value=${this.url} 
            @input=${(e: Event) => this.dispatchEvent(new CustomEvent('url-change', { detail: { url: (e.target as HTMLInputElement).value } }))}
            @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') { this.dispatchEvent(new CustomEvent('send-request')); } }}
            placeholder="Enter URL or paste text"
          />
        </div>
        <button class="send-btn" @click=${() => this.dispatchEvent(new CustomEvent('send-request'))}>
          Send
        </button>

        <div class="env-selector" title="Select environment">
          <select @change=${this.handleEnvChange} .value=${this.selectedEnvironmentId || ''}>
            <option value="">No Environment</option>
            ${this.environments.filter(env => env.id !== 'globals').map(env => html`
              <option value=${env.id} ?selected=${this.selectedEnvironmentId === env.id}>
                ${env.name}
              </option>
            `)}
          </select>
        </div>

        <button class="secondary icon-button" @click=${() => this.dispatchEvent(new CustomEvent('layout-toggle'))} title="Toggle Layout">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9zM2 4v8h12V4H2zm6 0v8h1V4H8z"/>
          </svg>
        </button>
      </div>
    `;
  }

}
