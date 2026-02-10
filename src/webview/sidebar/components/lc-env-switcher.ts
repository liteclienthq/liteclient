import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';
import './lc-environment-list';

import type { Environment } from '../../../shared/models.js';
export type { Environment };

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

  override render() {
    return html`
      <lc-environment-list
        .environments=${this.environments}
        .filterText=${this.filterText}
        .selectedEnvironmentId=${this.selectedEnvironmentId}
        @set-environment=${(e: CustomEvent) => this.handleEnvSelect(e.detail.environmentId)}
      ></lc-environment-list>
    `;
  }
}
