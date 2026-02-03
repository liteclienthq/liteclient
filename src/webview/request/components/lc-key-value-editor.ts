import { html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import './lc-variable-autocomplete.js';
import type { LcVariableAutocomplete, VariableItem } from './lc-variable-autocomplete.js';

export interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  active: boolean;
}

@customElement('lc-key-value-editor')
export class LcKeyValueEditor extends LcBaseElement {
  static styles = css`
    :host {
      display: block;
    }

    .header-row {
      display: flex;
      font-size: 11px;
      font-weight: 500;
      color: var(--vscode-descriptionForeground);
      padding: 4px 8px;
      margin-bottom: 4px;
    }

    .col-check {
      width: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .col-key {
      flex: 1;
      margin-right: 8px;
    }

    .col-value {
      flex: 1;
    }

    .col-action {
      width: 24px;
    }

    .row {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
      padding: 0 8px;
      gap: 8px;
    }

    .row:hover .delete-btn {
        opacity: 0.8;
    }

    input[type="checkbox"] {
      width: 14px;
      height: 14px;
      cursor: pointer;
      accent-color: var(--vscode-checkbox-background);
      margin: 0;
      padding: 0;
      flex: none;
    }

    input[type="text"] {
      flex: 1;
      background: transparent;
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 4px 6px;
      border-radius: 2px;
      font-family: inherit;
      font-size: 13px;
      min-width: 0; 
      outline: none;
    }

    input[type="text"]:focus {
      border-color: var(--vscode-focusBorder);
    }



    .delete-btn {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      opacity: 0; /* Hidden by default */
      border-radius: 3px;
    }

    .delete-btn:hover {
      background: var(--vscode-toolbar-hoverBackground);
      opacity: 1 !important;
    }

    .empty-msg {
      padding: 8px;
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      font-style: italic;
      border: 1px dashed var(--vscode-input-border);
      border-radius: 4px;
      margin: 8px;
    }

    /* Always show delete button for rows containing data if focused, or hover */
    .row:focus-within .delete-btn {
        opacity: 0.5;
    }

    .input-wrapper {
      position: relative;
      flex: 1;
      display: flex;
      min-width: 0;
    }

    .input-wrapper input[type="text"] {
      width: 100%;
    }

    lc-variable-autocomplete {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
    }
  `;

  @property({ type: Array }) items: KeyValueItem[] = [];
  @property({ type: Array }) variables: VariableItem[] = [];

  @state() private activeRowId: string | null = null;
  @state() private activeField: 'key' | 'value' | null = null;
  @state() private showAutocomplete = false;
  @state() private autocompleteFilter = '';
  @state() private triggerStartPosition = -1;

  @query('lc-variable-autocomplete') private autocompleteEl?: LcVariableAutocomplete;

  private handleToggle(id: string) {
    this.items = this.items.map(item => {
      if (item.id === id) {
        return { ...item, active: !item.active };
      }
      return item;
    });
    this.dispatchChange();
  }

