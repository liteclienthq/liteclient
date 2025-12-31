import { html, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';

@customElement('lc-filter-bar')
export class LcFilterBar extends LcBaseElement {
    static override styles = css`
    :host {
      display: block;
      padding: 4px 12px 8px 12px;
    }

    .filter-container {
      position: relative;
      display: flex;
      align-items: center;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      padding: 2px 4px;
      padding-right: 24px; /* Space for absolute clear button */
      min-width: 0;
    }


    .filter-container:focus-within {
      border-color: var(--vscode-focusBorder);
    }

    .search-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--vscode-input-foreground);
      opacity: 0.5;
      padding-left: 2px;
    }

    input {
      flex: 1;
      background: transparent;
      color: var(--vscode-input-foreground);
      border: none;
      outline: none;
      padding: 2px 8px;
      font-size: 13px;
      height: 20px;
      font-family: var(--vscode-font-family);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    .clear-btn {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      display: none;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--vscode-input-foreground);
      cursor: pointer;
      opacity: 0.5;
      padding: 2px;
      border-radius: 3px;
    }

    .clear-btn.visible {
      display: flex;
    }


    .clear-btn:hover {
      opacity: 1;
      background: var(--vscode-toolbar-hoverBackground);
    }

    .burger-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      opacity: 0.6;
      padding: 4px;
      margin-left: 4px;
      border-radius: 3px;
      flex-shrink: 0;
    }


    .burger-btn:hover, .burger-btn.active {
      opacity: 1;
      background: var(--vscode-toolbar-hoverBackground);
    }

    /* Dropdown Menu */
    .menu-container {
      position: relative;
    }

    .dropdown-menu {
      position: fixed;
      background: var(--vscode-menu-background);
      color: var(--vscode-menu-foreground);
      border: 1px solid var(--vscode-menu-border);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      z-index: 10000;
      min-width: 160px;
      padding: 4px 0;
      display: none;
    }

    .dropdown-menu.open {
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
  `;

    @property() value = '';
    @property() placeholder = 'Filter...';
    @property({ type: Array }) actions: Array<{ id: string, label: string, danger?: boolean }> = [];

    @state() private menuOpen = false;
    @state() private menuTop = 0;
    @state() private menuLeft = 0;

    @query('input') inputElement!: HTMLInputElement;

    private toggleMenu(e: Event) {
        e.stopPropagation();
        this.menuOpen = !this.menuOpen;

        if (this.menuOpen) {
            const trigger = e.currentTarget as HTMLElement;
            const rect = trigger.getBoundingClientRect();
            this.menuTop = rect.bottom + 4;
            
            // Get the sidebar container to check actual available width
            const sidebarElement = this.closest('.content') || document.querySelector('.content') || document.body;
            const sidebarRect = sidebarElement.getBoundingClientRect();

            // Calculate menu position with improved boundary checking
            let menuLeft = rect.left; // Default to left side positioning
            const menuWidth = 160;
            
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

            // Overflow check
            if (this.menuTop + 100 > window.innerHeight) {
                this.menuTop = rect.top - 100;
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
            detail: { actionId },
            bubbles: true,
            composed: true
        }));
    }


    private handleInput(e: Event) {
        const value = (e.target as HTMLInputElement).value;
        this.value = value;
        this.dispatchEvent(new CustomEvent('filter', {
            detail: { value },
            bubbles: true,
            composed: true
        }));
    }

    private clear() {
        this.value = '';
        this.inputElement.value = '';
        this.inputElement.focus();
        this.dispatchEvent(new CustomEvent('filter', {
            detail: { value: '' },
            bubbles: true,
            composed: true
        }));
    }

    override render() {
        return html`
      <div style="display: flex; align-items: center;">
        <div class="filter-container" style="flex: 1;">
          <div class="search-icon">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.87 11.23l4.13 4.13-0.64 0.64-4.13-4.13c-1.14 0.94-2.61 1.5-4.23 1.5-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7c0 1.62-0.56 3.09-1.5 4.23zM7 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z"/>
            </svg>
          </div>
          <input 
            type="text" 
            .value=${this.value} 
            @input=${this.handleInput}
            placeholder=${this.placeholder}
            spellcheck="false"
          >
          <button 
            class="clear-btn ${this.value ? 'visible' : ''}" 
            @click=${this.clear}
            title="Clear Filter"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8.707l3.646 3.647 0.708-0.707L8.707 8l3.647-3.646-0.707-0.708L8 7.293 4.354 3.646l-0.707 0.708L7.293 8l-3.646 3.646 0.708 0.707L8 8.707z"/>
            </svg>
          </button>
        </div>

        ${this.actions.length > 0 ? html`
          <button 
            class="burger-btn ${this.menuOpen ? 'active' : ''}" 
            @click=${this.toggleMenu}
            title="More actions..."
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"/>
            </svg>
          </button>

          <div 
            class="dropdown-menu ${this.menuOpen ? 'open' : ''}"
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
