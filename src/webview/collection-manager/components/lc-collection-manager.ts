import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import { postMessage } from '../../shared/messaging.js';
import type { EnvironmentVariable, VariableType } from '../../../shared/models.js';
import '../../shared/lc-loading-state.js';

interface CollectionState {
    id: string;
    name: string;
    variables: EnvironmentVariable[];
}

function generateId(): string {
    return crypto.randomUUID();
}

@customElement('lc-collection-manager')
export class LcCollectionManager extends LcBaseElement {
    @property({ type: Object }) collection: CollectionState | null = null;

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
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .collection-name {
            flex: 1;
            min-width: 0;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 6px 8px;
            border-radius: 4px;
            font-size: 13px;
        }

        .collection-name:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
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

    private renameCollection(name: string) {
        const collection = this.collection;
        if (!collection) {
            return;
        }

        postMessage({ type: 'collectionmgr-rename-collection', id: collection.id, name } as any);
    }

    private addVariable() {
        const collection = this.collection;
        if (!collection) {
            return;
        }

        const newVar: EnvironmentVariable = {
            id: generateId(),
            name: '',
            initialValue: '',
            type: 'default',
            enabled: true,
        };
        this.sendVariablesUpdate(collection.id, [...collection.variables, newVar]);
    }

    private deleteVariable(varId: string) {
        const collection = this.collection;
        if (!collection) {
            return;
        }

        this.sendVariablesUpdate(collection.id, collection.variables.filter(v => v.id !== varId));
    }

    private onVariableChange(varId: string, field: keyof EnvironmentVariable, value: string | boolean) {
        const collection = this.collection;
        if (!collection) {
            return;
        }

        const variables = collection.variables.map(v =>
            v.id === varId ? { ...v, [field]: value } : v
        );
        this.sendVariablesUpdate(collection.id, variables);
    }

    private toggleType(varId: string) {
        const collection = this.collection;
        if (!collection) {
            return;
        }

        const variable = collection.variables.find(v => v.id === varId);
        if (!variable) {
            return;
        }

        const newType: VariableType = variable.type === 'default' ? 'secret' : 'default';
        this.onVariableChange(varId, 'type', newType as any);
    }

    private sendVariablesUpdate(collectionId: string, variables: EnvironmentVariable[]) {
        postMessage({ type: 'collectionmgr-update-variables', collectionId, variables } as any);
    }

    render() {
        if (!this.collection) {
            return html`<lc-loading-state label="Loading collection…"></lc-loading-state>`;
        }

        return html`
            <div class="header">
                <input
                    class="collection-name"
                    type="text"
                    .value=${this.collection.name}
                    @change=${(e: Event) => this.renameCollection((e.target as HTMLInputElement).value)}
                />
            </div>

            <table class="var-table">
                <thead>
                    <tr>
                        <th style="width: 40px;"></th>
                        <th>Name</th>
                        <th>Value</th>
                        <th style="width: 80px;">Type</th>
                        <th style="width: 40px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${this.collection.variables.map(v => this.renderVariableRow(v))}
                </tbody>
            </table>
            <button class="add-row-btn" @click=${this.addVariable}>+ Add Variable</button>
        `;
    }

    private renderVariableRow(v: EnvironmentVariable) {
        const isSecret = v.type === 'secret';
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
                        placeholder="variable_name"
                        @change=${(e: Event) => this.onVariableChange(v.id, 'name', (e.target as HTMLInputElement).value)}
                    />
                </td>
                <td>
                    <input
                        type=${isSecret ? 'password' : 'text'}
                        .value=${v.initialValue}
                        placeholder="value"
                        @change=${(e: Event) => this.onVariableChange(v.id, 'initialValue', (e.target as HTMLInputElement).value)}
                    />
                </td>
                <td>
                    <button class="type-toggle ${isSecret ? 'secret' : ''}" @click=${() => this.toggleType(v.id)}>
                        ${isSecret ? 'Secret' : 'Default'}
                    </button>
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
        'lc-collection-manager': LcCollectionManager;
    }
}
