import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';
import './lc-sidebar-item';
import { SidebarItemAction } from './lc-sidebar-item';


export interface HistoryItem {
  id: string;
  name?: string;
  url: string;
  method: string;
  status: string;
  timestamp: number;
}

@customElement('lc-history-list')
export class LcHistoryList extends LcBaseElement {
  static override styles = css`
      :host {
        display: block;
        height: 100%;
      }

      .history-list {
        display: flex;
        flex-direction: column;
        padding-top: 4px;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100px;
        opacity: 0.5;
        font-size: 12px;
      }
    `;

  @property({ type: Array }) items: HistoryItem[] = [];
  @property() filterText = '';

  private historyActions: SidebarItemAction[] = [
    { id: 'add-to-collection', label: 'Add to Collection', icon: 'plus' },
    { id: 'rename', label: 'Rename' },
    { id: 'delete', label: 'Delete', danger: true }
  ];


  private handleItemSelect(e: CustomEvent) {
    const item = this.items.find(i => i.id === e.detail.itemId);
    if (item) {
      this.dispatchEvent(new CustomEvent('open-request', {
        detail: { item, source: 'history', id: item.id },
        bubbles: true,
        composed: true
      }));
    }
  }



  private handleItemAction(e: CustomEvent) {
    const { actionId, itemId } = e.detail;
    this.dispatchEvent(new CustomEvent('history-action', {
      detail: { action: actionId, id: itemId },
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    return html`
      ${this.items.length === 0 ? html`<div class="empty-state">No request history</div>` : html`
        <div class="history-list">
          ${this.items
          .filter(item => {
            if (!this.filterText) { return true; }
            const search = this.filterText.toLowerCase();
            return (item.name?.toLowerCase().includes(search) || item.url.toLowerCase().includes(search));
          })
          .map(item => html`
            <lc-sidebar-item
              .id=${item.id}
              .name=${item.name || item.url}
              .method=${item.method}
              .details=${item.name ? item.url : ''}
              type="request"
              .actions=${this.historyActions}

              @select=${this.handleItemSelect}
              @action=${this.handleItemAction}
            ></lc-sidebar-item>
          `)}
        </div>
      `}

    `;
  }
}

