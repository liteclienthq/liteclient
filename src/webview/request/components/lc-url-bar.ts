import { html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import { postMessage } from '../../shared/messaging.js';
import type { Environment } from '../../../shared/models.js';
import './lc-variable-autocomplete.js';
import type { LcVariableAutocomplete, VariableItem } from './lc-variable-autocomplete.js';

@customElement('lc-url-bar')
export class LcUrlBar extends LcBaseElement {
  static styles = css`
    :host {
      display: block;
    }

    .url-bar-container {
      display: flex;
      gap: 8px;
      align-items: stretch;
      padding: 20px 15px 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-editor-background);
      height: auto;
    }

    .url-input-section {
      flex: 1;
      display: flex;
      min-width: 0;
    }

    .method-selector {
      flex-shrink: 0;
      display: flex;
      align-items: stretch;
      position: relative;
    }

    .url-input {
      flex: 1;
      display: flex;
      min-width: 0;
    }

    .select-wrapper {
      position: relative;
      display: inline-block;
      width: 100%;
      height: 100%;
    }

    select {
      width: 100%;
      height: 100%;
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-right: 1px solid var(--vscode-dropdown-border);
      border-radius: 2px 0 0 2px;
      padding: 8px 24px 8px 8px; /* Extra right padding to accommodate the dropdown arrow */
      outline: none;
      font-size: 13px;
      box-sizing: border-box;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      cursor: pointer;
    }

    select:focus {
      border-color: var(--vscode-focusBorder);
      z-index: 1;
    }

    select::-ms-expand {
      display: none; /* Hide the default dropdown arrow in IE/Edge */
    }

    .select-arrow {
      position: absolute;
      top: 50%;
      right: 8px;
      transform: translateY(-50%);
      pointer-events: none;
      width: 10px;
      height: 10px;
      fill: var(--vscode-foreground);
    }

    input {
      width: 100%;
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      padding: 10px 12px;
      outline: none;
      font-size: 14px;
      height: 100%;
      box-sizing: border-box;
      line-height: 1.4;
    }

    input:focus {
      border-color: var(--vscode-focusBorder);
      z-index: 1;
    }

    .send-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-left: 1px solid var(--vscode-dropdown-border);
      padding: 8px 20px;
      border-radius: 0 2px 2px 0;
      cursor: pointer;
      font-weight: normal;
      font-size: 13px;
      flex-shrink: 0;
      height: 100%;
      box-sizing: border-box;
    }

    .send-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .right-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon-button {
      width: 32px;
      height: 32px;
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

    .icon-button svg {
      width: 16px;
      height: 16px;
      margin: auto;
      transform: scale(1.5);
      transform-origin: center;
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
      position: relative;
      width: 150px; /* Fixed width to prevent resizing with long environment names */
    }

    .env-select-wrapper {
      position: relative;
      display: inline-block;
      width: 100%;
      height: 100%;
    }

    .env-selector select {
      width: 100%;
      height: 100%;
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      padding: 5px 24px 5px 8px; /* Extra right padding to accommodate the dropdown arrow */
      border-radius: 2px;
      outline: none;
      font-family: inherit;
      font-size: 13px;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      cursor: pointer;
      min-width: 0; /* Allow the select to shrink within its container */
    }

    .env-selector select:focus {
      border-color: var(--vscode-focusBorder);
    }

    .env-select-arrow {
      position: absolute;
      top: 50%;
      right: 8px;
      transform: translateY(-50%);
      pointer-events: none;
      width: 10px;
      height: 10px;
      fill: var(--vscode-foreground);
    }

    .url-input-wrapper {
      position: relative;
      flex: 1;
      display: flex;
      min-width: 0;
    }

    lc-variable-autocomplete {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
    }
  `;

  @property({ type: String }) method = 'GET';
  @property({ type: String }) url = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: Array }) environments: Environment[] = [];
  @property({ type: String }) selectedEnvironmentId: string | null = null;

  @state() private showAutocomplete = false;
  @state() private autocompleteFilter = '';
  @state() private triggerStartPosition = -1;

  @query('lc-variable-autocomplete') private autocompleteEl?: LcVariableAutocomplete;
  @query('.url-input-wrapper input') private urlInput?: HTMLInputElement;

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

  private get variableItems(): VariableItem[] {
    const items: VariableItem[] = [];
    
    const globals = this.environments.find(env => env.id === 'globals');
    if (globals?.variables) {
      for (const v of globals.variables) {
        if (v.enabled) {
          const displayValue = v.type === 'secret' ? '••••••••' : (v.currentValue ?? v.initialValue);
            items.push({ name: v.name, value: displayValue, type: 'global' });
        }
      }
    }

    if (this.selectedEnvironmentId) {
      const selectedEnv = this.environments.find(env => env.id === this.selectedEnvironmentId);
      if (selectedEnv?.variables) {
        for (const v of selectedEnv.variables) {
          if (v.enabled) {
            const displayValue = v.type === 'secret' ? '••••••••' : (v.currentValue ?? v.initialValue);
            items.push({ name: v.name, value: displayValue, type: 'environment' });
          }
        }
      }
    }

    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'environment' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return items;
  }

  private handleUrlInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const value = input.value;
    const cursorPos = input.selectionStart || 0;

    this.dispatchEvent(new CustomEvent('url-change', { detail: { url: value } }));

    const textBeforeCursor = value.substring(0, cursorPos);
    const triggerMatch = textBeforeCursor.match(/\{\{([^{}]*)$/);

    if (triggerMatch) {
      this.showAutocomplete = true;
      this.triggerStartPosition = cursorPos - triggerMatch[1].length - 2;
      this.autocompleteFilter = triggerMatch[1];
    } else {
      this.showAutocomplete = false;
      this.triggerStartPosition = -1;
      this.autocompleteFilter = '';
    }
  }

  private handleUrlKeydown(e: KeyboardEvent) {
    if (this.showAutocomplete && this.autocompleteEl) {
      const handled = this.autocompleteEl.handleKeyDown(e);
      if (handled) {return;}
    }

    if (e.key === 'Enter') {
      this.dispatchEvent(new CustomEvent('send-request'));
    }
  }

  private handleVariableSelect(e: CustomEvent<{ variable: VariableItem }>) {
    const { variable } = e.detail;
    const input = this.urlInput;
    if (!input) {return;}

    const beforeTrigger = this.url.substring(0, this.triggerStartPosition);
    const cursorPos = input.selectionStart || 0;
    const afterCursor = this.url.substring(cursorPos);

    const newUrl = `${beforeTrigger}{{${variable.name}}}${afterCursor}`;
    this.dispatchEvent(new CustomEvent('url-change', { detail: { url: newUrl } }));

    this.showAutocomplete = false;
    this.triggerStartPosition = -1;
    this.autocompleteFilter = '';

    requestAnimationFrame(() => {
      if (input) {
        const newCursorPos = beforeTrigger.length + variable.name.length + 4;
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }

  private handleAutocompleteClose() {
    this.showAutocomplete = false;
    this.triggerStartPosition = -1;
    this.autocompleteFilter = '';
  }

  override render() {
    return html`
      <div class="url-bar-container">
        <div class="url-input-section">
          <div class="method-selector">
            <div class="select-wrapper">
              <select @change=${(e: Event) => this.dispatchEvent(new CustomEvent('method-change', { detail: { method: (e.target as HTMLSelectElement).value } }))}>
                ${['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => html`
                  <option value=${m} ?selected=${this.method === m}>${m}</option>
                `)}
              </select>
              <svg class="select-arrow" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 3l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" />
              </svg>
            </div>
          </div>
          <div class="url-input-wrapper">
            <input
              type="text"
              .value=${this.url}
              @input=${this.handleUrlInput}
              @keydown=${this.handleUrlKeydown}
              @blur=${() => setTimeout(() => this.handleAutocompleteClose(), 150)}
              placeholder="Enter URL or paste text"
            />
            <lc-variable-autocomplete
              .variables=${this.variableItems}
              .filter=${this.autocompleteFilter}
              .visible=${this.showAutocomplete}
              @select=${this.handleVariableSelect}
              @close=${this.handleAutocompleteClose}
            ></lc-variable-autocomplete>
          </div>
          <button class="send-btn" @click=${() => this.dispatchEvent(new CustomEvent('send-request'))}>
            Send
          </button>
        </div>

        <div class="right-section">
          <button class="icon-button" @click=${() => this.dispatchEvent(new CustomEvent('save-request'))} title="Save to Collection (Ctrl+S)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="M12.5 14.5h-9a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h7l3 3v9a1 1 0 0 1-1 1z"/>
              <path d="M10.5 1.5v3h-5v-3"/>
              <path d="M5 8.5h6M5 11h4"/>
            </svg>
          </button>
          <div class="env-selector" title="Select environment">
            <div class="env-select-wrapper">
              <select @change=${this.handleEnvChange} .value=${this.selectedEnvironmentId || ''}>
                <option value="">No Environment</option>
                ${this.environments.filter(env => env.id !== 'globals').map(env => html`
                  <option value=${env.id} ?selected=${this.selectedEnvironmentId === env.id}>
                    ${env.name}
                  </option>
                `)}
              </select>
              <svg class="env-select-arrow" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 3l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" />
              </svg>
            </div>
          </div>

          <button class="secondary icon-button" @click=${() => this.dispatchEvent(new CustomEvent('layout-toggle'))} title="Toggle Layout">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1">
              <rect x="2" y="3" width="5" height="5" rx="0.5" fill="none"/>
              <rect x="9" y="3" width="5" height="5" rx="0.5" fill="none"/>
              <rect x="2" y="10" width="12" height="3" rx="0.5" fill="none"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

}
