import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';

export interface SidebarItemAction {
  id: string;
  label: string;
  icon?: string;
  danger?: boolean;
}

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
      padding: 6px 8px;
      cursor: pointer;
      gap: 6px;
      font-size: 13px;
      position: relative;
      min-height: 22px;
      color: var(--vscode-sideBar-foreground);
      border: 1px solid transparent;
      margin-bottom: 2px;
    }

    .item:hover {
      background: var(--vscode-list-hoverBackground);
      outline: 1px solid var(--vscode-list-hoverOutline);
    }

    .item.active {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
      border: 1px solid var(--vscode-list-activeSelectionBackground);
    }

    .item:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .method {
      font-weight: bold;
      font-size: 10px;
      min-width: 32px;
      text-transform: uppercase;
    }

    .method.get { color: #3cb371; }
    .method.post { color: #4169e1; }
    .method.put { color: #ff8c00; }
    .method.patch { color: #daa520; }
    .method.delete { color: #dc143c; }

    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .details {
      font-size: 11px;
      opacity: 0.6;
      display: flex;
      justify-content: space-between;
    }

    .menu-trigger {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      opacity: 0;
      border-radius: 3px;
      transition: opacity 0.15s ease, background 0.15s ease;
    }

    .item:hover .menu-trigger, .menu-trigger.active {
      opacity: 0.8;
    }

    .menu-trigger:hover {
      background: var(--vscode-toolbar-hoverBackground);
      opacity: 1;
    }

    .menu-trigger:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    /* Fixed context menu to prevent clipping */
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
    }

    .menu-item:hover {
      background: var(--vscode-menu-selectionBackground);
      color: var(--vscode-menu-selectionForeground);
    }

    .menu-item.danger {
      color: var(--vscode-errorForeground);
    }

    .item.composite {
      padding: 0;
      margin-bottom: 0;
      background: transparent;
      border: none;
    }

    .item.composite:hover {
      background: transparent;
      outline: none;
    }

    .item.composite.active {
      background: transparent;
      color: inherit;
      border: none;
    }

    .item.composite .menu-trigger {
      display: none;
    }
  `;

  @property() id = '';
  @property() name = '';
  @property() method = 'GET';
  @property() details = '';
  @property({ type: Boolean }) active = false;
  @property({ type: Array }) actions: SidebarItemAction[] = [];
  @property({ type: Boolean }) composite = false;


  @state() private menuOpen = false;
  @state() private menuTop = 0;
  @state() private menuLeft = 0;


  private toggleMenu(e: Event) {
    e.stopPropagation();
    const trigger = e.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();

    this.menuOpen = !this.menuOpen;

    if (this.menuOpen) {
      // Position menu below trigger, with boundary checking
      this.menuTop = rect.bottom + 4;

      // Get the sidebar container to check actual available width
      const sidebarElement = this.closest('.content') || document.querySelector('.content') || document.body;
      const sidebarRect = sidebarElement.getBoundingClientRect();

      // Calculate menu position with improved boundary checking
      let menuLeft = rect.left; // Default to left side positioning
      const menuWidth = 140; // 140 is min-width
      
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

      // Handle bottom overflow
      if (this.menuTop + 150 > window.innerHeight) {
        this.menuTop = rect.top - 100; // Show above if near bottom
      }

      const closeMenu = () => {
        this.menuOpen = false;
        document.removeEventListener('click', closeMenu);
        window.removeEventListener('blur', closeMenu);
      };
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
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

  private handleClick() {
    this.dispatchEvent(new CustomEvent('select', {
      detail: { itemId: this.id },
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    return html`
      <div class="item ${this.active ? 'active' : ''} ${this.composite ? 'composite' : ''}" @click=${this.handleClick}>
        <span class="method ${this.method.toLowerCase()}">${this.method}</span>
        <div class="content">
          <span class="name">${this.name}</span>
          ${this.details ? html`<span class="details">${this.details}</span>` : ''}
        </div>

        ${this.actions.length > 0 ? html`
          <button
            class="menu-trigger ${this.menuOpen ? 'active' : ''}"
            @click=${this.toggleMenu}
            title="More actions"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
            </svg>
          </button>

          <div
            class="context-menu ${this.menuOpen ? 'open' : ''}"
            style="top: ${this.menuTop}px; left: ${this.menuLeft}px;"
          >

            ${this.actions.map(action => html`
              <div
                class="menu-item ${action.danger ? 'danger' : ''}"
                @click=${(e: Event) => this.handleAction(e, action.id)}
              >
                ${action.label}
              </div>
            `)}
          </div>
        ` : ''}
      </div>
    `;
  }
}
