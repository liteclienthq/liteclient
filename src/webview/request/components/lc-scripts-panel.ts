import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import '../../shared/lc-code-editor.js';

@customElement('lc-scripts-panel')
export class LcScriptsPanel extends LcBaseElement {
  @property({ type: String }) preRequestScript = '';
  @property({ type: String }) postResponseScript = '';

  @state() private activeScript: 'pre-request' | 'tests' = 'pre-request';

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 100%;
      min-height: 0;
    }

    .toggle-bar {
      display: flex;
      gap: 0;
      padding: 4px 0 12px 0;
      margin-bottom: 12px;
    }

    .toggle-btn {
      background: none;
      border: none;
      padding: 4px 12px;
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground);
      opacity: 0.7;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      user-select: none;
    }

    .toggle-btn:hover {
      opacity: 1;
    }

    .toggle-btn.active {
      opacity: 1;
      color: var(--vscode-focusBorder);
      border-bottom-color: var(--vscode-focusBorder);
    }

    .toggle-btn:focus-visible {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
      border-radius: 2px;
    }

    .editor-container {
      flex: 1;
      min-height: 0;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 2px;
    }

    .hint {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      font-style: italic;
      padding: 6px 0 0 0;
    }
  `;

  private handleScriptChange(e: CustomEvent) {
    if (this.activeScript === 'pre-request') {
      this.preRequestScript = e.detail.value;
    } else {
      this.postResponseScript = e.detail.value;
    }
    this.dispatchEvent(new CustomEvent('scripts-change', {
      detail: {
        preRequestScript: this.preRequestScript,
        postResponseScript: this.postResponseScript
      },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    const isPreRequest = this.activeScript === 'pre-request';

    return html`
      <div class="toggle-bar">
        <button
          class="toggle-btn ${isPreRequest ? 'active' : ''}"
          @click=${() => this.activeScript = 'pre-request'}
        >Pre-request</button>
        <button
          class="toggle-btn ${!isPreRequest ? 'active' : ''}"
          @click=${() => this.activeScript = 'tests'}
        >Tests</button>
      </div>

      <div class="editor-container">
        <lc-code-editor
          .value=${isPreRequest ? this.preRequestScript : this.postResponseScript}
          language="javascript"
          @change=${this.handleScriptChange}
        ></lc-code-editor>
      </div>

      <div class="hint">
        ${isPreRequest
          ? 'Runs before the request. Use pm.environment.set() / pm.globals.set() to set variables. Synchronous scripts only.'
          : 'Runs after the response. Use pm.test() and pm.expect() to write assertions. Synchronous scripts only.'}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-scripts-panel': LcScriptsPanel;
  }
}
