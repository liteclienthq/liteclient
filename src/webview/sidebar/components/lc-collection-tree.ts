import { html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';
import './lc-sidebar-item';
import { SidebarItemAction } from './lc-sidebar-item';

export interface Collection {
  id: string;
  name: string;
  items: CollectionItem[];
}

export type CollectionItem = RequestItem | FolderItem;

export interface FolderItem {
  id: string;
  name: string;
  type: 'folder';
  items: CollectionItem[];
}

export interface RequestItem {
  id: string;
  name: string;
  type: 'request';
  method: string;
  url: string;
}

@customElement('lc-collection-tree')
export class LcCollectionTree extends LcBaseElement {
  static override styles = css`
      :host {
        display: block;
        height: 100%;
      }

      .collection-list {
        display: flex;
        flex-direction: column;
        padding-top: 4px;
      }

      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100px;
        opacity: 0.5;
        font-size: 12px;
      }

      .tree-container {
        display: flex;
        flex-direction: column;
      }

      .children-container {
        display: none;
      }

      .children-container.open {
        display: flex;
        flex-direction: column;
      }
    `;

  @property({ type: Array }) collections: Collection[] = [];
  @property() filterText = '';

  @state() private openItems = new Set<string>();
  @state() private selectedId: string | null = null;

  private collectionActions: SidebarItemAction[] = [
    { id: 'add-folder', label: 'New Folder' },
    { id: 'add-request', label: 'New Request' },
    { id: 'rename', label: 'Rename' },
    { id: 'delete', label: 'Delete', danger: true }
  ];

  private folderActions: SidebarItemAction[] = [
    { id: 'add-folder', label: 'New Folder' },
    { id: 'add-request', label: 'New Request' },
    { id: 'rename', label: 'Rename' },
    { id: 'delete', label: 'Delete', danger: true }
  ];

  private requestActions: SidebarItemAction[] = [
    { id: 'rename', label: 'Rename' },
    { id: 'delete', label: 'Delete', danger: true }
  ];

  private toggleItem(id: string) {
    const newOpen = new Set(this.openItems);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    this.openItems = newOpen;
  }

  private handleAction(e: CustomEvent, collectionId: string, itemId?: string, parentId?: string, name?: string) {
    const { actionId } = e.detail;

    // Dispatch events based on action
    switch (actionId) {
      case 'add-request':
        this.dispatchEvent(new CustomEvent('collection-action', {
          detail: { action: 'add-collection-request', collectionId, parentId: itemId },
          bubbles: true, composed: true
        }));
        break;
      case 'add-folder':
        this.dispatchEvent(new CustomEvent('collection-action', {
          detail: { action: 'add-collection-folder', collectionId, parentId: itemId },
          bubbles: true, composed: true
        }));
        break;
      case 'rename':
      case 'delete':
        if (itemId) {
          // Item action (Folder or Request)
          this.dispatchEvent(new CustomEvent('collection-item-action', {
            detail: { action: actionId, collectionId, itemId, name },
            bubbles: true, composed: true
          }));
        } else {
          // Collection action
          this.dispatchEvent(new CustomEvent('collection-action', {
            detail: { action: actionId, collectionId },
            bubbles: true, composed: true
          }));
        }
        break;
    }
  }

  private handleSelect(e: CustomEvent, collectionId: string, item: any) {
    this.selectedId = item.id;
    if (item.type === 'request') {
      this.dispatchEvent(new CustomEvent('open-request', {
        detail: { item, source: 'collection', id: item.id, collectionId },
        bubbles: true,
        composed: true
      }));
    } else {
      this.toggleItem(item.id);
    }
  }

  private renderItems(items: CollectionItem[], collectionId: string, depth: number = 1): TemplateResult[] {
    return items.map(item => {
      const search = this.filterText.toLowerCase();
      if (this.filterText && !this.matchesFilter(item, search)) {
        return html``;
      }

      const isOpen = this.openItems.has(item.id) || !!this.filterText;
      const isSelected = this.selectedId === item.id;

      return html`
        <div class="tree-container">
          <lc-sidebar-item
            .id=${item.id}
            .name=${item.name}
            .type=${item.type}
            .method=${item.type === 'request' ? (item as RequestItem).method : ''}
            .active=${isSelected}
            .expanded=${isOpen}
            .depth=${depth}
            .actions=${item.type === 'folder' ? this.folderActions : this.requestActions}
            @select=${(e: CustomEvent) => this.handleSelect(e, collectionId, item)}
            @toggle=${() => this.toggleItem(item.id)}
            @action=${(e: CustomEvent) => this.handleAction(e, collectionId, item.id, undefined, item.name)}
          ></lc-sidebar-item>
          
          ${item.type === 'folder' ? html`
            <div class="children-container ${isOpen ? 'open' : ''}">
              ${this.renderItems((item as FolderItem).items, collectionId, depth + 1)}
            </div>
          ` : ''}
        </div>
      `;
    });
  }

  private matchesFilter(item: CollectionItem, search: string): boolean {
    if (item.name.toLowerCase().includes(search)) { return true; }
    if (item.type === 'request') {
      return (item as RequestItem).url.toLowerCase().includes(search);
    }
    if (item.type === 'folder') {
      return (item as FolderItem).items.some(child => this.matchesFilter(child, search));
    }
    return false;
  }

  override render() {
    return html`
      <div class="collection-list" role="tree" aria-label="Collections">
        ${this.collections.length === 0 ? html`<div class="empty-state">No collections</div>` :
        this.collections.map(collection => {
          const search = this.filterText.toLowerCase();
          if (this.filterText) {
            const matchLocal = collection.name.toLowerCase().includes(search);
            const matchChildren = collection.items.some(child => this.matchesFilter(child, search));
            if (!matchLocal && !matchChildren) { return html``; }
          }

          const isOpen = this.openItems.has(collection.id) || !!this.filterText;
          const isSelected = this.selectedId === collection.id;

          return html`
            <div class="tree-container">
              <lc-sidebar-item
                .id=${collection.id}
                .name=${collection.name}
                type="collection"
                .active=${isSelected}
                .expanded=${isOpen}
                .depth=${0}
                .actions=${this.collectionActions}
                @select=${(e: CustomEvent) => this.handleSelect(e, collection.id, { ...collection, type: 'collection' })}
                @toggle=${() => this.toggleItem(collection.id)}
                @action=${(e: CustomEvent) => this.handleAction(e, collection.id)}
              ></lc-sidebar-item>
              
              <div class="children-container ${isOpen ? 'open' : ''}">
                ${this.renderItems(collection.items, collection.id, 1)}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }
}
