/**
 * Response View Component
 * Displays formatted response body with line numbers and syntax highlighting
 */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { LcBaseElement } from '../../shared/base-element.js';

@customElement('lc-response-view')
export class LcResponseView extends LcBaseElement {
  @property({ type: String }) body = '';
  @property({ type: String }) contentType = 'text/plain';
  @property({ type: Boolean }) loading = false;

  static styles = css`
    .response-view {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .editor-container {
      display: flex;
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      line-height: 1.5;
      background: var(--vscode-editor-background);
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      tab-size: 2;
      align-items: flex-start;
    }

    .editor-container > div {
      height: 100%;
    }


    .line-numbers {
      display: block;
      padding: 0 6px 0 4px;
      text-align: right;
      color: var(--vscode-editorLineNumber-foreground);
      background: var(--vscode-editor-background);
      user-select: none;
      flex-shrink: 0;
      min-width: 25px;
      white-space: pre;
      height: 100%;
    }



    .code-content {
      flex: 1;
      padding-left: 8px;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--vscode-editor-foreground);
      outline: none;
      user-select: text;
      cursor: text;
      caret-color: var(--vscode-editorCursor-foreground, #AEAFAD);
      min-width: 0;
      overflow-wrap: break-word;
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

    /* JSON Syntax Highlighting */
    .json-key { color: var(--vscode-symbolIcon-propertyForeground, #9cdcfe); }
    .json-string { color: var(--vscode-debugTokenExpression-string, #ce9178); }
    .json-number { color: var(--vscode-debugTokenExpression-number, #b5cea8); }
    .json-bool { color: var(--vscode-debugTokenExpression-boolean, #569cd6); }
    .json-null { color: var(--vscode-debugTokenExpression-boolean, #569cd6); }

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


  private get formattedBody(): string {
    if (!this.body) { return ''; }

    // Try to parse and format JSON
    const isLikelyJson = this.contentType.includes('json') || this.body.trim().startsWith('{') || this.body.trim().startsWith('[');

    if (isLikelyJson) {
      try {
        const parsed = JSON.parse(this.body);
        const formatted = JSON.stringify(parsed, null, 2);
        return this.highlightJson(formatted);
      } catch (e) {
        // If JSON parsing fails, treat as plain text
        return this.escapeHtml(this.body);
      }
    }

    return this.escapeHtml(this.body);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private highlightJson(json: string): string {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"\\]*(\\.[^"\\]*)*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-bool">$1</span>')
      .replace(/: (null)/g, ': <span class="json-null">$1</span>')
      .replace(/(\[\s*)"([^"\\]*(\\.[^"\\]*)*)"/g, '$1<span class="json-string">"$2"</span>') // Strings in arrays (start)
      .replace(/(,\s*)"([^"\\]*(\\.[^"\\]*)*)"/g, '$1<span class="json-string">"$2"</span>'); // Strings in arrays (middle)

  }


  private get lineNumbers(): string {
    const target = this.formattedBody;
    if (!target) { return ''; }
    const lines = target.split('\n').length;
    return Array.from({ length: lines }, (_, i) => i + 1).join('\n');
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
      console.error('Failed to copy:', err);
    }
  }


  render() {
    return html`
      <div class="response-view">
        ${this.loading ? html`
          <div class="loading-overlay">
            <div class="spinner"></div>
            <div>Sending request...</div>
          </div>
        ` : ''}
        
        ${this.body ? html`
          <button class="copy-btn-floating" @click=${this.copyBody} title="Copy Response Body">
            Copy
          </button>

          <div class="editor-container">
            <div class="line-numbers">${this.lineNumbers}</div><div class="code-content" contenteditable="true" spellcheck="false" tabindex="0" @keydown=${this.handleKeydown}>${unsafeHTML(this.formattedBody)}</div>
          </div>
        ` : html`
          <div class="placeholder">Send a request to see the response here...</div>
        `}
      </div>
    `;
  }


  private handleKeydown(e: KeyboardEvent) {
    // Allow copy, select-all, and navigation keys
    if (e.metaKey || e.ctrlKey || e.key.startsWith('Arrow') ||
      e.key === 'PageUp' || e.key === 'PageDown' ||
      e.key === 'Home' || e.key === 'End') {
      return;
    }
    e.preventDefault();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-response-view': LcResponseView;
  }
}
