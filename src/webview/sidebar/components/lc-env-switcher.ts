import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';
import './lc-environment-list';
import './lc-section-header';
import './lc-env-variables-editor';
import { SectionAction } from './lc-section-header';

export interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
}

@customElement('lc-env-switcher')
export class LcEnvSwitcher extends LcBaseElement {
  static override styles = css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .env-selector {
        padding: 0;
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      .env-item {
        padding: 0 8px;
        cursor: pointer;
        font-size: 13px;
        height: 22px;
        display: flex;
        align-items: center;
        border: 1px solid transparent;
        margin-bottom: 0;
      }

      .env-item:hover {
        background: var(--vscode-list-hoverBackground);
      }

      .env-item.selected {
        background: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
        outline: 1px solid var(--vscode-list-focusOutline);
        outline-offset: -1px;
      }

      select {
        width: 100%;
        background: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
        border: 1px solid var(--vscode-dropdown-border);
        padding: 4px;
        outline: none;
        border-radius: 2px;
      }

      select:focus {
        border-color: var(--vscode-focusBorder);
      }

      .variables {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
        border-top: 1px solid var(--vscode-panel-border);
        margin-top: 8px;
        padding-top: 8px;
      }

      .variables-list {
        display: flex;
        flex-direction: column;
        gap: 0;
        padding: 0;
      }

      .variable {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 12px;
        padding: 4px 12px;
        border-bottom: 1px solid var(--vscode-tree-indentGuidesStroke);
      }

      .variable:last-child {
        border-bottom: none;
      }

      .var-name {
        font-weight: 600;
        color: var(--vscode-variable-foreground);
      }

      .empty-state {
        opacity: 0.5;
        font-size: 12px;
        text-align: center;
        padding: 20px;
        margin: 0;
      }
    `;

  @property({ type: Array }) environments: Environment[] = [];
  @property() filterText = '';
  @property({ type: String }) selectedEnvironmentId: string | null = null;

  @state() private isEditingVariables = false;


  private varSectionActions(isEditing: boolean): SectionAction[] {

    return [
      {
        id: isEditing ? 'save-vars' : 'edit-vars',
        label: isEditing ? 'Save Variables' : 'Edit Variables',
        icon: isEditing
          ? '<path d="M12.924 1.625l1.451 1.451-8.57 8.57-4.183-4.183 1.45-1.451 2.733 2.733 7.119-7.12z"/>'
          : '<path d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM2.41 13.72l1.51-2.63 1.12 1.12-2.63 1.51zM7.1 11.4l-1.5-1.5 7.64-7.64L14.74 3.76 7.1 11.4z"/>'
      }
    ];
  }

  private handleEnvSelect(id: string | null) {
    this.dispatchEvent(new CustomEvent('set-environment', {
      detail: { environmentId: id },
      bubbles: true,
      composed: true
    }));
  }

  private handleEnvChange(e: Event) {
    const id = (e.target as HTMLSelectElement).value || null;
    this.handleEnvSelect(id);
  }


  private handleSectionAction(e: CustomEvent) {
    const { actionId } = e.detail;
    if (actionId === 'edit-vars') {
      this.isEditingVariables = true;
    } else if (actionId === 'save-vars') {
      this.isEditingVariables = false;
      this.saveVariables();
    }
  }



  private pendingVariables: Record<string, string> | null = null;

  private handleVariablesChange(e: CustomEvent) {
    this.pendingVariables = e.detail.variables;
  }

  private saveVariables() {
    if (this.pendingVariables && this.selectedEnvironmentId) {
      this.dispatchEvent(new CustomEvent('env-action', {
        detail: {
          action: 'update-vars',
          id: this.selectedEnvironmentId,
          variables: this.pendingVariables
        },
        bubbles: true,
        composed: true
      }));
      this.pendingVariables = null;
    }
  }

  private handleEnvAction(e: CustomEvent) {
    // Forward the event to the parent component
    this.dispatchEvent(new CustomEvent('env-action', {
      detail: e.detail,
      bubbles: true,
      composed: true
    }));
  }



  override render() {
    const selectedEnv = this.environments.find(e => e.id === this.selectedEnvironmentId);

    return html`
      <lc-environment-list
        .environments=${this.environments}
        .filterText=${this.filterText}
        .selectedEnvironmentId=${this.selectedEnvironmentId}
        @set-environment=${(e: CustomEvent) => this.handleEnvSelect(e.detail.environmentId)}
        @env-action=${this.handleEnvAction}
      ></lc-environment-list>
    `;
  }
}
