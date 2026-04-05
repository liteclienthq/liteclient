import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';
import './lc-history-item';
import '../../shared/lc-empty-state.js';

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

interface DayGroup {
  label: string;
  dateKey: string;
  items: RequestExecution[];
}

@customElement('lc-history-list')
export class LcHistoryList extends LcBaseElement {
  static override styles = css`
      :host {
        display: block;
      }

      .history-list {
        display: flex;
        flex-direction: column;
        padding-top: 4px;
        padding-bottom: 8px;
      }

      .day-group {
        display: flex;
        flex-direction: column;
      }

      .day-header {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-sideBar-foreground));
        background: var(--vscode-sideBarSectionHeader-background, transparent);
        user-select: none;
        gap: 4px;
      }

      .day-header:hover {
        background: var(--vscode-list-hoverBackground);
      }

      .day-label {
        flex: 1;
      }

      .day-delete-btn {
        width: 20px;
        height: 20px;
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
        padding: 0;
        transition: opacity 0.1s ease;
      }

      .day-header:hover .day-delete-btn {
        opacity: 0.6;
      }

      .day-delete-btn:hover {
        background: var(--vscode-toolbar-hoverBackground);
        opacity: 1;
        color: var(--vscode-errorForeground);
      }

      .day-delete-btn svg {
        width: 12px;
        height: 12px;
      }

      .chevron {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: transform 0.1s ease;
        opacity: 0.8;
      }

      .chevron.expanded {
        transform: rotate(90deg);
      }

      .chevron svg {
        width: 14px;
        height: 14px;
      }

      .day-items {
        display: none;
        flex-direction: column;
      }

      .day-items.open {
        display: flex;
      }
    `;

  @property({ type: Array }) items: RequestExecution[] = [];
  @property() filterText = '';

  @state() private collapsedDays = new Set<string>();

  private formatDayLabel(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return 'Today';
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }
  }

  private getDateKey(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toDateString();
  }

  private groupByDay(items: RequestExecution[]): DayGroup[] {
    const groups = new Map<string, DayGroup>();

    for (const item of items) {
      const dateKey = this.getDateKey(item.timestamp);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          label: this.formatDayLabel(item.timestamp),
          dateKey,
          items: []
        });
      }
      groups.get(dateKey)!.items.push(item);
    }

    return Array.from(groups.values());
  }

  private toggleDay(dateKey: string) {
    const newCollapsed = new Set(this.collapsedDays);
    if (newCollapsed.has(dateKey)) {
      newCollapsed.delete(dateKey);
    } else {
      newCollapsed.add(dateKey);
    }
    this.collapsedDays = newCollapsed;
  }

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

  private handleItemDelete(e: CustomEvent) {
    const { itemId } = e.detail;
    this.dispatchEvent(new CustomEvent('history-action', {
      detail: { action: 'delete', id: itemId },
      bubbles: true,
      composed: true
    }));
  }

  private handleDayDelete(e: Event, group: DayGroup) {
    e.stopPropagation();
    const ids = group.items.map(item => item.id);
    this.dispatchEvent(new CustomEvent('history-action', {
      detail: { action: 'delete-bulk', ids },
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    const filteredItems = this.items.filter(item => {
      if (!this.filterText) { return true; }
      const search = this.filterText.toLowerCase();
      return (item.request.name?.toLowerCase().includes(search) || item.request.url.toLowerCase().includes(search));
    });

    if (filteredItems.length === 0) {
      return html`
        <lc-empty-state
          compact
          icon="history"
          title="No history yet"
          description="Your request history will appear here."
        ></lc-empty-state>
      `;
    }

    const dayGroups = this.groupByDay(filteredItems).filter(g => g.items.length > 0);

    return html`
      <div class="history-list">
        ${dayGroups.map(group => {
          const isExpanded = !this.collapsedDays.has(group.dateKey);
          return html`
            <div class="day-group">
              <div 
                class="day-header" 
                @click=${() => this.toggleDay(group.dateKey)}
                role="button"
                aria-expanded="${isExpanded}"
              >
                <div class="chevron ${isExpanded ? 'expanded' : ''}">
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6 12.727L11 8 6 3.273V12.727z"/>
                  </svg>
                </div>
                <span class="day-label">${group.label}</span>
                <button 
                  class="day-delete-btn" 
                  @click=${(e: Event) => this.handleDayDelete(e, group)}
                  title="Delete all from ${group.label}"
                  aria-label="Delete all requests from ${group.label}"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                  </svg>
                </button>
              </div>
              <div class="day-items ${isExpanded ? 'open' : ''}">
                ${group.items.map(item => html`
                  <lc-history-item
                    .id=${item.id}
                    .url=${item.request.url}
                    .method=${item.request.method}
                    @select=${this.handleItemSelect}
                    @delete=${this.handleItemDelete}
                  ></lc-history-item>
                `)}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }
}
