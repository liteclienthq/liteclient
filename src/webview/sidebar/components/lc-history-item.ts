import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';

@customElement('lc-history-item')
export class LcHistoryItem extends LcBaseElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .item {
      display: flex;
      align-items: center;
      padding: 0 8px;
      cursor: pointer;
      gap: 0;
      font-size: 13px;
      position: relative;
      height: 22px;
      color: var(--vscode-sideBar-foreground);
      border: 1px solid transparent;
      user-select: none;
    }

    .item:hover {
      background: var(--vscode-list-hoverBackground);
      color: var(--vscode-list-hoverForeground);
    }

    .item.active {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }

    .item:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .method-badge {
      font-weight: bold;
      font-size: 9px;
      min-width: 28px;
      text-transform: uppercase;
      text-align: left;
      border-radius: 2px;
      padding: 1px 2px;
      margin-right: 6px;
      flex-shrink: 0;
    }

    .method-badge.get { color: #3cb371; }
    .method-badge.post { color: #4169e1; }
    .method-badge.put { color: #ff8c00; }
    .method-badge.patch { color: #daa520; }
    .method-badge.delete { color: #dc143c; }

    .url {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .delete-btn {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--vscode-sideBar-foreground);
      cursor: pointer;
      opacity: 0;
      border-radius: 3px;
      flex-shrink: 0;
      margin-left: auto;
      padding: 0;
      transition: opacity 0.1s ease;
    }

    .item:hover .delete-btn {
      opacity: 0.6;
    }

    .delete-btn:hover {
      background: var(--vscode-toolbar-hoverBackground);
      opacity: 1;
      color: var(--vscode-errorForeground);
    }

    .delete-btn svg {
      width: 14px;
      height: 14px;
    }
  `;

  @property() id = '';
  @property() url = '';
  @property() method = 'GET';
  @property({ type: Boolean }) active = false;

  private handleClick(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('select', {
      detail: { itemId: this.id },
      bubbles: true,
      composed: true
    }));
  }

  private handleDelete(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('delete', {
      detail: { itemId: this.id },
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    return html`
      <div 
        class="item ${this.active ? 'active' : ''}" 
        @click=${this.handleClick} 
        role="treeitem"
        title="${this.url}"
      >
        <span class="method-badge ${this.method.toLowerCase()}">${this.method}</span>
        <span class="url">${this.url}</span>
        <button 
          class="delete-btn" 
          @click=${this.handleDelete} 
          title="Delete"
          aria-label="Delete request"
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
        </button>
      </div>
    `;
  }
}
