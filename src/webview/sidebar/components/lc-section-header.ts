import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { LcBaseElement } from '../../shared/base-element';

export interface SectionAction {
    id: string;
    label: string;
    icon: string; // SVG path or icon name
}

@customElement('lc-section-header')
export class LcSectionHeader extends LcBaseElement {
    static override styles = css`
    :host {
      display: block;
      margin: 8px 4px 4px 4px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      height: 22px;
    }

    .title {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      color: var(--vscode-sideBarSectionHeader-foreground);
      opacity: 0.8;
      letter-spacing: 0.5px;
      user-select: none;
    }

    .actions {
      display: flex;
      gap: 4px;
      opacity: 0.4;
      transition: opacity 0.2s;
    }


    .header:hover .actions {
      opacity: 1;
    }

    .action-btn {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      border-radius: 3px;
      padding: 0;
    }

    .action-btn:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .action-btn svg {
      width: 14px;
      height: 14px;
    }
  `;

    @property() title = '';
    @property({ type: Array }) actions: SectionAction[] = [];

    private handleAction(e: Event, actionId: string) {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent('action', {
            detail: { actionId },
            bubbles: true,
            composed: true
        }));
    }

    override render() {
        return html`
      <div class="header">
        <span class="title">${this.title}</span>
        <div class="actions">
          ${this.actions.map(action => html`
            <button 
              class="action-btn" 
              title=${action.label} 
              @click=${(e: Event) => this.handleAction(e, action.id)}
            >
              <svg viewBox="0 0 16 16" fill="currentColor">
                ${unsafeSVG(action.icon)}
              </svg>
            </button>

          `)}
        </div>
      </div>
    `;
    }
}
