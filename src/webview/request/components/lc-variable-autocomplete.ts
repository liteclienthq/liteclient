import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';

export interface VariableItem {
  name: string;
  value: string;
  type: 'environment' | 'global';
}

@customElement('lc-variable-autocomplete')
export class LcVariableAutocomplete extends LcBaseElement {
  static styles = css`
    :host {
      display: block;
      position: absolute;
      z-index: 1000;
    }

    .autocomplete-container {
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-height: 250px;
      overflow-y: auto;
      min-width: 250px;
    }

    .variable-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .variable-item:last-child {
      border-bottom: none;
    }

    .variable-item:hover,
    .variable-item.selected {
      background: var(--vscode-list-hoverBackground);
    }

    .badge {
      width: 18px;
      height: 18px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      color: white;
      flex-shrink: 0;
    }

    .badge.environment {
      background: #4caf50;
    }

    .badge.global {
      background: #2196f3;
    }

    .variable-name {
      flex: 1;
      font-family: var(--vscode-editor-font-family);
      font-size: 13px;
      color: var(--vscode-foreground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .variable-value {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .no-results {
      padding: 12px;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      text-align: center;
    }
  `;

  @property({ type: Array }) variables: VariableItem[] = [];
  @property({ type: String }) filter = '';
  @property({ type: Boolean }) visible = false;

  @state() private selectedIndex = 0;

  get filteredVariables(): VariableItem[] {
    if (!this.filter) {
      return this.variables;
    }
    const lowerFilter = this.filter.toLowerCase();
    return this.variables.filter(v => 
      v.name.toLowerCase().includes(lowerFilter)
    );
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('filter') || changedProperties.has('variables')) {
      this.selectedIndex = 0;
    }
    if (changedProperties.has('selectedIndex')) {
      this.scrollSelectedIntoView();
    }
  }

  private scrollSelectedIntoView() {
    const container = this.shadowRoot?.querySelector('.autocomplete-container');
    const selectedItem = this.shadowRoot?.querySelector('.variable-item.selected') as HTMLElement;
    if (container && selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    if (!this.visible) {return false;}

    const filtered = this.filteredVariables;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, filtered.length - 1);
        return true;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        return true;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (filtered.length > 0) {
          this.selectVariable(filtered[this.selectedIndex]);
        }
        return true;
      case 'Escape':
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('close'));
        return true;
    }
    return false;
  }

  private selectVariable(variable: VariableItem) {
    this.dispatchEvent(new CustomEvent('select', {
      detail: { variable }
    }));
  }

  private handleClick(variable: VariableItem) {
    this.selectVariable(variable);
  }

  render() {
    if (!this.visible) {return nothing;}

    const filtered = this.filteredVariables;

    return html`
      <div class="autocomplete-container">
        ${filtered.length === 0 
          ? html`<div class="no-results">No variables found</div>`
          : filtered.map((variable, index) => html`
              <div 
                class="variable-item ${index === this.selectedIndex ? 'selected' : ''}"
                @click=${() => this.handleClick(variable)}
              >
                <span class="badge ${variable.type}">${variable.type === 'environment' ? 'E' : 'G'}</span>
                <span class="variable-name">${variable.name}</span>
                <span class="variable-value">${this.truncateValue(variable.value)}</span>
              </div>
            `)
        }
      </div>
    `;
  }

  private truncateValue(value: string): string {
    return value.length > 30 ? value.substring(0, 30) + '...' : value;
  }
}
