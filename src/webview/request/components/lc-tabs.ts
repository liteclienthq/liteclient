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
  indicator?: number | 'dot';
}

@customElement('lc-tabs')
export class LcTabs extends LcBaseElement {
  @property({ type: Array }) tabs: Tab[] = [];
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

    .indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 4px;
      font-size: 10px;
      font-weight: 600;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .indicator.dot {
      min-width: 6px;
      width: 6px;
      height: 6px;
      padding: 0;
      border-radius: 50%;
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

  private renderIndicator(indicator?: number | 'dot') {
    if (indicator === undefined) return null;
    if (indicator === 'dot') {
      return html`<span class="indicator dot"></span>`;
    }
    if (indicator > 0) {
      return html`<span class="indicator">${indicator}</span>`;
    }
    return null;
  }

  render() {
    return html`
      <div class="tabs">
        ${this.tabs.map(tab => html`
          <button 
            class="tab ${tab.id === this.activeTab ? 'active' : ''}"
            @click=${() => this.handleTabClick(tab.id)}
          >
            ${tab.label}${this.renderIndicator(tab.indicator)}
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
