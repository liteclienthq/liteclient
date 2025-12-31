import { html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';
import './lc-sidebar-item';
import { SidebarItemAction } from './lc-sidebar-item';
import { Environment } from './lc-env-switcher';

@customElement('lc-environment-list')
export class LcEnvironmentList extends LcBaseElement {
  static override styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .environment-list {
      display: flex;
      flex-direction: column;
      padding-top: 4px;
    }

    .environment-item {
      display: flex;
      flex-direction: column;
    }

    .env-header {
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

    .env-header:hover {
      background: var(--vscode-list-hoverBackground);
      color: var(--vscode-list-hoverForeground);
      outline: 1px solid var(--vscode-list-hoverOutline);
    }

    .env-header.selected {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
      border: 1px solid var(--vscode-list-activeSelectionBackground);
    }

    .env-header:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .env-header.selected:focus-visible {
      outline: 1px solid var(--vscode-list-focusOutline);
      outline-offset: -1px;
    }

    .env-content {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      padding: 0 2px;
      overflow: hidden;
      gap: 4px;
    }

    .env-active-badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 50%;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      margin-left: 4px;
      flex-shrink: 0;
    }

    .env-expander {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      opacity: 0.6;
      transition: transform 0.15s ease;
    }

    .env-expander:hover {
      opacity: 0.8;
    }

    .env-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 13px;
    }

    .env-actions {
      display: none;
      opacity: 0.6;
      margin-left: 4px;
      flex-shrink: 0;
      position: relative;
      z-index: 10;
      pointer-events: auto;
    }

    .env-header:hover .env-actions {
      display: flex;
      opacity: 1;
    }

    .env-actions button {
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

    .env-actions button:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .env-variables {
      display: none;
      padding: 8px 8px 8px 24px;
      font-size: 12px;
      background: var(--vscode-editor-background);
      border-left: 1px solid var(--vscode-panel-border);
      margin-top: 2px;
      animation: slideDown 0.15s ease-out;
    }

    .env-variables.open {
      display: block;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .variable {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 6px 8px;
      border-bottom: 1px solid var(--vscode-tree-indentGuidesStroke);
      position: relative;
      transition: background-color 0.15s ease;
    }

    .variable::after {
      content: '⋮';
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.3;
      font-size: 16px;
      transition: opacity 0.15s ease;
    }

    .variable:hover::after {
      opacity: 0;
    }

    .variable:hover {
      background: var(--vscode-list-hoverBackground);
      border-radius: 3px;
      cursor: pointer;
    }

    .variable:last-child {
      border-bottom: none;
    }

    .var-name {
      font-weight: 600;
      color: var(--vscode-variable-foreground);
      font-size: 12px;
    }

    .var-value {
      color: var(--vscode-descriptionForeground);
      word-break: break-word;
      padding-right: 60px; /* Space for actions */
      font-size: 11px;
    }

    .env-actions {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .variable:hover .env-actions {
      opacity: 1;
    }

    .env-actions button {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      border-radius: 3px;
      position: relative;
      z-index: 2;
      transition: all 0.15s ease;
    }

    .env-actions button:hover {
      background: var(--vscode-toolbar-hoverBackground);
      transform: scale(1.1);
    }

    /* Inline editing styles */
    .editing {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px 8px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
    }

    .editing input {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 2px 4px;
      font-size: 12px;
      border-radius: 2px;
      outline: none;
    }

    .editing input:focus {
      border-color: var(--vscode-focusBorder);
    }

    .editing-buttons {
      display: flex;
      gap: 4px;
      margin-top: 4px;
    }

    .editing-buttons button {
      padding: 2px 6px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 2px;
      cursor: pointer;
      font-size: 11px;
    }

    .editing-buttons button:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .editing-buttons .save-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .editing-buttons .save-btn:hover {
      background: var(--vscode-button-hoverBackground);
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

    .add-variable-btn {
      padding: 8px;
      margin-top: 4px;
      display: flex;
      justify-content: center;
    }

    .add-variable {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 4px 12px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }
    
    .add-variable:hover {
      background: var(--vscode-button-hoverBackground);
      transform: translateY(-1px);
    }
    
    .add-variable:active {
      transform: translateY(0);
    }
    
    .add-variable-icon {
      font-size: 12px;
    }



    /* Improved empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px 8px;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      text-align: center;
      border: 1px dashed var(--vscode-panel-border);
      border-radius: 4px;
      margin-top: 4px;
      background: var(--vscode-editor-background);
    }

    .empty-state-icon {
      font-size: 24px;
      margin-bottom: 8px;
      opacity: 0.6;
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
    
    .menu-item.danger:hover {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-errorForeground);
    }
  `;

  @property({ type: Array }) environments: Environment[] = [];
  @property() filterText = '';
  @property({ type: String }) selectedEnvironmentId: string | null = null;

  @state() private openItems = new Set<string>();
  @state() private selectedId: string | null = null;
  @state() private menuOpenId: string | null = null;
  @state() private menuTop = 0;
  @state() private menuLeft = 0;
  @state() private editingVar: { envId: string; varName: string; varValue: string } | null = null;

  private environmentActions: SidebarItemAction[] = [
    { id: 'rename', label: 'Rename' },
    { id: 'delete', label: 'Delete', danger: true },
    { id: 'add-variable', label: 'Add Variable' }
  ];

  private variableActions: SidebarItemAction[] = [
    { id: 'edit-variable', label: 'Edit Variable' },
    { id: 'delete-variable', label: 'Delete Variable', danger: true }
  ];

  private toggleEnvVariables(id: string) {
    const newOpen = new Set(this.openItems);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    this.openItems = newOpen;
  }

  private toggleEnvironment(id: string) {
    // Toggle expansion state
    this.toggleEnvVariables(id);
    // Also select the environment when clicked
    this.selectEnvironment(id);
  }

  private selectEnvironment(id: string) {
    this.selectedId = id;
    this.dispatchEvent(new CustomEvent('set-environment', {
      detail: { environmentId: id },
      bubbles: true,
      composed: true
    }));
  }

  private handleMenu(e: Event, id: string, isVariable: boolean = false) {
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
        window.removeEventListener('blur', closeMenu);
      }, 0);
    }
  }

  private startEditingVariable(envId: string, varName: string, varValue: string) {
    this.editingVar = { envId, varName, varValue };
  }

  private cancelEditing() {
    this.editingVar = null;
  }

  private saveEditedVariable() {
    if (this.editingVar) {
      this.dispatchEvent(new CustomEvent('env-variable-action', {
        detail: {
          action: 'edit-variable',
          envId: this.editingVar.envId,
          varName: this.editingVar.varName,
          newValue: this.editingVar.varValue
        },
        bubbles: true,
        composed: true
      }));
      this.editingVar = null;
    }
  }

  private handleMenuAction(e: Event, actionId: string, envId: string, varName?: string) {
    e.stopPropagation();
    this.menuOpenId = null;

    // Dispatch events based on action
    if (varName) {
      // Variable action
      if (actionId === 'edit-variable' && varName) {
        // Find the current value for this variable
        const env = this.environments.find(e => e.id === envId);
        if (env && env.variables[varName] !== undefined) {
          this.startEditingVariable(envId, varName, env.variables[varName]);
        }
      } else {
        this.dispatchEvent(new CustomEvent('env-variable-action', {
          detail: { action: actionId, envId, varName },
          bubbles: true,
          composed: true
        }));
      }
    } else {
      // Environment action
      if (actionId === 'add-variable') {
        // For add-variable action, start adding a variable to the environment
        this.startAddingVariable(envId);
      } else {
        this.dispatchEvent(new CustomEvent('env-action', {
          detail: { action: actionId, id: envId },
          bubbles: true,
          composed: true
        }));
      }
    }
  }

  private matchesFilter(env: Environment, search: string): boolean {
    if (env.name.toLowerCase().includes(search)) { return true; }
    return Object.keys(env.variables).some(key =>
      key.toLowerCase().includes(search) || env.variables[key].toLowerCase().includes(search)
    );
  }



  private startAddingVariable(envId: string) {
    // Dispatch event to trigger native VS Code input boxes
    this.dispatchEvent(new CustomEvent('env-variable-action', {
      detail: {
        action: 'add-variable',
        envId: envId
      },
      bubbles: true,
      composed: true
    }));
  }



  private renderVariable(envId: string, key: string, value: string) {
    // Check if this variable is currently being edited
    const isEditing = this.editingVar &&
                     this.editingVar.envId === envId &&
                     this.editingVar.varName === key;

    if (isEditing) {
      return html`
        <div class="editing">
          <div>
            <label>Key:</label>
            <input type="text" .value="${key}" readonly />
          </div>
          <div>
            <label>Value:</label>
            <input
              type="text"
              .value="${this.editingVar!.varValue}"
              @input="${(e: Event) => {
                if (this.editingVar) {
                  this.editingVar = {
                    ...this.editingVar,
                    varValue: (e.target as HTMLInputElement).value
                  };
                }
              }}"
            />
          </div>
          <div class="editing-buttons">
            <button class="save-btn" @click="${this.saveEditedVariable}">Save</button>
            <button @click="${this.cancelEditing}">Cancel</button>
          </div>
        </div>
      `;
    } else {
      return html`
        <div class="variable">
          <span class="var-name">${key}</span>
          <span class="var-value">${value}</span>
          <div class="env-actions">
            <button @click=${(e: Event) => this.handleMenu(e, `${envId}-${key}`, true)} title="Click to edit or delete variable (${key})">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
              </svg>
            </button>
          </div>
          <div
            class="context-menu ${this.menuOpenId === `${envId}-${key}` ? 'open' : ''}"
            style="top: ${this.menuTop}px; left: ${this.menuLeft}px;"
          >
            ${this.variableActions.map(action => html`
              <div
                class="menu-item ${action.danger ? 'danger' : ''}"
                @click=${(e: Event) => this.handleMenuAction(e, action.id, envId, key)}
              >
                ${action.label}
              </div>
            `)}
          </div>
        </div>
      `;
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    // Add event listener to close context menu when clicking outside
    document.addEventListener('click', this.handleDocumentClick);
    
    // Initialize selected ID from the property
    if (this.selectedEnvironmentId) {
      this.selectedId = this.selectedEnvironmentId;
    }
  }

  override willUpdate(changedProperties: Map<string, any>) {
    super.willUpdate(changedProperties);
    
    // Sync selectedId when selectedEnvironmentId changes
    if (changedProperties.has('selectedEnvironmentId') && this.selectedEnvironmentId) {
      this.selectedId = this.selectedEnvironmentId;
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    // Remove event listener when component is disconnected
    document.removeEventListener('click', this.handleDocumentClick);
  }

  private handleDocumentClick = (e: Event) => {
    // Close context menu if clicking outside of it
    if (this.menuOpenId && !(e.target as Element).closest('.context-menu, .env-actions button')) {
      this.menuOpenId = null;
    }
  };

  override render() {
    return html`
      <div class="environment-list">
        ${this.environments.length === 0 ? html`<div class="empty-state">No environments</div>` :
        this.environments.map(env => {
          // Filter Logic
          const search = this.filterText.toLowerCase();
          if (this.filterText) {
            if (!this.matchesFilter(env, search)) { return html``; }
          }

          const isOpen = this.openItems.has(env.id) || !!this.filterText; // Expand all on search
          const isSelected = this.selectedId === env.id;

          return html`
            <div class="environment-item" data-env-id="${env.id}">
              <div class="env-header ${isSelected ? 'selected' : ''}"
                   @click=${() => this.toggleEnvironment(env.id)}
                   role="treeitem"
                   aria-expanded="${isOpen}"
                   aria-level="1"
                   aria-selected="${isSelected}"
                   tabindex="${isSelected ? '0' : '-1'}">
                <div class="env-content">
                  <span class="env-expander">
                    ${isOpen ? html`<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M9.5 3.5L6 7l-3.5-3.5L1 6l5 5 5-5-1.5-1.5z"/>
                    </svg>` : html`<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M3.5 9.5L7 6l3.5 3.5L9 11l-5-5-5 5 1.5-1.5z"/>
                    </svg>`}
                  </span>
                  <span class="env-label">${env.name}</span>
                  ${isSelected ? html`<span class="env-active-badge" title="Active Environment">✓</span>` : ''}
                </div>
                <div class="env-actions">
                  <button @click=${(e: Event) => this.handleMenu(e, env.id)} title="More actions">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                    </svg>
                  </button>
                </div>
                <div
                  class="context-menu ${this.menuOpenId === env.id ? 'open' : ''}"
                  style="top: ${this.menuTop}px; left: ${this.menuLeft}px;"
                >
                  ${this.environmentActions.map(action => html`
                    <div
                      class="menu-item ${action.danger ? 'danger' : ''}"
                      @click=${(e: Event) => this.handleMenuAction(e, action.id, env.id)}
                    >
                      ${action.label}
                    </div>
                  `)}
                </div>
              </div>
              <div class="env-variables ${isOpen ? 'open' : ''}">
                ${Object.entries(env.variables).map(([key, value]) => this.renderVariable(env.id, key, value))}

                ${Object.keys(env.variables).length === 0 ? html`
                  <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div>No variables defined</div>
                    <div style="font-size: 10px; margin-top: 4px; opacity: 0.7;">
                      Click "Add Variable" to get started
                    </div>
                  </div>
                ` : ''}
                <div class="add-variable-btn">
                  <button @click="${() => this.startAddingVariable(env.id)}" class="add-variable">
                    <span class="add-variable-icon">+</span>
                    <span>Add Variable</span>
                  </button>
                </div>
              </div>
            </div>
          `;
        })
      }
      </div>
    `;
  }
}