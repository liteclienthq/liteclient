import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import './lc-tabs.js';
import './lc-key-value-editor.js';
import './lc-auth-panel.js';
import type { KeyValueItem } from './lc-key-value-editor.js';
import type { AuthConfig } from '../../shared/messaging.js';


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
  @property({ type: String }) body = '';
  @property({ type: Object }) auth: AuthConfig = { type: 'none' };

  @state() private activeTab = 'params';


  private tabs = [
    { id: 'params', label: 'Params' },
    { id: 'auth', label: 'Auth' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' }
  ];

  private handleTabChange(e: CustomEvent) {
    this.activeTab = e.detail.tabId;
  }

  private handleBodyChange(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.body = target.value;
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
            @change=${this.handleHeadersChange}
          ></lc-key-value-editor>
        </div>

        <div class="tab-content ${this.activeTab === 'body' ? 'active' : ''}">
           <textarea
             class="body-editor"
             .value=${this.body}
             @input=${this.handleBodyChange}
             placeholder="Request body (JSON, Text, etc.)"
           ></textarea>
        </div>
      </div>
    `;
  }
}
