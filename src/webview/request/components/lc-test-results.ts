import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import '../../shared/lc-empty-state.js';
import '../../shared/lc-error-state.js';
import type { ScriptTestResult, ScriptConsoleEntry } from '../../shared/messaging.js';

@customElement('lc-test-results')
export class LcTestResults extends LcBaseElement {
  @property({ type: Array }) testResults: ScriptTestResult[] = [];
  @property({ type: Array }) consoleLogs: ScriptConsoleEntry[] = [];
  @property({ type: String }) scriptError = '';

  static styles = css`
    :host {
      display: block;
      overflow: auto;
      flex: 1;
      height: 100%;
      font-size: 12px;
      color: var(--vscode-foreground);
    }

    .section {
      margin: 8px 0;
    }

    .section-title {
      font-weight: 500;
      color: var(--vscode-descriptionForeground);
      padding: 4px 0 6px;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }

    .summary {
      padding: 4px 0 8px;
      font-weight: 500;
    }

    .summary.all-passed {
      color: var(--vscode-testing-iconPassed, #4ec9b0);
    }

    .summary.some-failed {
      color: var(--vscode-testing-iconFailed, var(--vscode-editorError-foreground));
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

    .test-name {
      flex: 1;
      min-width: 0;
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

  `;

  render() {
    const hasContent = this.scriptError || this.testResults.length > 0 || this.consoleLogs.length > 0;

    if (!hasContent) {
      return html`<lc-empty-state compact icon="test" title="No test results" description="Add scripts to your request to see results here."></lc-empty-state>`;
    }

    return html`
      ${this.scriptError ? html`<lc-error-state .message=${this.scriptError}></lc-error-state>` : nothing}
      ${this.renderTestResults()}
      ${this.renderConsoleLogs()}
    `;
  }

  private renderTestResults() {
    if (this.testResults.length === 0) {
      return nothing;
    }

    const passed = this.testResults.filter(t => t.passed).length;
    const total = this.testResults.length;
    const allPassed = passed === total;

    return html`
      <div class="section">
        <div class="section-title">Test Results</div>
        <div class="summary ${allPassed ? 'all-passed' : 'some-failed'}">
          ${passed}/${total} tests passed
        </div>
        ${this.testResults.map(t => html`
          <div class="test-row">
            <span class="test-icon ${t.passed ? 'passed' : 'failed'}">${t.passed ? '✓' : '✗'}</span>
            <span class="test-name">${t.name}</span>
          </div>
          ${t.error ? html`<div class="test-error">${t.error}</div>` : nothing}
        `)}
      </div>
    `;
  }

  private renderConsoleLogs() {
    if (this.consoleLogs.length === 0) {
      return nothing;
    }

    return html`
      <div class="section">
        <div class="section-title">Console</div>
        ${this.consoleLogs.map(entry => html`
          <div class="console-entry ${entry.level === 'warn' ? 'warn' : entry.level === 'error' ? 'error' : ''}">
            ${entry.args.join(' ')}
          </div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-test-results': LcTestResults;
  }
}
