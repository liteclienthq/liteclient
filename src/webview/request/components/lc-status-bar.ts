/**
 * Status Bar Component
 * Displays Status, Size, and Time metadata for responses
 */

import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';

type ResponseState = 'idle' | 'loading' | 'success' | 'error';

@customElement('lc-status-bar')
export class LcStatusBar extends LcBaseElement {
  @property({ type: String }) status = '-';
  @property({ type: String }) size = '-';
  @property({ type: String }) time = '-';
  @property({ type: Boolean }) isError = false;
  @property({ type: String }) responseState: ResponseState = 'idle';

  @state() private flash = false;

  static styles = css`
    :host {
      display: block;
    }

    .status-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .status-bar.visible {
      opacity: 1;
    }

    .status-bar.flash .status-badge {
      animation: flash-success 1.5s ease-out;
    }

    @keyframes flash-success {
      0% { background: var(--vscode-testing-iconPassed, #4ec9b0); color: var(--vscode-editor-background); }
      100% { background: transparent; color: inherit; }
    }

    .label {
      color: var(--vscode-descriptionForeground);
    }

    .status-badge {
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 3px;
      transition: background 0.3s ease, color 0.3s ease;
    }

    .status-badge.success {
      color: var(--vscode-testing-iconPassed, #4ec9b0);
    }

    .status-badge.redirect {
      color: var(--vscode-charts-yellow, #cca700);
    }

    .status-badge.client-error {
      color: var(--vscode-charts-orange, #d18616);
    }

    .status-badge.server-error {
      color: var(--vscode-editorError-foreground, #f48771);
    }

    .status-badge.error {
      color: var(--vscode-editorError-foreground, #f48771);
    }

    .value {
      color: var(--vscode-foreground);
    }

    .separator {
      color: var(--vscode-descriptionForeground);
      opacity: 0.4;
      margin: 0 2px;
    }
  `;

  private getStatusClass(): string {
    if (this.isError) { return 'error'; }

    const code = parseInt(this.status, 10);
    if (isNaN(code)) { return ''; }
    if (code >= 200 && code < 300) { return 'success'; }
    if (code >= 300 && code < 400) { return 'redirect'; }
    if (code >= 400 && code < 500) { return 'client-error'; }
    if (code >= 500) { return 'server-error'; }
    return '';
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);

    if (changedProperties.has('responseState') && this.responseState === 'success') {
      this.flash = true;
      setTimeout(() => { this.flash = false; }, 1500);
    }
  }

  render() {
    const isVisible = this.responseState !== 'idle';
    const statusClass = this.getStatusClass();

    return html`
      <div class="status-bar ${isVisible ? 'visible' : ''} ${this.flash ? 'flash' : ''}">
        <span class="label">Status:</span>
        <span class="status-badge ${statusClass}">${this.status}</span>
        <span class="separator">·</span>
        <span class="label">Size:</span>
        <span class="value">${this.size}</span>
        <span class="separator">·</span>
        <span class="label">Time:</span>
        <span class="value">${this.time}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-status-bar': LcStatusBar;
  }
}
