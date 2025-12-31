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
      background: rgba(0, 0, 0, 0.4);
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }

    :host([open]) {
      opacity: 1;
      pointer-events: auto;
    }

    .modal {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-widget-border);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      border-radius: 4px;
      width: 80%;
      max-width: 300px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transform: translateY(10px);
      transition: transform 0.2s;
    }

    :host([open]) .modal {
      transform: translateY(0);
    }

    .message {
      font-size: 13px;
      color: var(--vscode-foreground);
      line-height: 1.4;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    button {
      background: transparent;
      border: 1px solid var(--vscode-button-secondaryHoverBackground);
      color: var(--vscode-button-secondaryForeground);
      padding: 4px 12px;
      border-radius: 2px;
      cursor: pointer;
      font-size: 11px;
    }

    button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }

    button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    button.danger {
      background: var(--vscode-button-background); /* often same, but could be specific error color */
      background: #d62d2d; 
    }
    
    button.danger:hover {
      background: #b52525;
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
          <button class="primary danger" @click=${this.handleConfirm}>Delete</button>
        </div>
      </div>
    `;
    }
}
