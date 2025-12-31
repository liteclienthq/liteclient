/**
 * Tabs Component
 * Reusable tabbed interface
 */

import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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
      overflow: hidden;
    }


    .tab {
      flex: 1;
      min-width: 0;
      padding: 6px 8px;
      font-size: 14px;
      color: var(--vscode-foreground);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.15s, border-color 0.15s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: center;
    }


    .tab:hover {
      opacity: 1;
    }

    .tab.active {
      opacity: 1;
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
