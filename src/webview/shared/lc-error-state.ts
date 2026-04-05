import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from './base-element.js';

@customElement('lc-error-state')
export class LcErrorState extends LcBaseElement {
  @property({ type: String }) message = '';
  @property({ type: Boolean }) inline = false;

  static styles = css`
    :host {
      display: block;
    }

    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder, var(--vscode-editorError-foreground));
      padding: 8px 12px;
      border-radius: 2px;
      font-size: 12px;
      line-height: 1.5;
    }

    .error-icon {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      margin-top: 1px;
      color: var(--vscode-editorError-foreground);
    }

    .error-message {
      flex: 1;
      min-width: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--vscode-editor-font-family);
    }

    .retry-btn {
      flex-shrink: 0;
      padding: 3px 10px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      border-radius: 2px;
      font-size: 11px;
      cursor: pointer;
      font-family: inherit;
    }

    .retry-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
  `;

  private handleRetry() {
    this.dispatchEvent(new CustomEvent('retry', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (!this.message) { return nothing; }

    return html`
      <div class="error-banner">
        <svg class="error-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 10.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM8.75 4v4.5h-1.5V4h1.5z"/>
        </svg>
        <span class="error-message">${this.message}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-error-state': LcErrorState;
  }
}
