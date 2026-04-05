import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from './base-element.js';

@customElement('lc-loading-state')
export class LcLoadingState extends LcBaseElement {
  @property({ type: String }) label = '';

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 0;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px 16px;
    }

    .spinner {
      width: 22px;
      height: 22px;
      border: 2px solid var(--vscode-foreground);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      opacity: 0.6;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
  `;

  render() {
    return html`
      <div class="loading-state">
        <div class="spinner"></div>
        ${this.label ? html`<div class="label">${this.label}</div>` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-loading-state': LcLoadingState;
  }
}
