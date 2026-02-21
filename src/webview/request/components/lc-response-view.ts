/**
 * Response View Component
 * Displays formatted response body with syntax highlighting
 */

import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import { html_beautify } from 'js-beautify';
import '../../shared/lc-code-editor.js';

@customElement('lc-response-view')
export class LcResponseView extends LcBaseElement {
  @property({ type: String }) body = '';
  @property({ type: String }) contentType = 'text/plain';
  @property({ type: Boolean }) loading = false;

  @state() private formattedBody = '';

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .response-view {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    lc-code-editor {
      flex: 1;
    }

    .placeholder {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      padding: 12px;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--vscode-editor-background);
      opacity: 0.9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      z-index: 10;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--vscode-foreground);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .cancel-btn {
      padding: 6px 16px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 2px;
      font-size: 12px;
      cursor: pointer;
      margin-top: 4px;
    }

    .cancel-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .toolbar-floating {
      position: absolute;
      top: 8px;
      right: 16px;
      z-index: 5;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-editorWidget-border, var(--vscode-contrastBorder, transparent));
      border-radius: 2px;
      font-size: 11px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .toolbar-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
  `;

  private get language(): string {
    if (!this.body) { return 'plaintext'; }

    if (this.contentType.includes('json') || this.body.trim().startsWith('{') || this.body.trim().startsWith('[')) {
      return 'json';
    }

    if (this.contentType.includes('xml') || this.contentType.includes('html')) {
      return 'html';
    }

    if (this.contentType.includes('yaml') || this.contentType.includes('yml')) {
      return 'yaml';
    }

    return 'plaintext';
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('body') || changedProperties.has('contentType')) {
      this.formattedBody = this.formatBody(this.body);
    }
  }

  private formatBody(text: string): string {
    if (!text) { return text; }

    const lang = this.language;

    if (lang === 'json') {
      try {
        return JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        return text;
      }
    }

    if (lang === 'html') {
      try {
        return html_beautify(text, { indent_size: 2, wrap_line_length: 0 });
      } catch {
        return text;
      }
    }

    return text;
  }

  private handleCancel() {
    this.dispatchEvent(new CustomEvent('cancel-request', { bubbles: true, composed: true }));
  }

  private formatResponse() {
    this.formattedBody = this.formatBody(this.body);
  }

  private async copyBody() {
    try {
      await navigator.clipboard.writeText(this.formattedBody || this.body);
      const btn = this.shadowRoot?.querySelector('.copy-btn') as HTMLButtonElement;
      if (btn) {
        const originalText = btn.textContent || 'Copy';
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }
    } catch {
      // Silently fail for copy operations
    }
  }

  render() {
    return html`
      <div class="response-view">
        ${this.loading ? html`
          <div class="loading-overlay">
            <div class="spinner"></div>
            <div>Sending request...</div>
            <button class="cancel-btn" @click=${this.handleCancel}>Cancel</button>
          </div>
        ` : ''}

        ${this.body ? html`
          <div class="toolbar-floating">
            <button class="toolbar-btn" @click=${this.formatResponse} title="Format Response Body">
              Format
            </button>
            <button class="toolbar-btn copy-btn" @click=${this.copyBody} title="Copy Response Body">
              Copy
            </button>
          </div>

          <lc-code-editor
            .value=${this.formattedBody || this.body}
            .language=${this.language}
            .readOnly=${true}
            .wordWrap=${true}
            .minimap=${false}
          ></lc-code-editor>
        ` : html`
          <div class="placeholder">Send a request to see the response here...</div>
        `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-response-view': LcResponseView;
  }
}
