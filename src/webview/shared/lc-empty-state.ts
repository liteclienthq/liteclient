import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LcBaseElement } from './base-element.js';

@customElement('lc-empty-state')
export class LcEmptyState extends LcBaseElement {
  @property({ type: String }) icon: 'history' | 'folder' | 'send' | 'headers' | 'cookie' | 'test' | 'env' | 'none' = 'none';
  @property({ type: String }) title = '';
  @property({ type: String }) description = '';
  @property({ type: String }) action = '';
  @property({ type: Boolean }) compact = false;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
      padding: 24px 16px;
      max-width: 280px;
    }

    :host([compact]) .empty-state {
      padding: 16px 12px;
      gap: 6px;
    }

    .icon-container {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: var(--vscode-badge-background);
      opacity: 0.6;
      margin-bottom: 4px;
    }

    :host([compact]) .icon-container {
      width: 28px;
      height: 28px;
      margin-bottom: 2px;
    }

    .icon-container svg {
      width: 18px;
      height: 18px;
      color: var(--vscode-badge-foreground);
    }

    :host([compact]) .icon-container svg {
      width: 14px;
      height: 14px;
    }

    .title {
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground);
      opacity: 0.8;
    }

    :host([compact]) .title {
      font-size: 12px;
    }

    .description {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.5;
    }

    :host([compact]) .description {
      font-size: 11px;
    }

    .action-btn {
      margin-top: 4px;
      padding: 5px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      font-size: 12px;
      cursor: pointer;
      font-family: inherit;
    }

    .action-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
  `;

  private renderIcon() {
    switch (this.icon) {
      case 'send':
        return html`<svg viewBox="0 0 16 16" fill="currentColor"><path d="M1.724 1.053a.5.5 0 0 0-.714.545l1.403 4.85a.5.5 0 0 0 .397.354l5.69.953c.268.045.268.426 0 .47l-5.69.954a.5.5 0 0 0-.397.353l-1.403 4.85a.5.5 0 0 0 .714.546l13-6.5a.5.5 0 0 0 0-.894l-13-6.5z"/></svg>`;
      case 'history':
        return html`<svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.507 12.324a7 7 0 0 0 .065-8.56A7 7 0 0 0 2 4.393V2H1v3.5l.5.5H5V5H2.811a6.008 6.008 0 1 1-.135 5.77l-.887.462a7 7 0 0 0 11.718 1.092zM8 4v4.5l3.5 2-.5.866-4-2.334V4h1z"/></svg>`;
      case 'folder':
        return html`<svg viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 3H7.71l-1.5-1.5H1.5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V3.5a.5.5 0 0 0-.5-.5z"/></svg>`;
      case 'headers':
        return html`<svg viewBox="0 0 16 16" fill="currentColor"><path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 2h12v3H2V2zm0 4h5v8H2V6zm6 8V6h6v8H8z"/></svg>`;
      case 'cookie':
        return html`<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM2 8a6 6 0 0 1 6-6 1 1 0 0 1 0 2 1 1 0 0 0 0 2 1 1 0 0 1 0 2H7a1 1 0 0 0 0 2 6 6 0 0 1-5-6zm8 4.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm1-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>`;
      case 'test':
        return html`<svg viewBox="0 0 16 16" fill="currentColor"><path d="M6 2.984V2h-.09c-.313 0-.616.062-.909.185a2.33 2.33 0 0 0-.775.53 2.23 2.23 0 0 0-.493.753v.001a3.542 3.542 0 0 0-.198.83v.002a6.08 6.08 0 0 0-.024.863c.012.29.018.58.018.869 0 .203-.04.393-.117.572v.001a1.504 1.504 0 0 1-.765.787 1.376 1.376 0 0 1-.558.115H2v.984h.09c.195 0 .38.04.556.121l.001.001c.178.078.329.184.455.318l.002.002c.13.13.233.285.307.465a1.532 1.532 0 0 1 .117.572c0 .29-.006.58-.018.869-.012.296-.004.585.024.863v.002c.033.252.1.503.198.753a2.5 2.5 0 0 0 .493.753c.205.21.465.39.774.53.293.123.596.185.91.185H6v-.984h-.09c-.199 0-.387-.038-.564-.115a1.504 1.504 0 0 1-.765-.787v-.001a1.329 1.329 0 0 1-.117-.572c0-.29.006-.58.018-.869.012-.296.004-.585-.024-.863v-.002a3.542 3.542 0 0 0-.198-.753 2.23 2.23 0 0 0-.493-.753 2.33 2.33 0 0 0-.775-.53 2.325 2.325 0 0 0 .775-.53c.205-.21.37-.462.493-.753.1-.25.166-.501.198-.753v-.002c.028-.278.036-.567.024-.863a18.592 18.592 0 0 1-.018-.869c0-.203.04-.393.117-.572v-.001a1.504 1.504 0 0 1 .765-.787A1.376 1.376 0 0 1 5.91 2.984H6zm4 0V2h.09c.313 0 .616.062.909.185.309.14.57.32.775.53.205.21.37.462.493.753v.001c.1.25.166.501.198.83v.002c.028.278.036.567.024.863-.012.29-.018.58-.018.869 0 .203.04.393.117.572v.001c.13.18.301.336.456.465l.002.002c.13.13.283.233.463.318l.001.001c.178.078.363.121.558.121H14v.984h-.09a1.376 1.376 0 0 0-.558.115 1.504 1.504 0 0 0-.765.787v.001a1.329 1.329 0 0 0-.117.572c0 .29.006.58.018.869.012.296.004.585-.024.863v.002a3.542 3.542 0 0 1-.198.753 2.5 2.5 0 0 1-.493.753 2.33 2.33 0 0 1-.775.53 2.325 2.325 0 0 1-.91.185H10v-.984h.09c.199 0 .387-.038.564-.115a1.504 1.504 0 0 0 .765-.787v-.001c.078-.18.117-.369.117-.572 0-.29-.006-.58-.018-.869-.012-.296-.004-.585.024-.863v-.002c.033-.252.1-.503.198-.753.123-.292.288-.543.493-.753.205-.21.465-.39.774-.53a2.325 2.325 0 0 0-.774-.53 2.23 2.23 0 0 1-.493-.753 3.542 3.542 0 0 1-.198-.753v-.002a6.08 6.08 0 0 1-.024-.863c.012-.29.018-.58.018-.869 0-.203-.04-.393-.117-.572v-.001a1.504 1.504 0 0 0-.765-.787 1.376 1.376 0 0 0-.564-.115H10z"/></svg>`;
      case 'env':
        return html`<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM5.5 8a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0z"/></svg>`;
      default:
        return nothing;
    }
  }

  private handleActionClick() {
    this.dispatchEvent(new CustomEvent('action-click', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div class="empty-state">
        ${this.icon !== 'none' ? html`
          <div class="icon-container">${this.renderIcon()}</div>
        ` : nothing}
        ${this.title ? html`<div class="title">${this.title}</div>` : nothing}
        ${this.description ? html`<div class="description">${this.description}</div>` : nothing}
        ${this.action ? html`
          <button class="action-btn" @click=${this.handleActionClick}>${this.action}</button>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lc-empty-state': LcEmptyState;
  }
}
