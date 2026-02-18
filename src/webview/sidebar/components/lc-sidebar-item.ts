import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';

export interface SidebarItemAction {
  id: string;
  label: string;
  icon?: string;
  danger?: boolean;
}

export type SidebarItemType = 'collection' | 'folder' | 'request' | 'environment' | 'variable';

@customElement('lc-sidebar-item')
export class LcSidebarItem extends LcBaseElement {
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

    .indent-guide {
      width: 12px;
      flex-shrink: 0;
      height: 100%;
      position: relative;
    }

    /* Chevron */
    .chevron {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.1s ease;
      opacity: 0.8;
      margin-right: 4px;
    }

    .chevron.expanded {
      transform: rotate(90deg);
    }

    .chevron svg {
      width: 14px;
      height: 14px;
    }

    /* Type Specific Icons/Badges */
    .icon {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-right: 6px;
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
    }

    .method-badge.get { color: #3cb371; }
    .method-badge.post { color: #4169e1; }
    .method-badge.put { color: #ff8c00; }
    .method-badge.patch { color: #daa520; }
    .method-badge.delete { color: #dc143c; }

    .content {
      flex: 1;
      display: flex;
      align-items: baseline;
      min-width: 0;
      gap: 6px;
    }

    .name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .details {
      font-size: 11px;
      opacity: 0.5;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .actions {
      display: none;
      align-items: center;
      gap: 2px;
      padding-left: 4px;
    }

    .item:hover .actions, .item.menu-open .actions {
      display: flex;
    }

    .action-btn {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: inherit;
      cursor: pointer;
      opacity: 0.8;
      border-radius: 3px;
    }

    .action-btn:hover {
      background: var(--vscode-toolbar-hoverBackground);
      opacity: 1;
    }

    /* Context Menu */
    .context-menu {
      position: fixed;
      background: var(--vscode-menu-background);
      color: var(--vscode-menu-foreground);
      border: 1px solid var(--vscode-menu-border);
      border-radius: 5px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      z-index: 10000;
      min-width: 160px;
      padding: 4px 0;
      display: none;
    }

    .context-menu.open {
      display: block;
    }

    .menu-item {
      padding: 4px 12px;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .menu-item:hover {
      background: var(--vscode-menu-selectionBackground);
      color: var(--vscode-menu-selectionForeground);
    }

    .menu-item.danger {
      color: var(--vscode-errorForeground);
    }

    /* Drag and drop */
    .item.dragging {
      opacity: 0.5;
    }

    .item.drop-before::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--vscode-focusBorder);
    }

    .item.drop-after::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--vscode-focusBorder);
    }

    .item.drop-inside {
      background: var(--vscode-list-dropBackground, rgba(0, 120, 215, 0.1));
      outline: 1px dashed var(--vscode-focusBorder);
    }
  `;

  @property() id = '';
  @property() name = '';
  @property() type: SidebarItemType = 'request';
  @property() method = 'GET';
  @property() details = '';
  @property({ type: Boolean }) active = false;
  @property({ type: Boolean }) expanded = false;
  @property({ type: Number }) depth = 0;
  @property({ type: Array }) actions: SidebarItemAction[] = [];
  @property({ type: Boolean }) draggable = false;
  @property() parentId: string | undefined = undefined;
  @property() collectionId: string | undefined = undefined;

  @state() private menuOpen = false;
  @state() private menuTop = 0;
  @state() private menuLeft = 0;
  @state() private dragOver = false;
  @state() private dropPosition: 'before' | 'inside' | 'after' | null = null;

  private toggleMenu(e: Event) {
    e.stopPropagation();
    const trigger = e.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();

    this.menuOpen = !this.menuOpen;

    if (this.menuOpen) {
      this.menuTop = rect.bottom + 2;
      this.menuLeft = Math.max(8, rect.right - 160);

      // Handle bottom overflow
      if (this.menuTop + 160 > window.innerHeight) {
        this.menuTop = rect.top - 120;
      }

      const closeMenu = (e: Event) => {
        const target = e.target;
        if (target && target instanceof Node && trigger.contains(target)) {
          return;
        }

        this.menuOpen = false;
        document.removeEventListener('click', closeMenu, true);
        window.removeEventListener('blur', closeMenu);
      };

      setTimeout(() => {
        document.addEventListener('click', closeMenu, true);
        window.addEventListener('blur', closeMenu);
      }, 0);
    }
  }

  private handleAction(e: Event, actionId: string) {
    e.stopPropagation();
    this.menuOpen = false;
    this.dispatchEvent(new CustomEvent('action', {
      detail: { actionId, itemId: this.id },
      bubbles: true,
      composed: true
    }));
  }

  private handleClick(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('select', {
      detail: { itemId: this.id, type: this.type },
      bubbles: true,
      composed: true
    }));
  }

  private handleChevronClick(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('toggle', {
      detail: { itemId: this.id, expanded: !this.expanded },
      bubbles: true,
      composed: true
    }));
  }

  private handleDragStart(e: DragEvent) {
    if (!this.draggable) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-liteclient-item', JSON.stringify({
        id: this.id,
        type: this.type,
        parentId: this.parentId,
        collectionId: this.collectionId
      }));
    }
    (e.currentTarget as HTMLElement).classList.add('dragging');
  }

  private handleDragEnd(e: DragEvent) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).classList.remove('dragging');
    this.dropPosition = null;
    this.dragOver = false;
  }

  private handleDragOver(e: DragEvent) {
    if (!e.dataTransfer?.types.includes('application/x-liteclient-item')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const isContainer = this.type === 'folder' || this.type === 'collection';

    if (isContainer) {
      if (y < height * 0.25) {
        this.dropPosition = 'before';
      } else if (y > height * 0.75) {
        this.dropPosition = 'after';
      } else {
        this.dropPosition = 'inside';
      }
    } else {
      this.dropPosition = y < height / 2 ? 'before' : 'after';
    }

    this.dragOver = true;
  }

  private handleDragLeave(e: DragEvent) {
    e.stopPropagation();
    this.dropPosition = null;
    this.dragOver = false;
  }

  private handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    const data = e.dataTransfer?.getData('application/x-liteclient-item');
    if (!data) {
      return;
    }

    const draggedItem = JSON.parse(data);
    
    if (draggedItem.id === this.id) {
      this.dropPosition = null;
      this.dragOver = false;
      return;
    }

    this.dispatchEvent(new CustomEvent('item-drop', {
      detail: {
        draggedItemId: draggedItem.id,
        draggedItemType: draggedItem.type,
        sourceCollectionId: draggedItem.collectionId,
        targetItemId: this.id,
        targetItemType: this.type,
        targetCollectionId: this.collectionId,
        targetParentId: this.parentId,
        dropPosition: this.dropPosition
      },
      bubbles: true,
      composed: true
    }));

    this.dropPosition = null;
    this.dragOver = false;
  }

  private renderIcon() {
    switch (this.type) {
      case 'collection':
        return html`
          <span class="icon" style="color: var(--vscode-symbolIcon-folderForeground)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14.5 3H7.71l-1.5-1.5H1.5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V3.5a.5.5 0 0 0-.5-.5z"/>
            </svg>
          </span>
        `;
      case 'folder':
        return html`
          <span class="icon" style="color: var(--vscode-symbolIcon-folderForeground)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
               <path d="M1 3.5l.5-.5h2.7l1.3 1.3h7.1l.5.5v8.2l-.5.5h-11l-.5-.5v-9.5z"/>
            </svg>
          </span>
        `;
      case 'request':
        return html`
          <span class="method-badge ${this.method.toLowerCase()}">${this.method}</span>
        `;
      case 'environment':
        return html`
          <span class="icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM5.5 8a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0z"/>
            </svg>
          </span>
        `;
      case 'variable':
        return html`
          <span class="icon" style="opacity: 0.6">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.5 1h-7l-.5.5v13l.5.5h7l.5-.5v-13l-.5-.5zM11 14H5V2h6v12zM6 4h4v1H6V4zm0 2h4v1H6V6zm0 2h4v1H6V8z"/>
            </svg>
          </span>
        `;
      default:
        return null;
    }
  }

  override render() {
    const showChevron = ['collection', 'folder'].includes(this.type);
    const dropClass = this.dropPosition ? `drop-${this.dropPosition}` : '';

    return html`
      <div 
        class="item ${this.active ? 'active' : ''} ${this.menuOpen ? 'menu-open' : ''} ${dropClass}"
        @click=${this.handleClick}
        role="treeitem"
        aria-expanded=${this.expanded}
        aria-level=${this.depth + 1}
        draggable=${this.draggable ? 'true' : 'false'}
        @dragstart=${this.handleDragStart}
        @dragend=${this.handleDragEnd}
        @dragover=${this.handleDragOver}
        @dragleave=${this.handleDragLeave}
        @drop=${this.handleDrop}
      >
        ${Array.from({ length: this.depth }).map(() => html`<div class="indent-guide"></div>`)}
        
        ${showChevron ? html`
          <div class="chevron ${this.expanded ? 'expanded' : ''}" @click=${this.handleChevronClick}>
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 12.727L11 8 6 3.273V12.727z"/>
            </svg>
          </div>
        ` : ''}

        ${this.renderIcon()}

        <div class="content">
          <span class="name">${this.name}</span>
          ${this.details ? html`<span class="details">${this.details}</span>` : ''}
        </div>

        ${this.actions.length > 0 ? html`
          <div class="actions">
            <button class="action-btn" @click=${this.toggleMenu} title="More Actions">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
              </svg>
            </button>
          </div>

          <div class="context-menu ${this.menuOpen ? 'open' : ''}" style="top: ${this.menuTop}px; left: ${this.menuLeft}px;">
            ${this.actions.map(action => html`
              <div class="menu-item ${action.danger ? 'danger' : ''}" @click=${(e: Event) => this.handleAction(e, action.id)}>
                ${action.label}
              </div>
            `)}
          </div>
        ` : ''}
      </div>
    `;
  }
}