  private handleInput(e: Event, id: string, field: 'key' | 'value') {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    const cursorPos = target.selectionStart || 0;

    const newItems = this.items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });

    // If typing in the last empty row, add a new empty row
    const lastItem = newItems[newItems.length - 1];
    if (lastItem && (lastItem.key || lastItem.value)) {
      newItems.push({ id: crypto.randomUUID(), key: '', value: '', active: true });
    }

    this.items = newItems;
    this.dispatchChange();

    // Check for {{ trigger
    const textBeforeCursor = value.substring(0, cursorPos);
    const triggerMatch = textBeforeCursor.match(/\{\{([^{}]*)$/);

    if (triggerMatch) {
      this.activeRowId = id;
      this.activeField = field;
      this.showAutocomplete = true;
      this.triggerStartPosition = cursorPos - triggerMatch[1].length - 2;
      this.autocompleteFilter = triggerMatch[1];
    } else {
      this.showAutocomplete = false;
      this.triggerStartPosition = -1;
      this.autocompleteFilter = '';
    }
  }

  private handleKeydown(e: KeyboardEvent, id: string, field: 'key' | 'value') {
    if (this.showAutocomplete && this.autocompleteEl && this.activeRowId === id && this.activeField === field) {
      const handled = this.autocompleteEl.handleKeyDown(e);
      if (handled) { return; }
    }
  }

  private handleVariableSelect(e: CustomEvent<{ variable: VariableItem }>) {
    const { variable } = e.detail;
    if (!this.activeRowId || !this.activeField) { return; }

    const item = this.items.find(i => i.id === this.activeRowId);
    if (!item) { return; }

    const currentValue = item[this.activeField];
    const beforeTrigger = currentValue.substring(0, this.triggerStartPosition);
    const input = this.shadowRoot?.querySelector(
      `input[data-row-id="${this.activeRowId}"][data-field="${this.activeField}"]`
    ) as HTMLInputElement | null;
    const cursorPos = input?.selectionStart || currentValue.length;
    const afterCursor = currentValue.substring(cursorPos);

    const newValue = `${beforeTrigger}{{${variable.name}}}${afterCursor}`;
    
    this.items = this.items.map(i => {
      if (i.id === this.activeRowId) {
        return { ...i, [this.activeField!]: newValue };
      }
      return i;
    });
    this.dispatchChange();

    this.showAutocomplete = false;
    this.triggerStartPosition = -1;
    this.autocompleteFilter = '';

    requestAnimationFrame(() => {
      if (input) {
        const newCursorPos = beforeTrigger.length + variable.name.length + 4;
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }

  private handleAutocompleteClose() {
    this.showAutocomplete = false;
    this.triggerStartPosition = -1;
    this.autocompleteFilter = '';
  }

  private handleBlur() {
    setTimeout(() => this.handleAutocompleteClose(), 150);
  }

  private handleDelete(id: string) {
    this.items = this.items.filter(item => item.id !== id);
    if (this.items.length === 0) {
      this.items = [{ id: crypto.randomUUID(), key: '', value: '', active: true }];
    }
    this.dispatchChange();
  }

  private dispatchChange() {
    this.dispatchEvent(new CustomEvent('change', { detail: { items: this.items } }));
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('items')) {
      if (this.items.length === 0) {
        this.items = [{ id: crypto.randomUUID(), key: '', value: '', active: true }];
        this.requestUpdate();
      } else {
        const lastItem = this.items[this.items.length - 1];
        if (lastItem.key || lastItem.value) {
          this.items = [...this.items, { id: crypto.randomUUID(), key: '', value: '', active: true }];
          this.requestUpdate();
        }
      }
    }
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.items.length === 0) {
      this.items = [{ id: crypto.randomUUID(), key: '', value: '', active: true }];
    }
  }

  render() {
    // We only render rows. The last one is the "new" row.
    return html`
      <div class="header-row">
        <div class="col-check"></div>
        <div class="col-key">Key</div>
        <div class="col-value">Value</div>
        <div class="col-action"></div>
      </div>
      
      ${this.items.map(item => html`
        <div class="row">

          <div class="col-check">
            <input 
              type="checkbox" 
              ?checked=${item.active} 
              @change=${() => this.handleToggle(item.id)}
            >
          </div>
          <div class="input-wrapper">
            <input 
              type="text" 
              placeholder="Key" 
              .value=${item.key}
              data-row-id=${item.id}
              data-field="key"
              @input=${(e: Event) => this.handleInput(e, item.id, 'key')}
              @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, item.id, 'key')}
              @blur=${this.handleBlur}
            >
            ${this.activeRowId === item.id && this.activeField === 'key' ? html`
              <lc-variable-autocomplete
                .variables=${this.variables}
                .filter=${this.autocompleteFilter}
                .visible=${this.showAutocomplete}
                @select=${this.handleVariableSelect}
                @close=${this.handleAutocompleteClose}
              ></lc-variable-autocomplete>
            ` : ''}
          </div>
          <div class="input-wrapper">
            <input 
              type="text" 
              placeholder="Value" 
              .value=${item.value}
              data-row-id=${item.id}
              data-field="value"
              @input=${(e: Event) => this.handleInput(e, item.id, 'value')}
              @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, item.id, 'value')}
              @blur=${this.handleBlur}
            >
            ${this.activeRowId === item.id && this.activeField === 'value' ? html`
              <lc-variable-autocomplete
                .variables=${this.variables}
                .filter=${this.autocompleteFilter}
                .visible=${this.showAutocomplete}
                @select=${this.handleVariableSelect}
                @close=${this.handleAutocompleteClose}
              ></lc-variable-autocomplete>
            ` : ''}
          </div>

          <button 
            class="delete-btn" 
            title="Remove item"
            @click=${() => this.handleDelete(item.id)}
            tabindex="-1"
          >
             <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
               <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
             </svg>
          </button>
        </div>
      `)}
    `;
  }

}
