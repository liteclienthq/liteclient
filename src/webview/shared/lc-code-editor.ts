/**
 * CodeMirror Editor Component
 * Lightweight code editor implementation using CodeMirror
 */

import { html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { LcBaseElement } from './base-element.js';

// VS Code Dark+ theme colors for fallback
// These will be used if the CSS variables are missing
const colors = {
    keyword: "#c586c0",
    string: "#ce9178",
    number: "#b5cea8",
    property: "#9cdcfe",
    variable: "#9cdcfe",
    comment: "#6a9955",
    boolean: "#569cd6",
    null: "#569cd6",
    namespace: "#4ec9b0",
    type: "#4ec9b0",
    className: "#4ec9b0",
    function: "#dcdcaa",
    constant: "#4fc1ff"
};

const vscodeHighlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: colors.keyword },
    { tag: t.operator, color: "var(--vscode-editor-foreground)" },
    { tag: t.variableName, color: colors.variable },
    { tag: t.propertyName, color: colors.property },
    { tag: t.string, color: colors.string },
    { tag: t.number, color: colors.number },
    { tag: t.bool, color: colors.boolean },
    { tag: t.null, color: colors.null },
    { tag: t.comment, color: colors.comment, fontStyle: "italic" },
    { tag: t.namespace, color: colors.namespace },
    { tag: t.typeName, color: colors.type },
    { tag: t.className, color: colors.className },
    { tag: t.function(t.variableName), color: colors.function },
    { tag: t.constant(t.name), color: colors.constant },
    { tag: t.brace, color: "var(--vscode-editor-foreground)" },
    { tag: t.bracket, color: "var(--vscode-editor-foreground)" },
]);

@customElement('lc-code-editor')
export class LcCodeEditor extends LcBaseElement {
    @property({ type: String }) value = '';
    @property({ type: String }) language = 'plaintext';
    @property({ type: Boolean }) readOnly = false;
    @property({ type: Number }) fontSize = 12;
    @property({ type: Boolean }) wordWrap = true;
    @property({ type: Boolean }) minimap = false; // Not supported directly in CM basic setup, ignoring for now

    @query('#editor-container') private container!: HTMLDivElement;

    private editor: EditorView | null = null;
    private isUpdating = false;

    static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      position: relative;
      overflow: hidden;
      background-color: var(--vscode-editor-background);
    }

    #editor-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      font-size: 13px;
    }

    /* Force CodeMirror to fill the container */
    .cm-editor {
      height: 100% !important;
      max-height: 100%;
      flex: 1;
    }

    .cm-scroller {
      height: 100% !important;
      flex: 1;
      overflow: auto;
      font-family: var(--vscode-editor-font-family, monospace);
    }
    
    /* Custom Scrollbar Styling to match VS Code */
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    
    ::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-background);
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-hoverBackground);
    }
    
    ::-webkit-scrollbar-thumb:active {
      background: var(--vscode-scrollbarSlider-activeBackground);
    }
    
    ::-webkit-scrollbar-corner {
      background: transparent;
    }
  `;

    firstUpdated(changedProperties: Map<string | number | symbol, unknown>) {
        super.firstUpdated(changedProperties);
        this.initializeEditor();
    }

    updated(changedProperties: Map<string | number | symbol, unknown>) {
        super.updated(changedProperties);

        if (this.editor) {
            if (changedProperties.has('value') && !this.isUpdating) {
                const currentContent = this.editor.state.doc.toString();
                let newValue = this.value || '';

                // Format JSON if needed
                if (this.language === 'json' && newValue.trim()) {
                    try {
                        const parsed = JSON.parse(newValue);
                        newValue = JSON.stringify(parsed, null, 2);
                    } catch (e) {
                        // Keep original
                    }
                }

                if (currentContent !== newValue) {
                    this.editor.dispatch({
                        changes: { from: 0, to: currentContent.length, insert: newValue }
                    });
                }
            }

            // Re-initialize if config changes
            if (changedProperties.has('readOnly') || changedProperties.has('wordWrap') || changedProperties.has('language')) {
                this.editor.destroy();
                this.editor = null;
                this.container.innerHTML = ''; // Clear container
                this.initializeEditor();
            }
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
    }

    private initializeEditor() {
        if (!this.container || this.editor) { return; }

        let startValue = this.value || '';
        if (this.language === 'json' && startValue.trim()) {
            try {
                const parsed = JSON.parse(startValue);
                startValue = JSON.stringify(parsed, null, 2);
            } catch (e) { /* ignore */ }
        }

        const extensions = [
            basicSetup,
            syntaxHighlighting(vscodeHighlightStyle),
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    this.isUpdating = true;
                    const newValue = update.state.doc.toString();
                    this.value = newValue;
                    this.dispatchEvent(new CustomEvent('change', { detail: { value: newValue } }));
                    this.isUpdating = false;
                }
            }),
            EditorView.theme({
                "&": {
                    height: "100%",
                    outline: "none",
                    backgroundColor: "transparent",
                    color: "var(--vscode-editor-foreground)"
                },
                ".cm-scroller": {
                    fontFamily: "var(--vscode-editor-font-family, monospace)",
                    lineHeight: "1.5",
                    fontSize: `${this.fontSize}px`
                },
                ".cm-content": {
                    padding: "10px 0"
                },
                ".cm-gutters": {
                    backgroundColor: "var(--vscode-editor-background)",
                    color: "var(--vscode-editorLineNumber-foreground)",
                    border: "none",
                    minWidth: "30px"
                },
                ".cm-activeLine": {
                    backgroundColor: "var(--vscode-editor-lineHighlightBackground)"
                },
                ".cm-activeLineGutter": {
                    backgroundColor: "var(--vscode-editor-lineHighlightBackground)"
                },
                ".cm-cursor": {
                    borderLeft: "2px solid var(--vscode-editorCursor-foreground)"
                },
                ".cm-selectionBackground, ::selection": {
                    backgroundColor: "var(--vscode-editor-selectionBackground) !important"
                }
            })
        ];

        if (this.language === 'json') {
            extensions.push(json());
        }

        if (this.wordWrap) {
            extensions.push(EditorView.lineWrapping);
        }

        if (this.readOnly) {
            extensions.push(EditorState.readOnly.of(true));
        }

        this.editor = new EditorView({
            doc: startValue,
            extensions: extensions,
            parent: this.container
        });
    }

    render() {
        return html`<div id="editor-container"></div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'lc-code-editor': LcCodeEditor;
    }
}
