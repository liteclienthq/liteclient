/**
 * Response View Component
 * Displays formatted response body with Monaco Editor syntax highlighting
 */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import '../../shared/lc-code-editor.js';

@customElement('lc-response-view')
export class LcResponseView extends LcBaseElement {
  @property({ type: String }) body = '';
  @property({ type: String }) contentType = 'text/plain';
  @property({ type: Boolean }) loading = false;

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

    .copy-btn-floating {
      position: absolute;
      top: 8px;
      right: 16px;
      z-index: 5;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid transparent;
      border-radius: 2px;
      font-size: 11px;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    .copy-btn-floating:hover {
      opacity: 1;
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

  private handleCancel() {
    this.dispatchEvent(new CustomEvent('cancel-request', { bubbles: true, composed: true }));
  }

  private async copyBody() {
    try {
      await navigator.clipboard.writeText(this.body);
      const btn = this.shadowRoot?.querySelector('.copy-btn-floating') as HTMLButtonElement;
      if (btn) {
        const originalText = btn.textContent || 'Copy';
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }
    } catch (err) {
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
          <button class="copy-btn-floating" @click=${this.copyBody} title="Copy Response Body">
            Copy
          </button>

          <lc-code-editor
            .value=${this.body}
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
