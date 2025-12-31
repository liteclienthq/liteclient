import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import { postMessage } from '../../shared/messaging.js';

@customElement('lc-url-bar')
export class LcUrlBar extends LcBaseElement {
  static styles = css`
    :host {
      display: block;
    }

    .request-header {
      display: flex;
      gap: 8px;
      align-items: stretch;
      padding: 8px 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-editor-background);
    }


    select {
      width: 110px;
      background: transparent;
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 2px;
      padding: 4px;
      outline: none;
      font-family: inherit;
    }

    select:focus {
      border-color: var(--vscode-focusBorder);
    }

    input {
      flex: 1;
      background: transparent;
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 4px 8px;
      border-radius: 2px;
      outline: none;
      font-family: inherit;
    }

    input:focus {
      border-color: var(--vscode-focusBorder);
    }

    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 4px 16px;
      border-radius: 2px;
      cursor: pointer;
      font-family: inherit;
      font-weight: 500;
      white-space: nowrap;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button.secondary {
      background: transparent;
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-secondaryBackground);
    }

    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    button.send-btn {
      width: 80px;
    }

    button.icon-button {
      width: 28px;
      height: 28px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      color: var(--vscode-foreground);
      opacity: 0.8;
      border: none;
    }


    button.icon-button:hover {
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

  private methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  connectedCallback() {
    super.connectedCallback();
    // Request environments when component is initialized
    this.requestEnvironments();
    // Set up message listener for environment updates
    this.setupMessageListener();
  }

  private setupMessageListener() {
    // Listen for environment list updates from the extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'environments-list') {
        this.environments = message.environments;
        this.selectedEnvironmentId = message.selectedEnvironmentId;
      } else if (message.type === 'set-environment') {
        this.selectedEnvironmentId = message.environmentId;
      }
    });
  }

  private requestEnvironments() {
    postMessage({ type: 'get-environments' });
  }

  private handleMethodChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.method = target.value;
    this.dispatchEvent(new CustomEvent('method-change', { detail: { method: this.method } }));
  }

  private handleUrlChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this.url = target.value;
    this.dispatchEvent(new CustomEvent('url-change', { detail: { url: this.url } }));
  }

  private handleEnvironmentChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const id = target.value || null;
    this.dispatchEvent(new CustomEvent('set-environment', {
      detail: { environmentId: id },
      bubbles: true,
      composed: true
    }));
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.emitSend();
    }
  }

  private emitSend() {
    this.dispatchEvent(new CustomEvent('send-request'));
  }

  render() {
    return html`
      <div class="request-header">
        <select @change=${this.handleMethodChange} .value=${this.method}>
          ${this.methods.map(m => html`<option value=${m} ?selected=${m === this.method}>${m}</option>`)}
        </select>

        <input
          type="text"
          .value=${this.url}
          @input=${this.handleUrlChange}
          @keydown=${this.handleKeydown}
          placeholder="https://liteclient.com/hello"
        >

        <button class="send-btn" ?disabled=${this.loading} @click=${this.emitSend}>
          ${this.loading ? 'Sending' : 'Send'}
        </button>

        <div class="env-selector">
          <select @change=${this.handleEnvironmentChange} .value=${this.selectedEnvironmentId || ''}>
            <option value="">No Environment</option>
            ${this.environments.map(env => html`
              <option value=${env.id} ?selected=${env.id === this.selectedEnvironmentId}>
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
