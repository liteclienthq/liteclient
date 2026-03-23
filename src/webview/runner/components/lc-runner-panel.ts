import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import { postMessage } from '../../shared/messaging.js';

interface RunRequestResult {
    requestName: string;
    method: string;
    url: string;
    status: string;
    durationMs: number;
    responseBody: string;
    responseHeaders: Record<string, string>;
    responseContentType: string;
    testResults: Array<{ name: string; passed: boolean; error?: string }>;
    consoleLogs: Array<{ level: string; args: string[] }>;
    passed: boolean;
    error?: string;
    scriptError?: string;
}

interface RunSummary {
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
}

@customElement('lc-runner-panel')
export class LcRunnerPanel extends LcBaseElement {
    @property({ type: String }) collectionName = '';
    @property({ type: String }) folderName: string | undefined;
    @property({ type: Number }) totalRequests = 0;
    @property({ type: String }) environmentName: string | undefined;

    @state() private running = false;
    @state() private results: RunRequestResult[] = [];
    @state() private current = 0;
    @state() private total = 0;
    @state() private summary: RunSummary | null = null;
    @state() private error = '';
    @state() private expandedIndex: number | null = null;

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
            align-items: flex-start;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .header-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .title {
            font-size: 16px;
            font-weight: 600;
        }

        .subtitle {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .header-actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }

