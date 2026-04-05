import { html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';
import './lc-sidebar-item';
import { SidebarItemAction } from './lc-sidebar-item';
import { Environment } from './lc-env-switcher';
import '../../shared/lc-empty-state.js';

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

  `;

  @property({ type: Array }) environments: Environment[] = [];
  @property() filterText = '';
  @property({ type: String }) selectedEnvironmentId: string | null = null;

  @state() private selectedId: string | null = null;

  private environmentActions: SidebarItemAction[] = [
    { id: 'rename', label: 'Rename' },
    { id: 'duplicate', label: 'Duplicate' },
    { id: 'delete', label: 'Delete', danger: true }
  ];

  private globalsActions: SidebarItemAction[] = [
    { id: 'duplicate', label: 'Duplicate' }
  ];

  private selectEnvironment(id: string) {
    this.selectedId = id;
    this.dispatchEvent(new CustomEvent('open-environment-manager', {
      detail: { environmentId: id },
      bubbles: true,
      composed: true
    }));
  }

  private handleEnvAction(e: CustomEvent, envId: string) {
    const { actionId } = e.detail;

    this.dispatchEvent(new CustomEvent('env-action', {
      detail: { action: actionId, id: envId },
      bubbles: true,
      composed: true
    }));
  }

  private matchesFilter(env: Environment, search: string): boolean {
    return env.name.toLowerCase().includes(search);
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
        
        ${filteredEnvironments.length === 0 && !globals ? html`<lc-empty-state
            compact
            icon="env"
            title="No environments"
            description="Create environments to manage variables."
          ></lc-empty-state>` :
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
    const isSelected = this.selectedId === env.id;
    const isGlobals = env.id === 'globals';

    return html`
      <lc-sidebar-item
        .id=${env.id}
        .name=${env.name}
        type="environment"
        .active=${isSelected}
        .depth=${depth}
        .actions=${isGlobals ? this.globalsActions : this.environmentActions}
        @select=${() => this.selectEnvironment(env.id)}
        @action=${(e: CustomEvent) => this.handleEnvAction(e, env.id)}
      ></lc-sidebar-item>
    `;
  }
}
