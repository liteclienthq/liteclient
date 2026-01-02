import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';

@customElement('lc-confirmation-modal')
export class LcConfirmationModal extends LcBaseElement {
  static override styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.45);
      z-index: 10000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }

    :host([open]) {
      opacity: 1;
      pointer-events: auto;
    }

    .modal {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      border-radius: 4px;
      width: 90%;
      max-width: 380px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transform: scale(0.95);
      transition: transform 0.15s ease;
    }

    :host([open]) .modal {
      transform: scale(1);
    }

    .message {
      font-size: 13px;
      color: var(--vscode-foreground);
      line-height: 1.5;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    button {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-secondaryBackground);
      padding: 6px 14px;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.1s;
    }

    button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: 1px solid var(--vscode-button-background);
    }

    button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    button.danger {
      background: #e51400; /* VS Code error background */
      color: #ffffff;
      border-color: #e51400;
    }
    
    button.danger:hover {
      background: #c71100;
    }
  `;

  @property({ type: Boolean, reflect: true }) open = false;
  @property() message = '';
  @property() action = '';

  private handleCancel() {
    this.dispatchEvent(new CustomEvent('cancel'));
    this.open = false;
  }

  private handleConfirm() {
    this.dispatchEvent(new CustomEvent('confirm', { detail: { action: this.action } }));
    this.open = false;
  }

  override render() {
    return html`
      <div class="modal">
        <div class="message">${this.message}</div>
        <div class="actions">
          <button @click=${this.handleCancel}>Cancel</button>
          <button class="primary ${this.action.includes('delete') ? 'danger' : ''}" @click=${this.handleConfirm}>
            ${this.action.includes('delete') ? 'Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    `;
  }
}