        .run-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 14px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
        }

        .run-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .run-btn:disabled {
            opacity: 0.5;
            cursor: default;
        }

        .cancel-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 6px 14px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .cancel-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .progress-bar-container {
            margin-bottom: 16px;
        }

        .progress-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
        }

        .progress-track {
            height: 4px;
            background: var(--vscode-progressBar-background, var(--vscode-editorWidget-background));
            border-radius: 2px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: var(--vscode-progressBar-background, var(--vscode-button-background));
            border-radius: 2px;
            transition: width 0.2s ease;
        }

        .error-banner {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder, var(--vscode-editorError-foreground));
            padding: 8px 12px;
            margin-bottom: 16px;
            border-radius: 2px;
            font-size: 12px;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .results-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 16px;
        }

        .results-table th,
        .results-table td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .results-table th {
            background: var(--vscode-editorWidget-background);
            color: var(--vscode-descriptionForeground);
            font-weight: 500;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            position: sticky;
            top: 0;
        }

        .result-row {
            cursor: pointer;
        }

        .result-row:hover td {
            background: var(--vscode-list-hoverBackground);
        }

        .status-icon {
            font-size: 13px;
            flex-shrink: 0;
        }

        .status-icon.passed {
            color: var(--vscode-testing-iconPassed, #4ec9b0);
        }

        .status-icon.failed {
            color: var(--vscode-testing-iconFailed, var(--vscode-editorError-foreground));
        }

        .method-badge {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
            font-family: var(--vscode-editor-font-family);
            text-transform: uppercase;
        }

        .method-get { background: rgba(78, 201, 176, 0.15); color: #4ec9b0; }
        .method-post { background: rgba(206, 145, 62, 0.15); color: #ce913e; }
        .method-put { background: rgba(86, 156, 214, 0.15); color: #569cd6; }
        .method-delete { background: rgba(244, 78, 78, 0.15); color: #f44e4e; }
        .method-patch { background: rgba(180, 120, 220, 0.15); color: #b478dc; }

        .request-name {
            font-weight: 500;
        }

        .status-code {
            font-family: var(--vscode-editor-font-family);
        }

        .duration {
            color: var(--vscode-descriptionForeground);
            font-family: var(--vscode-editor-font-family);
        }

        .expanded-content {
            background: var(--vscode-editor-background);
        }

        .expanded-content td {
            padding: 12px 16px;
        }

        .expanded-section {
            margin-bottom: 8px;
        }

        .expanded-section:last-child {
            margin-bottom: 0;
        }

        .section-title {
            font-weight: 500;
            color: var(--vscode-descriptionForeground);
            padding: 4px 0 6px;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }

        .test-row {
            display: flex;
            align-items: baseline;
            gap: 6px;
            padding: 3px 0;
            line-height: 1.4;
        }

        .test-icon {
            flex-shrink: 0;
            font-size: 13px;
        }

        .test-icon.passed {
            color: var(--vscode-testing-iconPassed, #4ec9b0);
        }

        .test-icon.failed {
            color: var(--vscode-testing-iconFailed, var(--vscode-editorError-foreground));
        }

        .test-error {
            color: var(--vscode-editorError-foreground);
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            padding-left: 20px;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .console-entry {
            font-family: var(--vscode-editor-font-family);
            padding: 2px 0;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .console-entry.warn {
            color: var(--vscode-editorWarning-foreground);
        }

        .console-entry.error {
            color: var(--vscode-editorError-foreground);
        }

        .request-error {
            color: var(--vscode-editorError-foreground);
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            padding: 4px 0;
        }

        .summary-bar {
            display: flex;
            gap: 16px;
            align-items: center;
            padding: 12px 16px;
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }

        .summary-total {
            color: var(--vscode-foreground);
        }

        .summary-passed {
            color: var(--vscode-testing-iconPassed, #4ec9b0);
        }

        .summary-failed {
            color: var(--vscode-testing-iconFailed, var(--vscode-editorError-foreground));
        }

        .summary-duration {
            color: var(--vscode-descriptionForeground);
            margin-left: auto;
            font-family: var(--vscode-editor-font-family);
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

        .response-body {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            background: var(--vscode-textCodeBlock-background, var(--vscode-editor-background));
            border: 1px solid var(--vscode-panel-border);
            border-radius: 2px;
            padding: 8px 12px;
            margin: 4px 0 0;
            white-space: pre-wrap;
            word-break: break-word;
            max-height: 300px;
            overflow: auto;
        }

        .response-headers {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }

        .header-row {
            display: flex;
            gap: 8px;
            padding: 2px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .header-key {
            color: var(--vscode-debugTokenExpression-name, var(--vscode-foreground));
            font-weight: 500;
            min-width: 140px;
            flex-shrink: 0;
        }

        .header-value {
            color: var(--vscode-debugTokenExpression-string, var(--vscode-descriptionForeground));
            word-break: break-all;
        }

        .chevron {
            font-size: 10px;
            display: inline-block;
            transition: transform 0.15s;
            margin-right: 4px;
        }

        .chevron.expanded {
            transform: rotate(90deg);
        }
    `;

    handleProgress(message: any) {
        this.results = [...this.results, message.result];
        this.current = message.current;
        this.total = message.total;
    }

    handleComplete(message: any) {
        this.summary = message.summary;
        this.results = message.results;
        this.running = false;
    }

    handleError(error: string) {
        this.error = error;
        this.running = false;
    }

    private startRun() {
        this.results = [];
        this.summary = null;
        this.error = '';
        this.current = 0;
        this.total = this.totalRequests;
        this.expandedIndex = null;
        this.running = true;
        postMessage({ type: 'runner-start' } as any);
    }

    private cancelRun() {
        postMessage({ type: 'runner-cancel' } as any);
    }

    private toggleExpanded(index: number) {
        this.expandedIndex = this.expandedIndex === index ? null : index;
    }

    private getMethodClass(method: string): string {
        switch (method.toUpperCase()) {
            case 'GET': return 'method-get';
            case 'POST': return 'method-post';
            case 'PUT': return 'method-put';
            case 'DELETE': return 'method-delete';
            case 'PATCH': return 'method-patch';
            default: return '';
        }
    }

    private formatDuration(ms: number): string {
        if (ms < 1000) {
            return `${ms} ms`;
        }
        return `${(ms / 1000).toFixed(2)} s`;
    }

    render() {
        return html`
            ${this.renderHeader()}
            ${this.error ? html`<div class="error-banner">${this.error}</div>` : nothing}
            ${this.running ? this.renderProgressBar() : nothing}
            ${this.results.length > 0 ? this.renderResultsTable() : nothing}
            ${this.summary ? this.renderSummary() : nothing}
            ${!this.running && this.results.length === 0 && !this.summary && !this.error
                ? this.renderEmptyState() : nothing}
        `;
    }

    private renderHeader() {
        return html`
            <div class="header">
                <div class="header-info">
                    <span class="title">${this.collectionName}</span>
                    <div class="subtitle">
                        ${this.folderName
                            ? html`<span>📁 ${this.folderName}</span>` : nothing}
                        ${this.environmentName
                            ? html`<span>🌐 ${this.environmentName}</span>` : nothing}
                        <span>${this.totalRequests} request${this.totalRequests !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div class="header-actions">
                    ${this.running
                        ? html`<button class="cancel-btn" @click=${this.cancelRun}>Cancel</button>`
                        : html`<button class="run-btn" @click=${this.startRun}
                                    ?disabled=${this.totalRequests === 0}>
                                    Run Collection
                                </button>`}
                </div>
            </div>
        `;
    }

    private renderProgressBar() {
        const pct = this.total > 0 ? (this.current / this.total) * 100 : 0;
        return html`
            <div class="progress-bar-container">
                <div class="progress-label">Running ${this.current} / ${this.total}…</div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }

    private renderResultsTable() {
        return html`
            <table class="results-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>Method</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.results.map((r, i) => this.renderResultRow(r, i))}
                </tbody>
            </table>
        `;
    }

    private renderResultRow(result: RunRequestResult, index: number) {
        const isExpanded = this.expandedIndex === index;

        return html`
            <tr class="result-row" @click=${() => this.toggleExpanded(index)}>
                <td>
                    <span class="chevron ${isExpanded ? 'expanded' : ''}">▶</span>
                    <span class="status-icon ${result.passed ? 'passed' : 'failed'}">
                        ${result.passed ? '✓' : '✗'}
                    </span>
                </td>
                <td>
                    <span class="method-badge ${this.getMethodClass(result.method)}">
                        ${result.method.toUpperCase()}
                    </span>
                </td>
                <td class="request-name">${result.requestName}</td>
                <td class="status-code">${result.status}</td>
                <td class="duration">${this.formatDuration(result.durationMs)}</td>
            </tr>
            ${isExpanded ? html`
                <tr class="expanded-content">
                    <td colspan="5">
                        ${result.error ? html`
                            <div class="expanded-section">
                                <div class="request-error">${result.error}</div>
                            </div>
                        ` : nothing}
                        ${result.scriptError ? html`
                            <div class="expanded-section">
                                <div class="section-title">Script Error</div>
                                <div class="request-error">${result.scriptError}</div>
                            </div>
                        ` : nothing}
                        ${result.testResults.length > 0 ? html`
                            <div class="expanded-section">
                                <div class="section-title">Test Results</div>
                                ${result.testResults.map(t => html`
                                    <div class="test-row">
                                        <span class="test-icon ${t.passed ? 'passed' : 'failed'}">
                                            ${t.passed ? '✓' : '✗'}
                                        </span>
                                        <span>${t.name}</span>
                                    </div>
                                    ${t.error ? html`<div class="test-error">${t.error}</div>` : nothing}
                                `)}
                            </div>
                        ` : nothing}
                        ${result.consoleLogs.length > 0 ? html`
                            <div class="expanded-section">
                                <div class="section-title">Console</div>
                                ${result.consoleLogs.map(entry => html`
                                    <div class="console-entry ${entry.level === 'warn' ? 'warn' : entry.level === 'error' ? 'error' : ''}">
                                        ${entry.args.join(' ')}
                                    </div>
                                `)}
                            </div>
                        ` : nothing}
                        ${result.responseBody ? html`
                            <div class="expanded-section">
                                <div class="section-title">Response Body</div>
                                <pre class="response-body">${this.formatResponseBody(result.responseBody, result.responseContentType)}</pre>
                            </div>
                        ` : nothing}
                        ${Object.keys(result.responseHeaders || {}).length > 0 ? html`
                            <div class="expanded-section">
                                <div class="section-title">Response Headers</div>
                                <div class="response-headers">
                                    ${Object.entries(result.responseHeaders).map(([key, value]) => html`
                                        <div class="header-row">
                                            <span class="header-key">${key}</span>
                                            <span class="header-value">${value}</span>
                                        </div>
                                    `)}
                                </div>
                            </div>
                        ` : nothing}
                    </td>
                </tr>
            ` : nothing}
        `;
    }

    private formatResponseBody(body: string, contentType: string): string {
        if (contentType.includes('json') || body.trim().startsWith('{') || body.trim().startsWith('[')) {
            try {
                return JSON.stringify(JSON.parse(body), null, 2);
            } catch {
                return body;
            }
        }
        return body;
    }

    private renderSummary() {
        const s = this.summary!;
        return html`
            <div class="summary-bar">
                <span class="summary-total">${s.total} total</span>
                <span class="summary-passed">✓ ${s.passed} passed</span>
                <span class="summary-failed">✗ ${s.failed} failed</span>
                <span class="summary-duration">${this.formatDuration(s.durationMs)}</span>
            </div>
        `;
    }

    private renderEmptyState() {
        return html`
            <div class="empty-state">
                <div class="empty-icon">🚀</div>
                <div>Ready to run</div>
                <div style="margin-top: 8px; font-size: 12px;">
                    Click "Run Collection" to execute all requests sequentially.
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'lc-runner-panel': LcRunnerPanel;
    }
}
