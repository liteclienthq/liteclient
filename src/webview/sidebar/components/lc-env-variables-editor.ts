import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element';

export interface EnvVariable {
    id: string;
    key: string;
    value: string;
}

@customElement('lc-env-variables-editor')
export class LcEnvVariablesEditor extends LcBaseElement {
    static override styles = css`
    :host {
      display: block;
      padding: 0 8px;
    }

    .editor-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .row {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    input {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 4px 6px;
      font-size: 12px;
      border-radius: 2px;
      outline: none;
      flex: 1;
      min-width: 0;
    }

    input:focus {
      border-color: var(--vscode-focusBorder);
    }

    .delete-btn {
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      padding: 2px;
      opacity: 0.5;
      display: flex;
      align-items: center;
    }

    .delete-btn:hover {
      opacity: 1;
      background: var(--vscode-toolbar-hoverBackground);
      border-radius: 3px;
    }

    .delete-btn svg {
      width: 14px;
      height: 14px;
    }

    .empty-row {
      margin-top: 4px;
      opacity: 0.6;
    }
  `;

    @property({ type: Object }) variables: Record<string, string> = {};

    @state() private localVariables: EnvVariable[] = [];

    override updated(changedProperties: Map<string, any>) {
        if (changedProperties.has('variables')) {
            this.localVariables = Object.entries(this.variables).map(([key, value]) => ({
                id: Math.random().toString(36).substr(2, 9),
                key,
                value
            }));
            this.ensureEmptyRow();
        }
    }

    private ensureEmptyRow() {
        const hasEmpty = this.localVariables.some(v => v.key === '' && v.value === '');
        if (!hasEmpty) {
            this.localVariables = [...this.localVariables, { id: Math.random().toString(36).substr(2, 9), key: '', value: '' }];
        }
    }

    private handleInputChange(id: string, field: 'key' | 'value', value: string) {
        this.localVariables = this.localVariables.map(v => {
            if (v.id === id) {
                return { ...v, [field]: value };
            }
            return v;
        });

        if (field === 'key' || field === 'value') {
            this.ensureEmptyRow();
        }
        this.notifyChange();
    }

    private handleDelete(id: string) {
        this.localVariables = this.localVariables.filter(v => v.id !== id);
        this.ensureEmptyRow();
        this.notifyChange();
    }

    private notifyChange() {
        const vars: Record<string, string> = {};
        this.localVariables.forEach(v => {
            if (v.key.trim()) {
                vars[v.key] = v.value;
            }
        });

        this.dispatchEvent(new CustomEvent('change', {
            detail: { variables: vars },
            bubbles: true,
            composed: true
        }));
    }

    override render() {
        return html`
      <div class="editor-container">
        ${this.localVariables.map(v => html`
          <div class="row">
            <input 
              type="text" 
              placeholder="Key" 
              .value=${v.key} 
              @input=${(e: any) => this.handleInputChange(v.id, 'key', e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Value" 
              .value=${v.value} 
              @input=${(e: any) => this.handleInputChange(v.id, 'value', e.target.value)}
            />
            <button class="delete-btn" @click=${() => this.handleDelete(v.id)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.5 1h3l.5.5V3h3v1h-1v11l-.5.5h-11l-.5-.5V4h-1V3h3V1.5l.5-.5zM11 4H5v10h6V4zM9 3V2H7v1h2z"/>
              </svg>
            </button>
          </div>
        `)}
      </div>
    `;
    }
}
