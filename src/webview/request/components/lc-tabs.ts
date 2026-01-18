/**
 * Tabs Component
 * Reusable tabbed interface
 */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';

export interface Tab {
  id: string;
  label: string;
}

@customElement('lc-tabs')
export class LcTabs extends LcBaseElement {
  @property({ type: Array }) tabs: Array<{ id: string, label: string }> = [];
  @property({ type: String }) activeTab = '';

  static styles = css`
    .tabs {
      display: flex;
      gap: 0;
      width: 100%;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .tab {
      flex: 1 1 0;
      min-width: 0;
      padding: 6px 4px;
      font-size: 13px;
      font-weight: 600;
      color: var(--vscode-foreground);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      opacity: 0.6;
      white-space: nowrap;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tab.active {
      opacity: 1;
      color: var(--vscode-foreground);
      border-bottom-color: var(--vscode-focusBorder);
    }
  `;

  private handleTabClick(tabId: string) {
    this.activeTab = tabId;
    this.dispatchEvent(new CustomEvent('tab-change', {
      detail: { tabId },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div class="tabs">
        ${this.tabs.map(tab => html`
          <button 
            class="tab ${tab.id === this.activeTab ? 'active' : ''}"
            @click=${() => this.handleTabClick(tab.id)}
          >
            ${tab.label}
          </button>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-tabs': LcTabs;
  }
}
