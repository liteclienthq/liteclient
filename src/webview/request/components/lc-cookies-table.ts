/**
 * Cookies Table Component
 * Displays response cookies in a table format
 */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import type { ParsedCookie } from '../../shared/messaging.js';

@customElement('lc-cookies-table')
export class LcCookiesTable extends LcBaseElement {
  @property({ type: Array }) cookies: ParsedCookie[] = [];

  static styles = css`
    :host {
      display: block;
      overflow: auto;
      flex: 1;
      height: 100%;
    }

    .cookies-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .cookies-table th,
    .cookies-table td {
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-panel-border);
      white-space: nowrap;
    }

    .cookies-table th {
      color: var(--vscode-descriptionForeground);
      font-weight: 500;
      background: var(--vscode-editor-background);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .cookie-name {
      color: var(--vscode-symbolIcon-propertyForeground, #9cdcfe);
      font-family: var(--vscode-editor-font-family);
      font-weight: 500;
    }

    .cookie-value {
      color: var(--vscode-foreground);
      font-family: var(--vscode-editor-font-family);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cookie-attr {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
    }

    .cookie-flag {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 2px;
      font-size: 10px;
      font-weight: 500;
      margin-right: 4px;
    }

    .flag-secure {
      background: var(--vscode-charts-green, #4ec9b0);
      color: var(--vscode-editor-background);
    }

    .flag-httponly {
      background: var(--vscode-charts-blue, #569cd6);
      color: var(--vscode-editor-background);
    }

    .empty-state {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      padding: 12px;
    }
  `;

  private formatExpires(expires?: string): string {
    if (!expires) return '-';
    if (expires === 'Session') return 'Session';
    
    try {
      const date = new Date(expires);
      return date.toLocaleString();
    } catch {
      return expires;
    }
  }

  render() {
    if (this.cookies.length === 0) {
      return html`<div class="empty-state">No cookies in this response</div>`;
    }

    return html`
      <table class="cookies-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
            <th>Domain</th>
            <th>Path</th>
            <th>Expires</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          ${this.cookies.map(cookie => html`
            <tr>
              <td class="cookie-name">${cookie.name}</td>
              <td class="cookie-value" title="${cookie.value}">${cookie.value}</td>
              <td class="cookie-attr">${cookie.domain || '-'}</td>
              <td class="cookie-attr">${cookie.path || '-'}</td>
              <td class="cookie-attr">${this.formatExpires(cookie.expires)}</td>
              <td>
                ${cookie.secure ? html`<span class="cookie-flag flag-secure">Secure</span>` : ''}
                ${cookie.httpOnly ? html`<span class="cookie-flag flag-httponly">HttpOnly</span>` : ''}
                ${cookie.sameSite ? html`<span class="cookie-flag">${cookie.sameSite}</span>` : ''}
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-cookies-table': LcCookiesTable;
  }
}
