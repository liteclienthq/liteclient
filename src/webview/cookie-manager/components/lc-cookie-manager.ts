import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import type { DomainCookies, ParsedCookie } from '../../../shared/models.js';
import { postMessage } from '../../shared/messaging.js';

@customElement('lc-cookie-manager')
export class LcCookieManager extends LcBaseElement {
    @property({ type: Array }) domains: DomainCookies[] = [];
    @state() private expandedDomains = new Set<string>();

    static styles = css`
        :host {
            display: block;
            padding: 16px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            height: 100vh;
            box-sizing: border-box;
            overflow: auto;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .title {
            font-size: 16px;
            font-weight: 600;
        }

        .clear-all-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .clear-all-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .empty-state {
            text-align: center;
            padding: 48px 16px;
            color: var(--vscode-descriptionForeground);
        }

        .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .domain-section {
            margin-bottom: 8px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
        }

        .domain-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            background: var(--vscode-editor-background);
            cursor: pointer;
            user-select: none;
        }

        .domain-header:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .domain-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .chevron {
            font-size: 12px;
            transition: transform 0.15s;
        }

        .chevron.expanded {
            transform: rotate(90deg);
        }

        .domain-name {
            font-weight: 500;
            font-family: var(--vscode-editor-font-family);
        }

        .cookie-count {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 10px;
        }

        .domain-actions {
            display: flex;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.15s;
        }

        .domain-header:hover .domain-actions {
            opacity: 1;
        }

        .action-btn {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
        }

        .action-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }

        .action-btn.delete {
            color: var(--vscode-errorForeground);
        }

        .cookies-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        .cookies-table th,
        .cookies-table td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .cookies-table th {
            background: var(--vscode-editorWidget-background);
            color: var(--vscode-descriptionForeground);
            font-weight: 500;
            font-size: 11px;
            text-transform: uppercase;
        }

        .cookies-table tr:last-child td {
            border-bottom: none;
        }

        .cookies-table tr:hover td {
            background: var(--vscode-list-hoverBackground);
        }

        .cookie-name {
            color: var(--vscode-symbolIcon-propertyForeground, #9cdcfe);
            font-family: var(--vscode-editor-font-family);
            font-weight: 500;
        }

        .cookie-value {
            font-family: var(--vscode-editor-font-family);
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .cookie-attr {
            color: var(--vscode-descriptionForeground);
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

        .delete-cookie-btn {
            background: none;
            border: none;
            color: var(--vscode-errorForeground);
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 3px;
            opacity: 0;
            transition: opacity 0.15s;
        }

        .cookies-table tr:hover .delete-cookie-btn {
            opacity: 1;
        }

        .delete-cookie-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }
    `;

    private toggleDomain(domain: string) {
        if (this.expandedDomains.has(domain)) {
            this.expandedDomains.delete(domain);
        } else {
            this.expandedDomains.add(domain);
        }
        this.requestUpdate();
    }

    private deleteCookie(domain: string, name: string, e: Event) {
        e.stopPropagation();
        postMessage({ type: 'delete-cookie', domain, name } as any);
    }

    private deleteDomainCookies(domain: string, e: Event) {
        e.stopPropagation();
        postMessage({ type: 'delete-domain-cookies', domain } as any);
    }

    private clearAll() {
        postMessage({ type: 'clear-all-cookies' } as any);
    }

    private formatExpires(expires?: string): string {
        if (!expires) {
            return '-';
        }
        if (expires === 'Session') {
            return 'Session';
        }
        try {
            const date = new Date(expires);
            return date.toLocaleString();
        } catch {
            return expires;
        }
    }

    private getTotalCookieCount(): number {
        return this.domains.reduce((sum, d) => sum + d.cookies.length, 0);
    }

    render() {
        const totalCookies = this.getTotalCookieCount();

        return html`
            <div class="header">
                <span class="title">Cookie Manager (${totalCookies} cookies)</span>
                ${totalCookies > 0 ? html`
                    <button class="clear-all-btn" @click=${this.clearAll}>
                        Clear All Cookies
                    </button>
                ` : ''}
            </div>

            ${this.domains.length === 0 ? html`
                <div class="empty-state">
                    <div class="empty-icon">🍪</div>
                    <div>No cookies stored</div>
                    <div style="margin-top: 8px; font-size: 12px;">
                        Cookies will appear here after making requests to servers that set cookies.
                    </div>
                </div>
            ` : ''}

            ${this.domains.map(domainData => this.renderDomain(domainData))}
        `;
    }

    private renderDomain(domainData: DomainCookies) {
        const isExpanded = this.expandedDomains.has(domainData.domain);

        return html`
            <div class="domain-section">
                <div class="domain-header" @click=${() => this.toggleDomain(domainData.domain)}>
                    <div class="domain-left">
                        <span class="chevron ${isExpanded ? 'expanded' : ''}">▶</span>
                        <span class="domain-name">${domainData.domain}</span>
                        <span class="cookie-count">${domainData.cookies.length}</span>
                    </div>
                    <div class="domain-actions">
                        <button class="action-btn delete" @click=${(e: Event) => this.deleteDomainCookies(domainData.domain, e)}>
                            Delete All
                        </button>
                    </div>
                </div>
                ${isExpanded ? html`
                    <table class="cookies-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Value</th>
                                <th>Path</th>
                                <th>Expires</th>
                                <th>Flags</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${domainData.cookies.map(cookie => this.renderCookie(domainData.domain, cookie))}
                        </tbody>
                    </table>
                ` : ''}
            </div>
        `;
    }

    private renderCookie(domain: string, cookie: ParsedCookie) {
        return html`
            <tr>
                <td class="cookie-name">${cookie.name}</td>
                <td class="cookie-value" title="${cookie.value}">${cookie.value}</td>
                <td class="cookie-attr">${cookie.path || '/'}</td>
                <td class="cookie-attr">${this.formatExpires(cookie.expires)}</td>
                <td>
                    ${cookie.secure ? html`<span class="cookie-flag flag-secure">Secure</span>` : ''}
                    ${cookie.httpOnly ? html`<span class="cookie-flag flag-httponly">HttpOnly</span>` : ''}
                    ${cookie.sameSite ? html`<span class="cookie-flag">${cookie.sameSite}</span>` : ''}
                </td>
                <td>
                    <button class="delete-cookie-btn" @click=${(e: Event) => this.deleteCookie(domain, cookie.name, e)} title="Delete cookie">
                        ✕
                    </button>
                </td>
            </tr>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'lc-cookie-manager': LcCookieManager;
    }
}
