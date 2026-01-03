/**
 * Headers Table Component
 * Displays response headers in a clean table format
 */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';

@customElement('lc-headers-table')
export class LcHeadersTable extends LcBaseElement {
  @property({ type: Object }) headers: Record<string, string> = {};

  static styles = css`
    :host {
      display: block;
      overflow: auto;
      flex: 1;
      height: 100%;
    }

    .headers-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .headers-table th,
    .headers-table td {
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .headers-table th {
      color: var(--vscode-descriptionForeground);
      font-weight: 500;
      background: var(--vscode-editor-background);
      position: sticky;
      top: 0;
      z-index: 1;
    }


    .header-key {
      color: var(--vscode-symbolIcon-propertyForeground, #9cdcfe);
      font-family: var(--vscode-editor-font-family);
    }

    .header-value {
      color: var(--vscode-foreground);
      font-family: var(--vscode-editor-font-family);
      word-break: break-all;
    }

    .empty-state {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      padding: 12px;
    }
  `;

  private get sortedHeaders(): Array<[string, string]> {
    return Object.entries(this.headers).sort(([a], [b]) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }

  render() {
    if (Object.keys(this.headers).length === 0) {
      return html`<div class="empty-state">No headers to display</div>`;
    }

    return html`
      <table class="headers-table">
        <thead>
          <tr>
            <th>Header</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${this.sortedHeaders.map(([key, value]) => html`
            <tr>
              <td class="header-key">${key}</td>
              <td class="header-value">${value}</td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-headers-table': LcHeadersTable;
  }
}
