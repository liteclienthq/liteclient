import { html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';
import './lc-sidebar-item';
import { SidebarItemAction } from './lc-sidebar-item';
import '../../shared/lc-empty-state.js';

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
    { id: 'run', label: 'Run Collection' },
    { id: 'add-folder', label: 'New Folder' },
    { id: 'add-request', label: 'New Request' },
    { id: 'manage-variables', label: 'Manage Variables' },
    { id: 'rename', label: 'Rename' },
    { id: 'export', label: 'Export' },
    { id: 'delete', label: 'Delete', danger: true }
  ];

  private folderActions: SidebarItemAction[] = [
    { id: 'run', label: 'Run Folder' },
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
      case 'run':
        this.dispatchEvent(new CustomEvent('collection-action', {
          detail: { action: 'run', collectionId, folderId: itemId },
          bubbles: true, composed: true
        }));
        break;
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
      case 'manage-variables':
      case 'rename':
      case 'export':
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

  private handleItemDrop(e: CustomEvent, targetCollectionId: string, items: CollectionItem[], parentId?: string) {
    const { draggedItemId, sourceCollectionId, targetItemId, targetItemType, dropPosition } = e.detail;

    let targetParentId: string | undefined;
    let insertBeforeId: string | undefined;

    if (dropPosition === 'inside') {
      targetParentId = targetItemId;
      insertBeforeId = undefined;
    } else if (dropPosition === 'before') {
      targetParentId = parentId;
      insertBeforeId = targetItemId;
    } else if (dropPosition === 'after') {
      targetParentId = parentId;
      const targetIndex = items.findIndex(i => i.id === targetItemId);
      if (targetIndex >= 0 && targetIndex < items.length - 1) {
        insertBeforeId = items[targetIndex + 1].id;
      } else {
        insertBeforeId = undefined;
      }
    }

    this.dispatchEvent(new CustomEvent('move-item', {
      detail: {
        sourceCollectionId,
        targetCollectionId,
        itemId: draggedItemId,
        targetParentId,
        insertBeforeId
      },
      bubbles: true,
      composed: true
    }));
  }

  private renderItems(items: CollectionItem[], collectionId: string, depth: number = 1, parentId?: string): TemplateResult[] {
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
            .draggable=${true}
            .parentId=${parentId}
            .collectionId=${collectionId}
            @select=${(e: CustomEvent) => this.handleSelect(e, collectionId, item)}
            @toggle=${() => this.toggleItem(item.id)}
            @action=${(e: CustomEvent) => this.handleAction(e, collectionId, item.id, undefined, item.name)}
            @item-drop=${(e: CustomEvent) => this.handleItemDrop(e, collectionId, items, parentId)}
          ></lc-sidebar-item>
          
          ${item.type === 'folder' ? html`
            <div class="children-container ${isOpen ? 'open' : ''}">
              ${this.renderItems((item as FolderItem).items, collectionId, depth + 1, item.id)}
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
        ${this.collections.length === 0 ? html`<lc-empty-state
            compact
            icon="folder"
            title="No collections"
            description="Organize your API requests into collections."
          ></lc-empty-state>` :
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
                .draggable=${false}
                .collectionId=${collection.id}
                @select=${(e: CustomEvent) => this.handleSelect(e, collection.id, { ...collection, type: 'collection' })}
                @toggle=${() => this.toggleItem(collection.id)}
                @action=${(e: CustomEvent) => this.handleAction(e, collection.id)}
                @item-drop=${(e: CustomEvent) => this.handleItemDrop(e, collection.id, collection.items, undefined)}
              ></lc-sidebar-item>
              
              <div class="children-container ${isOpen ? 'open' : ''}">
                ${this.renderItems(collection.items, collection.id, 1, undefined)}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }
}
