import { html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { LcBaseElement } from '../../shared/base-element.js';
import { postMessage } from '../../shared/messaging.js';
import './lc-variable-autocomplete.js';
import type { LcVariableAutocomplete, VariableItem } from './lc-variable-autocomplete.js';

export interface FormDataItem {
  id: string;
  key: string;
  type: 'text' | 'file';
  value: string;
  file?: {
    name: string;
    size: number;
    type: string;
    data: string;
  };
  active: boolean;
}

@customElement('lc-form-data-editor')
export class LcFormDataEditor extends LcBaseElement {
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
      position: relative;
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

    .key-cell {
      flex: 1;
      display: flex;
      align-items: center;
      position: relative;
      background: transparent;
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
    }

    .key-cell:focus-within {
      border-color: var(--vscode-focusBorder);
    }

    .key-cell input {
      flex: 1;
      background: transparent;
      color: var(--vscode-input-foreground);
      border: none;
      padding: 4px 6px;
      font-family: inherit;
      font-size: 13px;
      min-width: 0;
      outline: none;
    }

    .type-dropdown {
      position: relative;
      flex-shrink: 0;
      margin-right: 4px;
    }

    .type-btn {
      display: flex;
      align-items: center;
      gap: 2px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 11px;
      cursor: pointer;
      white-space: nowrap;
    }

    .type-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .type-btn svg {
      width: 10px;
      height: 10px;
    }

    .type-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 2px;
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      z-index: 100;
      min-width: 80px;
      overflow: hidden;
    }

    .type-menu-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      font-size: 12px;
      color: var(--vscode-dropdown-foreground);
      cursor: pointer;
    }

    .type-menu-item:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .type-menu-item.selected {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }

    .type-menu-item svg {
      width: 12px;
      height: 12px;
    }

    .value-cell {
      flex: 1;
      display: flex;
      align-items: center;
      min-width: 0;
      background: transparent;
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
    }

    .value-cell:focus-within {
      border-color: var(--vscode-focusBorder);
    }

    .value-cell input[type="text"] {
      flex: 1;
      background: transparent;
      color: var(--vscode-input-foreground);
      border: none;
      padding: 4px 6px;
      font-family: inherit;
      font-size: 13px;
      min-width: 0;
      outline: none;
    }

    .file-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 2px 6px;
      min-width: 0;
    }

    .file-select-btn {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border, transparent);
      padding: 2px 8px;
      border-radius: 2px;
      font-size: 11px;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .file-select-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .file-name {
      font-size: 12px;
      color: var(--vscode-foreground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }

    .file-name.placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    .file-size {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .clear-file-btn {
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
      flex-shrink: 0;
    }

    .clear-file-btn:hover {
      opacity: 1;
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
      opacity: 0;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .delete-btn:hover {
      background: var(--vscode-toolbar-hoverBackground);
      opacity: 1 !important;
    }

    .row:hover .delete-btn,
    .row:focus-within .delete-btn {
      opacity: 0.5;
    }

    input[type="file"] {
      display: none;
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

  @property({ type: Array }) items: FormDataItem[] = [];
  @property({ type: Array }) variables: VariableItem[] = [];

  @state() private openDropdownId: string | null = null;
  @state() private activeRowId: string | null = null;
  @state() private activeField: 'key' | 'value' | null = null;
  @state() private showAutocomplete = false;
  @state() private autocompleteFilter = '';
  @state() private triggerStartPosition = -1;

  @query('lc-variable-autocomplete') private autocompleteEl?: LcVariableAutocomplete;

  connectedCallback() {
    super.connectedCallback();
    if (this.items.length === 0) {
      this.items = [this.createEmptyRow()];
    }
    document.addEventListener('click', this.handleDocumentClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleDocumentClick);
  }

  private handleDocumentClick = (e: MouseEvent) => {
    const path = e.composedPath();
    const clickedInsideDropdown = path.some((el) => 
      el instanceof HTMLElement && el.classList?.contains('type-dropdown')
    );
    if (!clickedInsideDropdown) {
      this.openDropdownId = null;
    }
  };

  private createEmptyRow(): FormDataItem {
    return {
      id: crypto.randomUUID(),
      key: '',
      type: 'text',
      value: '',
      active: true
    };
  }

  private handleToggle(id: string) {
    this.items = this.items.map(item => 
      item.id === id ? { ...item, active: !item.active } : item
    );
    this.dispatchChange();
  }

  private handleKeyInput(e: Event, id: string) {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    const cursorPos = target.selectionStart || 0;

    const newItems = this.items.map(item =>
      item.id === id ? { ...item, key: value } : item
    );
    this.maybeAddEmptyRow(newItems);
    this.items = newItems;
    this.dispatchChange();

    this.checkForVariableTrigger(value, cursorPos, id, 'key');
  }

  private handleValueInput(e: Event, id: string) {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    const cursorPos = target.selectionStart || 0;

    const newItems = this.items.map(item =>
      item.id === id ? { ...item, value: value } : item
    );
    this.maybeAddEmptyRow(newItems);
    this.items = newItems;
    this.dispatchChange();

    this.checkForVariableTrigger(value, cursorPos, id, 'value');
  }

  private checkForVariableTrigger(value: string, cursorPos: number, id: string, field: 'key' | 'value') {
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

    const currentValue = this.activeField === 'key' ? item.key : item.value;
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

  private toggleDropdown(id: string, e: Event) {
    e.stopPropagation();
    this.openDropdownId = this.openDropdownId === id ? null : id;
  }

  private selectType(id: string, newType: 'text' | 'file') {
    this.items = this.items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          type: newType,
          value: newType === 'file' ? '' : item.value,
          file: newType === 'file' ? undefined : item.file
        };
      }
      return item;
    });
    this.openDropdownId = null;
    this.dispatchChange();
  }

  private async handleFileSelect(e: Event, id: string) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {return;}

    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit
    if (file.size > MAX_FILE_SIZE) {
      postMessage({
        type: 'show-notification',
        level: 'warning',
        message: `File too large. Maximum size is 25MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
      });
      input.value = '';
      return;
    }

    const base64 = await this.fileToBase64(file);
    const newItems = this.items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          file: {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            data: base64
          }
        };
      }
      return item;
    });

    this.maybeAddEmptyRow(newItems);
    this.items = newItems;
    this.dispatchChange();
    input.value = '';
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const parts = result.split(',');
        if (parts.length < 2) {
          reject(new Error('Invalid file data'));
          return;
        }
        resolve(parts[1]);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  private clearFile(id: string) {
    this.items = this.items.map(item =>
      item.id === id ? { ...item, file: undefined } : item
    );
    this.dispatchChange();
  }

  private maybeAddEmptyRow(items: FormDataItem[]) {
    const lastItem = items[items.length - 1];
    if (lastItem && (lastItem.key || lastItem.value || lastItem.file)) {
      items.push(this.createEmptyRow());
    }
  }

  private handleDelete(id: string) {
    this.items = this.items.filter(item => item.id !== id);
    if (this.items.length === 0) {
      this.items = [this.createEmptyRow()];
    }
    this.dispatchChange();
  }

  private dispatchChange() {
    this.dispatchEvent(new CustomEvent('change', { detail: { items: this.items } }));
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {return `${bytes} B`;}
    if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('items')) {
      if (this.items.length === 0) {
        this.items = [this.createEmptyRow()];
        this.requestUpdate();
      } else {
        const lastItem = this.items[this.items.length - 1];
        if (lastItem.key || lastItem.value || lastItem.file) {
          this.items = [...this.items, this.createEmptyRow()];
          this.requestUpdate();
        }
      }
    }
  }

  private triggerFileInput(id: string) {
    const input = this.shadowRoot?.querySelector(`#file-input-${id}`) as HTMLInputElement;
    input?.click();
  }

  render() {
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
          
          <div class="key-cell">
            <div class="input-wrapper">
              <input 
                type="text" 
                placeholder="Key" 
                .value=${item.key}
                data-row-id=${item.id}
                data-field="key"
                @input=${(e: Event) => this.handleKeyInput(e, item.id)}
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
            <div class="type-dropdown">
              <button 
                class="type-btn" 
                @click=${(e: Event) => this.toggleDropdown(item.id, e)}
              >
                ${item.type === 'file' ? 'File' : 'Text'}
                <svg viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
              </button>
              ${this.openDropdownId === item.id ? html`
                <div class="type-menu">
                  <div 
                    class="type-menu-item ${item.type === 'text' ? 'selected' : ''}"
                    @click=${() => this.selectType(item.id, 'text')}
                  >
                    ${item.type === 'text' ? html`
                      <svg viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                      </svg>
                    ` : html`<span style="width:12px"></span>`}
                    Text
                  </div>
                  <div 
                    class="type-menu-item ${item.type === 'file' ? 'selected' : ''}"
                    @click=${() => this.selectType(item.id, 'file')}
                  >
                    ${item.type === 'file' ? html`
                      <svg viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                      </svg>
                    ` : html`<span style="width:12px"></span>`}
                    File
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="value-cell">
            ${item.type === 'text' 
              ? html`
                <div class="input-wrapper">
                  <input 
                    type="text" 
                    placeholder="Value" 
                    .value=${item.value}
                    data-row-id=${item.id}
                    data-field="value"
                    @input=${(e: Event) => this.handleValueInput(e, item.id)}
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
              `
              : html`
                <input 
                  type="file" 
                  id="file-input-${item.id}"
                  @change=${(e: Event) => this.handleFileSelect(e, item.id)}
                >
                <div class="file-content">
                  <button 
                    class="file-select-btn"
                    @click=${() => this.triggerFileInput(item.id)}
                  >
                    Select File
                  </button>
                  <span class="file-name ${item.file ? '' : 'placeholder'}">
                    ${item.file ? item.file.name : 'No file selected'}
                  </span>
                  ${item.file ? html`
                    <span class="file-size">${this.formatFileSize(item.file.size)}</span>
                    <button 
                      class="clear-file-btn" 
                      title="Clear file"
                      @click=${() => this.clearFile(item.id)}
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
                      </svg>
                    </button>
                  ` : ''}
                </div>
              `
            }
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
