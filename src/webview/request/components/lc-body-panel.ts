/**
 * Request Body Panel Component
 * Postman-like request body type selector
 */

import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import { RequestBody, KeyValueRow, FormDataRow } from '../../shared/messaging.js';
import '../../shared/lc-code-editor.js';
import './lc-key-value-editor.js';
import './lc-form-data-editor.js';
import type { VariableItem } from './lc-variable-autocomplete.js';

@customElement('lc-body-panel')
export class LcBodyPanel extends LcBaseElement {
  @property({ type: Object }) body: RequestBody = { mode: 'none' };
  @property({ type: Array }) variables: VariableItem[] = [];

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
      margin-bottom: 12px;
      position: relative;
      overflow-x: auto;
    }

    .radio-group {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground);
      opacity: 0.8;
      user-select: none;
      white-space: nowrap;
    }

    .radio-option:hover {
      opacity: 1;
    }

    .radio-option:focus-visible {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
      border-radius: 2px;
    }

    .radio-option.active {
      opacity: 1;
      color: var(--vscode-focusBorder);
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
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .raw-type-select {
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 2px;
      padding: 4px 24px 4px 8px; /* Extra right padding for dropdown arrow */
      font-size: 12px;
      outline: none;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      position: relative;
    }

    .raw-type-select:focus {
      border-color: var(--vscode-focusBorder);
    }

    .raw-type-select:focus-visible {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
      border-radius: 2px;
    }

    .raw-type-select-wrapper {
      position: relative;
      display: inline-block;
    }

    .raw-type-select-wrapper::after {
      content: '';
      position: absolute;
      top: 50%;
      right: 8px;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 4px solid var(--vscode-foreground);
      pointer-events: none;
    }

    .editor-container {
      flex: 1;
      min-height: 0;
      border-radius: 2px;
    }

    .editor-container.with-border {
      border: 1px solid var(--vscode-panel-border);
    }

    .editor-wrapper {
      position: relative;
      height: 100%;
    }

    .editor-dropdown {
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 10;
    }

    .none-message {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      font-style: italic;
      padding: 20px;
      text-align: center;
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
        rawType: 'json',
        value: ''
      };
    } else if (mode === 'form-data') {
      newBody = {
        mode: 'form-data',
        rows: [{ id: crypto.randomUUID(), key: '', type: 'text' as const, value: '', active: true }]
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
      <div class="body-selector" role="radiogroup" aria-label="Request body type">
        <div class="radio-group">
          <div
            class="radio-option ${this.body.mode === 'none' ? 'active' : ''}"
            role="radio"
            aria-checked="${this.body.mode === 'none'}"
            tabindex="0"
            @click=${() => this.handleModeChange('none')}
            @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') && this.handleModeChange('none')}
          >
            <div class="radio-circle" aria-hidden="true"></div>
            <span>none</span>
          </div>
          <div
            class="radio-option ${this.body.mode === 'raw' ? 'active' : ''}"
            role="radio"
            aria-checked="${this.body.mode === 'raw'}"
            tabindex="0"
            @click=${() => this.handleModeChange('raw')}
            @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') && this.handleModeChange('raw')}
          >
            <div class="radio-circle" aria-hidden="true"></div>
            <span>raw</span>
          </div>
          <div
            class="radio-option ${this.body.mode === 'form-data' ? 'active' : ''}"
            role="radio"
            aria-checked="${this.body.mode === 'form-data'}"
            tabindex="0"
            @click=${() => this.handleModeChange('form-data')}
            @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') && this.handleModeChange('form-data')}
          >
            <div class="radio-circle" aria-hidden="true"></div>
            <span>form-data</span>
          </div>
          <div
            class="radio-option ${this.body.mode === 'x-www-form-urlencoded' ? 'active' : ''}"
            role="radio"
            aria-checked="${this.body.mode === 'x-www-form-urlencoded'}"
            tabindex="0"
            @click=${() => this.handleModeChange('x-www-form-urlencoded')}
            @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') && this.handleModeChange('x-www-form-urlencoded')}
          >
            <div class="radio-circle" aria-hidden="true"></div>
            <span>x-www-form-urlencoded</span>
          </div>
        </div>
      </div>

      <div class="editor-container ${this.body.mode === 'raw' ? 'with-border' : ''}">
        ${this.body.mode === 'none'
        ? html`<div class="none-message">This request does not have a body</div>`
        : this.body.mode === 'raw'
          ? html`
            <div class="editor-wrapper">
              <lc-code-editor
                .value=${this.body.value}
                .language=${this.getEditorLanguage(this.body.rawType)}
                @change=${this.handleValueChange}
              ></lc-code-editor>
              <div class="editor-dropdown">
                <div class="raw-type-select-wrapper">
                  <select class="raw-type-select" @change=${this.handleRawTypeChange}>
                    <option value="json" ?selected=${this.body.rawType === 'json'}>JSON</option>
                    <option value="text" ?selected=${this.body.rawType === 'text'}>Text</option>
                    <option value="javascript" ?selected=${this.body.rawType === 'javascript'}>JavaScript</option>
                    <option value="html" ?selected=${this.body.rawType === 'html'}>HTML</option>
                    <option value="xml" ?selected=${this.body.rawType === 'xml'}>XML</option>
                  </select>
                </div>
              </div>
            </div>
          `
          : this.body.mode === 'form-data'
            ? html`
              <lc-form-data-editor
                .items=${this.body.rows}
                .variables=${this.variables}
                @change=${this.handleRowsChange}
              ></lc-form-data-editor>
            `
            : html`
              <lc-key-value-editor
                .items=${this.body.rows}
                .variables=${this.variables}
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
