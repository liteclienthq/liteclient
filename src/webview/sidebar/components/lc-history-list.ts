import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';
import './lc-sidebar-item';
import { SidebarItemAction } from './lc-sidebar-item';

export interface RequestExecution {
  id: string;
  timestamp: number;
  source: { type: string; collectionId?: string; requestId?: string; executionId?: string };
  request: {
    name?: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body: any;
    auth?: any;
  };
  result: {
    status: string;
  };
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

  @property({ type: Array }) items: RequestExecution[] = [];
  @property() filterText = '';

  private historyActions: SidebarItemAction[] = [
    { id: 'add-to-collection', label: 'Add to Collection', icon: 'plus' },
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
            return (item.request.name?.toLowerCase().includes(search) || item.request.url.toLowerCase().includes(search));
          })
          .map(item => html`
            <lc-sidebar-item
              .id=${item.id}
              .name=${item.request.url}
              .method=${item.request.method}
              .details=${''}
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

