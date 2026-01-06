/**
 * Request Body Panel Component
 * Postman-like request body type selector
 */

import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import { RequestBody, KeyValueRow } from '../../shared/messaging.js';
import '../../shared/lc-code-editor.js';
import './lc-key-value-editor.js';

@customElement('lc-body-panel')
export class LcBodyPanel extends LcBaseElement {
  @property({ type: Object }) body: RequestBody = { mode: 'none' };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 100%;
      min-height: 0;
    }

    .body-selector {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 4px 0 12px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-bottom: 12px;
    }

    .radio-group {
      display: flex;
      gap: 12px;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      font-size: 13px;
      color: var(--vscode-foreground);
      opacity: 0.8;
      user-select: none;
    }

    .radio-option:hover {
      opacity: 1;
    }

    .radio-option.active {
      opacity: 1;
      color: var(--vscode-focusBorder);
      font-weight: 500;
    }

    .radio-input {
      display: none;
    }

    .radio-circle {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid var(--vscode-settings-checkboxBorder);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .radio-option.active .radio-circle {
      border-color: var(--vscode-focusBorder);
    }

    .radio-option.active .radio-circle::after {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--vscode-focusBorder);
    }

    .raw-type-selector {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .raw-type-select {
      background: transparent;
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-settings-dropdownBorder);
      border-radius: 2px;
      padding: 1px 4px;
      font-size: 12px;
      outline: none;
      cursor: pointer;
    }

    .raw-type-select:focus {
      border-color: var(--vscode-focusBorder);
    }

    .editor-container {
      flex: 1;
      min-height: 0;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 2px;
    }

    .none-message {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      font-style: italic;
    }
  `;

  private handleModeChange(mode: RequestBody['mode']) {
    if (mode === this.body.mode) { return; }

    let newBody: RequestBody;
    if (mode === 'none') {
      newBody = { mode: 'none' };
    } else if (mode === 'raw') {
      newBody = {
        mode: 'raw',
        rawType: 'text',
        value: ''
      };
    } else if (mode === 'form-data') {
      newBody = {
        mode: 'form-data',
        rows: [{ id: crypto.randomUUID(), key: '', value: '', active: true }]
      };
    } else {
      newBody = {
        mode: 'x-www-form-urlencoded',
        rows: [{ id: crypto.randomUUID(), key: '', value: '', active: true }]
      };
    }

    this.body = newBody;
    this.dispatchChange();
  }

  private handleRawTypeChange(e: Event) {
    if (this.body.mode !== 'raw') { return; }

    const target = e.target as HTMLSelectElement;
    const newType = target.value as any;

    this.body = {
      ...this.body,
      rawType: newType
    };
    this.dispatchChange();
  }

  private handleValueChange(e: CustomEvent) {
    if (this.body.mode !== 'raw') { return; }

    this.body = {
      ...this.body,
      value: e.detail.value
    };
    this.dispatchChange();
  }

  private handleRowsChange(e: CustomEvent) {
    if (this.body.mode !== 'form-data' && this.body.mode !== 'x-www-form-urlencoded') { return; }

    this.body = {
      ...this.body,
      rows: e.detail.items
    };
    this.dispatchChange();
  }

  private dispatchChange() {
    this.dispatchEvent(new CustomEvent('body-change', {
      detail: { body: this.body },
      bubbles: true,
      composed: true
    }));
  }

  private getEditorLanguage(rawType: string): string {
    const map: Record<string, string> = {
      'text': 'plaintext',
      'javascript': 'javascript',
      'json': 'json',
      'html': 'html',
      'xml': 'xml'
    };
    return map[rawType] || 'plaintext';
  }

  render() {
    return html`
      <div class="body-selector">
        <div class="radio-group">
          <div 
            class="radio-option ${this.body.mode === 'none' ? 'active' : ''}"
            @click=${() => this.handleModeChange('none')}
          >
            <div class="radio-circle"></div>
            <span>none</span>
          </div>
          <div 
            class="radio-option ${this.body.mode === 'raw' ? 'active' : ''}"
            @click=${() => this.handleModeChange('raw')}
          >
            <div class="radio-circle"></div>
            <span>raw</span>
          </div>
          <div 
            class="radio-option ${this.body.mode === 'form-data' ? 'active' : ''}"
            @click=${() => this.handleModeChange('form-data')}
          >
            <div class="radio-circle"></div>
            <span>form-data</span>
          </div>
          <div 
            class="radio-option ${this.body.mode === 'x-www-form-urlencoded' ? 'active' : ''}"
            @click=${() => this.handleModeChange('x-www-form-urlencoded')}
          >
            <div class="radio-circle"></div>
            <span>x-www-form-urlencoded</span>
          </div>
        </div>

        ${this.body.mode === 'raw' ? html`
          <div class="raw-type-selector">
            <select class="raw-type-select" @change=${this.handleRawTypeChange}>
              <option value="text" ?selected=${this.body.rawType === 'text'}>Text</option>
              <option value="javascript" ?selected=${this.body.rawType === 'javascript'}>JavaScript</option>
              <option value="json" ?selected=${this.body.rawType === 'json'}>JSON</option>
              <option value="html" ?selected=${this.body.rawType === 'html'}>HTML</option>
              <option value="xml" ?selected=${this.body.rawType === 'xml'}>XML</option>
            </select>
          </div>
        ` : ''}
      </div>

      <div class="editor-container">
        ${this.body.mode === 'none'
        ? html`<div class="none-message">This request does not have a body</div>`
        : this.body.mode === 'raw'
          ? html`
            <lc-code-editor
              .value=${this.body.value}
              .language=${this.getEditorLanguage(this.body.rawType)}
              @change=${this.handleValueChange}
            ></lc-code-editor>
          `
          : html`
            <lc-key-value-editor
              .items=${this.body.rows}
              @change=${this.handleRowsChange}
            ></lc-key-value-editor>
          `
      }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-body-panel': LcBodyPanel;
  }
}
