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

      .collection-item, .folder-item {
        display: flex;
        flex-direction: column;
      }

      .tree-item {
        display: flex;
        flex-direction: column;
        user-select: none;
        width: 100%;
      }

      .tree-item-header {
        display: flex;
        align-items: center;
        padding: 2px 8px;
        cursor: pointer;
        gap: 4px;
        font-size: 13px;
        position: relative;
        height: 22px;
        color: var(--vscode-foreground);
        border: 1px solid transparent;
        border-radius: 2px;
        margin: 1px 4px;
        min-width: 0;
        overflow: hidden;
      }

      .tree-item-header:hover {
        background: var(--vscode-list-hoverBackground);
        color: var(--vscode-list-hoverForeground);
        outline: 1px solid var(--vscode-list-hoverOutline);
      }

      .tree-item-header.selected {
        background: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
        border: 1px solid var(--vscode-list-activeSelectionBackground);
      }

      .tree-item-header:focus-visible {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: -1px;
      }

      .tree-item-header.selected:focus-visible {
        outline: 1px solid var(--vscode-list-focusOutline);
        outline-offset: -1px;
      }

      .tree-item-content {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
        padding: 0 2px;
        overflow: hidden;
      }

      .tree-item-indent {
        width: 18px;
        flex-shrink: 0;
      }

      .tree-item-chevron {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.05s ease-in-out;
        flex-shrink: 0;
        margin-right: 2px;
        position: relative;
      }

      .tree-item-chevron.open::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: -2px;
        transform: translateX(-50%);
        width: 12px;
        height: 1px;
        background: var(--vscode-tree-indentGuidesStroke);
      }

      .tree-item-chevron.open {
        transform: rotate(90deg);
      }

      .tree-item-icon {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-right: 4px;
        color: var(--vscode-icon-foreground);
      }

      .tree-item-label {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 13px;
      }

      .tree-item-actions {
        display: none;
        opacity: 0.6;
        margin-left: 4px;
        flex-shrink: 0;
        position: relative;
        z-index: 10;
        pointer-events: auto; /* Ensure button is clickable even if parent is clipped */
      }

      .tree-item-header:hover .tree-item-actions {
        display: flex;
        opacity: 1;
      }

      .tree-item-actions button {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: var(--vscode-foreground);
        cursor: pointer;
        border-radius: 2px;
        position: relative;
        z-index: 2;
      }

      .tree-item-actions button:hover {
        background: var(--vscode-toolbar-hoverBackground);
      }

      .tree-item-children {
        display: none;
      }

      .tree-item-children.open {
        display: flex;
        flex-direction: column;
      }

      /* Indentation guides */
      .tree-item-header {
        position: relative;
      }
      .tree-item-children .tree-item-header::before {
        content: '';
        position: absolute;
        left: -9px; /* (18px padding / 2) */
        top: 13px; /* ~Center of header height */
        width: 8px;
        height: 1px;
        background: var(--vscode-tree-inactiveIndentGuidesStroke);
      }
      .tree-item-children .tree-item-header:hover::before {
        background: var(--vscode-tree-indentGuidesStroke);
      }

      .tree-item-children {
        position: relative;
        padding-left: 18px;
      }
      .tree-item-children::before {
        content: '';
        position: absolute;
        left: 9px; /* (18px padding / 2) */
        top: 0;
        bottom: 0;
        width: 1px;
        background: var(--vscode-tree-inactiveIndentGuidesStroke);
      }
      .tree-item-children:hover::before {
        background: var(--vscode-tree-indentGuidesStroke);
      }

      /* No indent for root-level items */
      .collection-wrapper > .tree-item-children {
        padding-left: 0;
      }
      .collection-wrapper > .tree-item-children::before,
      .collection-wrapper > .tree-item-children > .tree-item > .tree-item-header::before {
        display: none;
      }

      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100px;
        opacity: 0.5;
        font-size: 12px;
      }

      /* Context Menu */
      .context-menu {
        position: fixed;
        background: var(--vscode-menu-background);
        color: var(--vscode-menu-foreground);
        border: 1px solid var(--vscode-menu-border);
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 10000;
        min-width: 140px;
        padding: 4px 0;
        display: none;
      }

      .context-menu.open {
        display: block;
      }

      .menu-item {
        padding: 6px 12px;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: normal;
      }

      .menu-item:hover {
        background: var(--vscode-menu-selectionBackground);
        color: var(--vscode-menu-selectionForeground);
      }

      .menu-item.danger {
        color: var(--vscode-errorForeground);
      }
    `;

  @property({ type: Array }) collections: Collection[] = [];
  @property() filterText = '';

  @state() private openItems = new Set<string>(); // IDs of open collections/folders
  @state() private selectedId: string | null = null;
  @state() private menuOpenId: string | null = null;
  @state() private menuTop = 0;
  @state() private menuLeft = 0;
  
  private allItems: {id: string; type: 'collection' | 'folder' | 'request'; element: HTMLElement | null}[] = [];
  private focusedItemIndex = -1;

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

  private updateFocusedItem() {
    // Update focus state based on selectedId
    if (this.selectedId) {
      const index = this.allItems.findIndex(item => item.id === this.selectedId);
      this.focusedItemIndex = index;
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.allItems.length) {
      return;
    }

    const currentIndex = this.focusedItemIndex >= 0 ? this.focusedItemIndex : 0;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, this.allItems.length - 1);
        this.focusedItemIndex = nextIndex;
        this.selectedId = this.allItems[nextIndex].id;
        this.scrollItemIntoView(this.allItems[nextIndex].element);
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        this.focusedItemIndex = prevIndex;
        this.selectedId = this.allItems[prevIndex].id;
        this.scrollItemIntoView(this.allItems[prevIndex].element);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        const currentItem = this.allItems[currentIndex];
        if (currentItem.type === 'folder' || currentItem.type === 'collection') {
          this.toggleItem(currentItem.id);
        } else if (currentItem.type === 'request') {
          // Find the request and trigger select
          const request = this.findRequestById(currentItem.id);
          if (request) {
            this.handleRequestSelect(new CustomEvent('select'), request.collectionId, request.request);
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        this.menuOpenId = null;
        break;
    }
  }

  private scrollItemIntoView(element: HTMLElement | null) {
    if (element) {
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  private findRequestById(id: string): {collectionId: string; request: RequestItem} | null {
    for (const collection of this.collections) {
      const request = this.findRequestInItems(collection.items, id);
      if (request) {
        return { collectionId: collection.id, request };
      }
    }
    return null;
  }

  private findRequestInItems(items: CollectionItem[], id: string): RequestItem | null {
    for (const item of items) {
      if (item.type === 'request' && item.id === id) {
        return item;
      } else if (item.type === 'folder') {
        const found = this.findRequestInItems(item.items, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  private selectItem(id: string) {
    this.selectedId = id;
  }

  private handleMenu(e: Event, id: string) {
    e.stopPropagation();
    const trigger = e.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();

    this.menuOpenId = this.menuOpenId === id ? null : id;

    if (this.menuOpenId) {
      this.menuTop = rect.bottom + 4;
      
      // Get the sidebar container to check actual available width
      const sidebarElement = this.closest('.content') || document.querySelector('.content') || document.body;
      const sidebarRect = sidebarElement.getBoundingClientRect();

      // Calculate menu position with improved boundary checking
      let menuLeft = rect.left; // Default to left side positioning
      const menuWidth = 140; // Menu width
      
      // Check if there's enough space to the right of the trigger
      if (rect.right + menuWidth <= sidebarRect.right) {
        // Position to the right of the trigger
        menuLeft = rect.right - menuWidth;
      } else if (rect.left - menuWidth >= sidebarRect.left) {
        // Position to the left of the trigger if there's space
        menuLeft = rect.left - menuWidth;
      }
      // Otherwise keep at rect.left (menu will extend to the right but stay within sidebar)

      // Ensure menu doesn't go outside the left edge of the sidebar
      if (menuLeft < sidebarRect.left) {
        menuLeft = sidebarRect.left;
      }

      // Ensure menu doesn't go outside the right edge of the sidebar
      if (menuLeft + menuWidth > sidebarRect.right) {
        menuLeft = sidebarRect.right - menuWidth;
      }

      this.menuLeft = menuLeft;

      if (this.menuTop + 150 > window.innerHeight) {
        this.menuTop = rect.top - 120;
      }

      const closeMenu = () => {
        this.menuOpenId = null;
        document.removeEventListener('click', closeMenu);
        window.removeEventListener('blur', closeMenu);
      };
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
        window.addEventListener('blur', closeMenu);
      }, 0);
    }
  }

  private handleMenuAction(e: Event, actionId: string, collectionId: string, itemId?: string, parentId?: string, name?: string) {
    e.stopPropagation();
    this.menuOpenId = null;

    // Dispatch events based on action
    switch (actionId) {
      case 'add-request':
        this.dispatchEvent(new CustomEvent('collection-action', {
          detail: { action: 'add-collection-request', collectionId, parentId },
          bubbles: true, composed: true
        }));
        break;
      case 'add-folder':
        this.dispatchEvent(new CustomEvent('collection-action', {
          detail: { action: 'add-collection-folder', collectionId, parentId },
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

  private handleRequestSelect(e: CustomEvent, collectionId: string, request: RequestItem) {
    e.stopPropagation();
    this.selectItem(request.id);
    this.dispatchEvent(new CustomEvent('open-request', {
      detail: { item: request, source: 'collection', id: request.id, collectionId },
      bubbles: true,
      composed: true
    }));
  }

  // Recursive Render Helper
  private renderItems(items: CollectionItem[], collectionId: string, parentId?: string, depth: number = 1): TemplateResult[] {
    return items.map(item => {
      // Filter Logic
      const search = this.filterText.toLowerCase();
      // Simple filter: if search matches this item or any descendants.
      // This is expensive to re-calculate every render.
      // Ideally we should process filter once.
      // For now, I'll assume if filterText is set, verify match.

      const isFolder = item.type === 'folder';

      if (this.filterText) {
        if (!this.matchesFilter(item, search)) {
          return html``;
        }
      }

      const isOpen = this.openItems.has(item.id) || !!this.filterText; // Expand all on search
      const isSelected = this.selectedId === item.id;

      if (isFolder) {
        const folder = item as FolderItem;
        return html`
          <div class="tree-item">
              <div class="tree-item-header ${isSelected ? 'selected' : ''}" 
                   @click=${() => this.toggleItem(folder.id)}
                   role="treeitem"
                   aria-expanded="${isOpen}"
                   aria-level="${depth}"
                   aria-selected="${isSelected}"
                   tabindex="${isSelected ? '0' : '-1'}">
              ${Array.from({length: depth}).map(() => html`<span class="indent-unit"></span>`)}
              <span class="tree-item-chevron ${isOpen ? 'open' : ''}" @click=${(e: Event) => { e.stopPropagation(); this.toggleItem(folder.id); }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6 3l5 5-5 5-1.5-1.5L9 8l-4.5-3.5L6 3z"/>
                </svg>
              </span>
              <div class="tree-item-content">
                <span class="tree-item-label">${folder.name}</span>
              </div>
              <div class="tree-item-actions">
                <button @click=${(e: Event) => this.handleMenu(e, folder.id)} title="More actions">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                  </svg>
                </button>
              </div>
              <div
                class="context-menu ${this.menuOpenId === folder.id ? 'open' : ''}"
                style="top: ${this.menuTop}px; left: ${this.menuLeft}px;"
              >
                ${this.folderActions.map(action => html`
                  <div
                    class="menu-item ${action.danger ? 'danger' : ''}"
                    @click=${(e: Event) => this.handleMenuAction(e, action.id, collectionId, folder.id, folder.id, folder.name)}
                  >
                    ${action.label}
                  </div>
                `)}
              </div>
            </div>
            <div class="tree-item-children ${isOpen ? 'open' : ''}">
              ${this.renderItems(folder.items, collectionId, folder.id, depth + 1)}
            </div>
          </div>
        `;
      } else {
        const request = item as RequestItem;
        return html`
          <div class="tree-item">
            <div class="tree-item-header ${isSelected ? 'selected' : ''}"
                 @click=${(e: CustomEvent) => this.handleRequestSelect(e, collectionId, request)}
                 role="treeitem"
                 aria-level="${depth}"
                 aria-selected="${isSelected}"
                 tabindex="${isSelected ? '0' : '-1'}">

              <div class="tree-item-indent" style="width: 18px;"></div>
              <span class="tree-item-chevron"></span> <!-- Placeholder for alignment -->

              <div class="tree-item-content">
                  <lc-sidebar-item
                    .composite=${true}
                    .id=${request.id}
                    .name=${request.name}
                    .method=${request.method}
                    .active=${isSelected}
                  ></lc-sidebar-item>
              </div>

              <div class="tree-item-actions">
                <button @click=${(e: Event) => this.handleMenu(e, request.id)} title="More actions">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                  </svg>
                </button>
              </div>

              <div
                class="context-menu ${this.menuOpenId === request.id ? 'open' : ''}"
                style="top: ${this.menuTop}px; left: ${this.menuLeft}px;"
              >
                ${this.requestActions.map(action => html`
                  <div
                    class="menu-item ${action.danger ? 'danger' : ''}"
                    @click=${(e: Event) => this.handleMenuAction(e, action.id, collectionId, request.id, parentId, request.name)}
                  >
                    ${action.label}
                  </div>
                `)}
              </div>
            </div>
          </div>
        `;
      }
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

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.handleKeyDown as EventListener);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.handleKeyDown as EventListener);
  }

  override render() {
    return html`
      <div class="collection-list" role="tree" aria-label="Collections" tabindex="0">
        ${this.collections.length === 0 ? html`<div class="empty-state">No collections</div>` :
        this.collections.map(collection => {
          // Collection Filter Logic
          const search = this.filterText.toLowerCase();
          if (this.filterText) {
            // Check if collection matches or has matching descendants
            const matchLocal = collection.name.toLowerCase().includes(search);
            const matchChildren = collection.items.some(child => this.matchesFilter(child, search));
            if (!matchLocal && !matchChildren) { return html``; }
          }

          const isOpen = this.openItems.has(collection.id) || !!this.filterText;
          const isSelected = this.selectedId === collection.id;

          return html`
            <div class="tree-item collection-wrapper">
              <div class="tree-item-header ${isSelected ? 'selected' : ''}" 
                   @click=${() => this.toggleItem(collection.id)}
                   role="treeitem"
                   aria-expanded="${isOpen}"
                   aria-level="1"
                   aria-selected="${isSelected}"
                   tabindex="${isSelected ? '0' : '-1'}">
                ${Array.from({length: 0}).map(() => html`<span class="indent-unit"></span>`)}
                <span class="tree-item-chevron ${isOpen ? 'open' : ''}" @click=${(e: Event) => { e.stopPropagation(); this.toggleItem(collection.id); }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6 3l5 5-5 5-1.5-1.5L9 8l-4.5-3.5L6 3z"/>
                  </svg>
                </span>
                <div class="tree-item-content">
                  <span class="tree-item-label">${collection.name}</span>
                </div>
                <div class="tree-item-actions">
                  <button @click=${(e: Event) => this.handleMenu(e, collection.id)} title="More actions">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                    </svg>
                  </button>
                </div>
                <div
                  class="context-menu ${this.menuOpenId === collection.id ? 'open' : ''}"
                  style="top: ${this.menuTop}px; left: ${this.menuLeft}px;"
                >
                  ${this.collectionActions.map(action => html`
                    <div
                      class="menu-item ${action.danger ? 'danger' : ''}"
                      @click=${(e: Event) => this.handleMenuAction(e, action.id, collection.id, undefined, undefined)}
                    >
                      ${action.label}
                    </div>
                  `)}
                </div>
              </div>
              <div class="tree-item-children ${isOpen ? 'open' : ''}">
                ${this.renderItems(collection.items, collection.id, collection.id, 1)}
              </div>
            </div>
          `;
        })
      }
      </div>
    `;
  }
}
