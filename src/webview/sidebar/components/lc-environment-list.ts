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

    .env-container {
      display: flex;
      flex-direction: column;
    }

    .vars-container {
      display: none;
    }

    .vars-container.open {
      display: flex;
      flex-direction: column;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px 8px;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      text-align: center;
      opacity: 0.6;
    }


  `;

  @property({ type: Array }) environments: Environment[] = [];
  @property() filterText = '';
  @property({ type: String }) selectedEnvironmentId: string | null = null;

  @state() private openItems = new Set<string>();
  @state() private selectedId: string | null = null;

  private environmentActions: SidebarItemAction[] = [
    { id: 'add-variable', label: 'Add Variable' },
    { id: 'rename', label: 'Rename' },
    { id: 'delete', label: 'Delete', danger: true }
  ];

  private globalsActions: SidebarItemAction[] = [
    { id: 'add-variable', label: 'Add Variable' }
  ];

  private variableActions: SidebarItemAction[] = [
    { id: 'edit-variable', label: 'Edit' },
    { id: 'delete-variable', label: 'Delete', danger: true }
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

  private selectEnvironment(id: string) {
    this.selectedId = id;
    this.toggleEnvVariables(id);
  }

  private handleEnvAction(e: CustomEvent, envId: string) {
    const { actionId } = e.detail;

    if (actionId === 'add-variable') {
      this.dispatchEvent(new CustomEvent('env-variable-action', {
        detail: { action: 'add-variable', envId },
        bubbles: true,
        composed: true
      }));
    } else {
      this.dispatchEvent(new CustomEvent('env-action', {
        detail: { action: actionId, id: envId },
        bubbles: true,
        composed: true
      }));
    }
  }

  private handleVariableAction(e: CustomEvent, envId: string, varName: string) {
    const { actionId } = e.detail;
    this.dispatchEvent(new CustomEvent('env-variable-action', {
      detail: { action: actionId, envId, varName },
      bubbles: true,
      composed: true
    }));
  }

  private matchesFilter(env: Environment, search: string): boolean {
    if (env.name.toLowerCase().includes(search)) { return true; }
    return Object.keys(env.variables).some(key =>
      key.toLowerCase().includes(search) || env.variables[key].toLowerCase().includes(search)
    );
  }

  override willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has('selectedEnvironmentId')) {
      this.selectedId = this.selectedEnvironmentId;
    }
  }

  override render() {
    const filteredEnvironments = this.environments.filter(env => env.id !== 'globals');
    const globals = this.environments.find(env => env.id === 'globals');

    return html`
      <div class="environment-list" role="tree" aria-label="Environments">
        ${globals ? this.renderEnvironment(globals, 0) : ''}
        
        ${filteredEnvironments.length === 0 && !globals ? html`<div class="empty-state">No environments</div>` :
        filteredEnvironments.map(env => {
          const search = this.filterText.toLowerCase();
          if (this.filterText && !this.matchesFilter(env, search)) {
            return html``;
          }
          return this.renderEnvironment(env, 0);
        })
      }
      </div>
    `;
  }

  private renderEnvironment(env: Environment, depth: number): TemplateResult {
    const isOpen = this.openItems.has(env.id) || !!this.filterText;
    const isSelected = this.selectedId === env.id;
    const isGlobals = env.id === 'globals';

    return html`
      <div class="env-container">
        <lc-sidebar-item
          .id=${env.id}
          .name=${env.name}
          type="environment"
          .active=${isSelected}
          .expanded=${isOpen}
          .depth=${depth}
          .actions=${isGlobals ? this.globalsActions : this.environmentActions}
          @select=${() => this.selectEnvironment(env.id)}
          @toggle=${() => this.toggleEnvVariables(env.id)}
          @action=${(e: CustomEvent) => this.handleEnvAction(e, env.id)}
        ></lc-sidebar-item>
        
        <div class="vars-container ${isOpen ? 'open' : ''}">
          ${Object.entries(env.variables).length === 0 ?
        html`<div class="empty-state" style="padding-left: ${(depth + 2) * 12}px">No variables</div>` :
        Object.entries(env.variables).map(([key, value]) => html`
              <lc-sidebar-item
                .id="${env.id}-${key}"
                .name=${key}
                .details=${value}
                type="variable"
                .depth=${depth + 1}
                .actions=${this.variableActions}
                @select=${() => this.handleVariableAction(new CustomEvent('action', { detail: { actionId: 'edit-variable' } }), env.id, key)}
                @action=${(e: CustomEvent) => this.handleVariableAction(e, env.id, key)}
              ></lc-sidebar-item>
            `)
      }
        </div>
      </div>
    `;
  }
}