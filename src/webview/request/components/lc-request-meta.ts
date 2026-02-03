import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import './lc-tabs.js';
import './lc-key-value-editor.js';
import './lc-auth-panel.js';
import './lc-body-panel.js';
import type { KeyValueItem } from './lc-key-value-editor.js';
import type { AuthConfig, RequestBody } from '../../shared/messaging.js';
import type { VariableItem } from './lc-variable-autocomplete.js';
import type { Environment } from '../../../shared/models.js';


@customElement('lc-request-meta')
export class LcRequestMeta extends LcBaseElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 200px;
    }

    .tabs-container {
      margin-bottom: 8px;
    }


    .content-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding-bottom: 12px;
    }


    .tab-content {
      display: none;
      flex: 1;
      min-height: 0;
    }

    .tab-content.active {
      display: flex;
      flex-direction: column;
    }




    .body-editor {
      flex: 1;
      width: 100%;
      min-height: 200px;
      resize: none;
      background: transparent;
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 8px;
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      box-sizing: border-box;
      outline: none;
      border-radius: 2px;
    }

    .body-editor:focus {
      border-color: var(--vscode-focusBorder);
    }

  `;

  @property({ type: Array }) params: KeyValueItem[] = [];
  @property({ type: Array }) headers: KeyValueItem[] = [];
  @property({ type: Object }) body: RequestBody = { mode: 'none' };
  @property({ type: Object }) auth: AuthConfig = { type: 'none' };
  @property({ type: Array }) environments: Environment[] = [];
  @property({ type: String }) selectedEnvironmentId: string | null = null;

  @state() private activeTab = 'params';

  private get variableItems(): VariableItem[] {
    const items: VariableItem[] = [];
    
    const globals = this.environments.find(env => env.id === 'globals');
    if (globals?.variables) {
      for (const [name, value] of Object.entries(globals.variables)) {
        items.push({ name, value, type: 'global' });
      }
    }

    if (this.selectedEnvironmentId) {
      const selectedEnv = this.environments.find(env => env.id === this.selectedEnvironmentId);
      if (selectedEnv?.variables) {
        for (const [name, value] of Object.entries(selectedEnv.variables)) {
          items.push({ name, value, type: 'environment' });
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


  private tabs = [
    { id: 'params', label: 'Params' },
    { id: 'auth', label: 'Auth' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' }
  ];

  private handleTabChange(e: CustomEvent) {
    this.activeTab = e.detail.tabId;
  }

  private handleBodyChange(e: CustomEvent) {
    this.body = e.detail.body;
    this.dispatchEvent(new CustomEvent('body-change', { detail: { body: this.body } }));
  }

  private handleParamsChange(e: CustomEvent) {
    this.params = e.detail.items;
    this.dispatchEvent(new CustomEvent('params-change', { detail: { items: this.params } }));
  }

  private handleHeadersChange(e: CustomEvent) {
    this.headers = e.detail.items;
    this.dispatchEvent(new CustomEvent('headers-change', { detail: { items: this.headers } }));
  }

  render() {
    return html`
      <div class="tabs-container">
        <lc-tabs 
          .tabs=${this.tabs} 
          activeTab=${this.activeTab} 
          @tab-change=${this.handleTabChange}
        ></lc-tabs>
      </div>

      <div class="content-container">
        <div class="tab-content ${this.activeTab === 'params' ? 'active' : ''}">
          <lc-key-value-editor 
            .items=${this.params}
            .variables=${this.variableItems}
            @change=${this.handleParamsChange}
          ></lc-key-value-editor>
        </div>

        <div class="tab-content ${this.activeTab === 'auth' ? 'active' : ''}">
           <lc-auth-panel 
            .auth=${this.auth}
            @auth-change=${(e: CustomEvent) => {
        this.auth = e.detail.auth;
        this.dispatchEvent(new CustomEvent('auth-change', { detail: { auth: this.auth } }));
      }}
           ></lc-auth-panel>

        </div>


        <div class="tab-content ${this.activeTab === 'headers' ? 'active' : ''}">
          <lc-key-value-editor 
            .items=${this.headers}
            .variables=${this.variableItems}
            @change=${this.handleHeadersChange}
          ></lc-key-value-editor>
        </div>

        <div class="tab-content ${this.activeTab === 'body' ? 'active' : ''}">
           <lc-body-panel
             .body=${this.body}
             .variables=${this.variableItems}
             @body-change=${this.handleBodyChange}
           ></lc-body-panel>
        </div>
      </div>
    `;
  }
}
