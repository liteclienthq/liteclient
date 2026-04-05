import { html, nothing } from 'lit';
import { css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import { postMessage } from '../../shared/messaging.js';
import type { Environment, EnvironmentVariable, VariableType } from '../../../shared/models.js';
import '../../shared/lc-loading-state.js';

function generateId(): string {
    return crypto.randomUUID();
}

@customElement('lc-environment-manager')
export class LcEnvironmentManager extends LcBaseElement {
    @property({ type: Object }) environment: Environment | null = null;

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

        .var-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }

        .var-table th,
        .var-table td {
            padding: 6px 8px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .var-table th {
            background: var(--vscode-editorWidget-background);
            color: var(--vscode-descriptionForeground);
            font-weight: 500;
            font-size: 11px;
            text-transform: uppercase;
        }

        .var-table tr:last-child td {
            border-bottom: none;
        }

        .var-table tr:hover td {
            background: var(--vscode-list-hoverBackground);
        }

        .var-table input[type="text"],
        .var-table input[type="password"] {
            width: 100%;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 4px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            box-sizing: border-box;
        }

        .var-table input[type="text"]:focus,
        .var-table input[type="password"]:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }

        .var-table input[type="checkbox"] {
            cursor: pointer;
        }

        .type-toggle {
            background: none;
            border: 1px solid var(--vscode-input-border);
            color: var(--vscode-descriptionForeground);
            padding: 3px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            font-family: var(--vscode-font-family);
            white-space: nowrap;
        }

        .type-toggle:hover {
            background: var(--vscode-list-hoverBackground);
            color: var(--vscode-foreground);
        }

        .type-toggle.secret {
            color: var(--vscode-charts-orange, #ce9178);
            border-color: var(--vscode-charts-orange, #ce9178);
        }

        .current-value-cell {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .current-value-cell input {
            flex: 1;
        }

        .clear-btn {
            background: none;
            border: none;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 12px;
            flex-shrink: 0;
        }

        .clear-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
            color: var(--vscode-foreground);
        }

        .delete-btn {
            background: none;
            border: none;
            color: var(--vscode-errorForeground);
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.15s;
        }

        .var-table tr:hover .delete-btn {
            opacity: 1;
        }

        .delete-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }

        .add-row-btn {
            background: none;
            border: 1px dashed var(--vscode-panel-border);
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            padding: 6px 12px;
            width: 100%;
            font-size: 12px;
            font-family: var(--vscode-font-family);
            margin-top: -1px;
            border-radius: 0 0 4px 4px;
        }

        .add-row-btn:hover {
            background: var(--vscode-list-hoverBackground);
            color: var(--vscode-foreground);
        }

    `;

    private addVariable() {
        const env = this.environment;
        if (!env) return;
        const newVar: EnvironmentVariable = {
            id: generateId(),
            name: '',
            initialValue: '',
            type: 'default',
            enabled: true,
        };
        const updated = [...env.variables, newVar];
        this.sendVariablesUpdate(env.id, updated);
    }

    private deleteVariable(varId: string) {
        const env = this.environment;
        if (!env) return;
        const updated = env.variables.filter(v => v.id !== varId);
        this.sendVariablesUpdate(env.id, updated);
    }

    private onVariableChange(varId: string, field: keyof EnvironmentVariable, value: string | boolean) {
        const env = this.environment;
        if (!env) return;
        const updated = env.variables.map(v =>
            v.id === varId ? { ...v, [field]: value } : v
        );
        this.sendVariablesUpdate(env.id, updated);
    }

    private onCurrentValueChange(varId: string, value: string) {
        const env = this.environment;
        if (!env) return;
        postMessage({ type: 'envmgr-set-current-value', envId: env.id, varId, value } as any);
    }

    private clearCurrentValue(varId: string) {
        const env = this.environment;
        if (!env) return;
        postMessage({ type: 'envmgr-clear-current-value', envId: env.id, varId } as any);
    }

    private toggleType(varId: string) {
        const env = this.environment;
        if (!env) return;
        const variable = env.variables.find(v => v.id === varId);
        if (!variable) return;
        const newType: VariableType = variable.type === 'default' ? 'secret' : 'default';
        this.onVariableChange(varId, 'type', newType as any);
    }

    private sendVariablesUpdate(envId: string, variables: EnvironmentVariable[]) {
        postMessage({ type: 'envmgr-update-variables', envId, variables } as any);
    }

    render() {
        if (!this.environment) {
            return html`<lc-loading-state label="Loading environment…"></lc-loading-state>`;
        }
        return html`
            ${this.renderVariableTable(this.environment)}
        `;
    }

    private renderVariableTable(env: Environment) {
        return html`
            <table class="var-table">
                <thead>
                    <tr>
                        <th style="width: 40px;"></th>
                        <th>Name</th>
                        <th>Initial Value</th>
                        <th>Current Value</th>
                        <th style="width: 80px;">Type</th>
                        <th style="width: 40px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${env.variables.map(v => this.renderVariableRow(v))}
                </tbody>
            </table>
            <button class="add-row-btn" @click=${this.addVariable}>+ Add Variable</button>
        `;
    }

    private renderVariableRow(v: EnvironmentVariable) {
        const isSecret = v.type === 'secret';
        const inputType = isSecret ? 'password' : 'text';

        return html`
            <tr>
                <td>
                    <input
                        type="checkbox"
                        .checked=${v.enabled}
                        @change=${(e: Event) => this.onVariableChange(v.id, 'enabled', (e.target as HTMLInputElement).checked)}
                    />
                </td>
                <td>
                    <input
                        type="text"
                        .value=${v.name}
                        placeholder="Variable name"
                        @change=${(e: Event) => this.onVariableChange(v.id, 'name', (e.target as HTMLInputElement).value)}
                    />
                </td>
                <td>
                    <input
                        type=${inputType}
                        .value=${v.initialValue}
                        placeholder="Initial value"
                        @change=${(e: Event) => this.onVariableChange(v.id, 'initialValue', (e.target as HTMLInputElement).value)}
                    />
                </td>
                <td>
                    <div class="current-value-cell">
                        <input
                            type=${inputType}
                            .value=${v.currentValue ?? ''}
                            placeholder="Current value"
                            @change=${(e: Event) => this.onCurrentValueChange(v.id, (e.target as HTMLInputElement).value)}
                        />
                        ${v.currentValue ? html`
                            <button class="clear-btn" @click=${() => this.clearCurrentValue(v.id)} title="Clear current value">✕</button>
                        ` : nothing}
                    </div>
                </td>
                <td>
                    <button
                        class="type-toggle ${isSecret ? 'secret' : ''}"
                        @click=${() => this.toggleType(v.id)}
                    >${isSecret ? 'secret' : 'default'}</button>
                </td>
                <td>
                    <button class="delete-btn" @click=${() => this.deleteVariable(v.id)} title="Delete variable">✕</button>
                </td>
            </tr>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'lc-environment-manager': LcEnvironmentManager;
    }
}
