/**
 * Status Bar Component
 * Displays Status, Size, and Time metadata for responses
 */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';

@customElement('lc-status-bar')
export class LcStatusBar extends LcBaseElement {
  @property({ type: String }) status = '-';
  @property({ type: String }) size = '-';
  @property({ type: String }) time = '-';
  @property({ type: Boolean }) isError = false;

  static styles = css`
    .status-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }

    .label {
      color: var(--vscode-descriptionForeground);
    }

    .value {
      color: var(--vscode-terminal-ansiGreen, #89d185);
    }

    .value.error {
      color: var(--vscode-errorForeground, #f48771);
    }

    .separator {
      color: var(--vscode-descriptionForeground);
      opacity: 0.5;
      margin: 0 4px;
    }
  `;

  render() {
    const valueClass = this.isError ? 'value error' : 'value';

    return html`
      <div class="status-bar">
        <span class="label">Status:</span>
        <span class="${valueClass}">${this.status}</span>
        <span class="separator">|</span>
        <span class="label">Size:</span>
        <span class="${valueClass}">${this.size}</span>
        <span class="separator">|</span>
        <span class="label">Time:</span>
        <span class="${valueClass}">${this.time}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-status-bar': LcStatusBar;
  }
}
