import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { LcBaseElement } from '../shared/base-element';
import { postMessage, WebviewMessage } from '../shared/messaging';
import '../request/components/lc-tabs';

import './components/lc-history-list';
import './components/lc-collection-tree';
import './components/lc-env-switcher';
import './components/lc-filter-bar';
import './components/lc-confirmation-modal';


@customElement('lc-sidebar-panel')
export class LcSidebarPanel extends LcBaseElement {

  static override styles = css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--vscode-sideBar-background);
        color: var(--vscode-sideBar-foreground);
      }


      .header {
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }


      .new-request-btn {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 6px 12px;
        border-radius: 2px;
        cursor: pointer;
        width: 100%;
        font-family: inherit;
        font-weight: 500;
      }

      .new-request-btn:hover {
        background: var(--vscode-button-hoverBackground);
        display: block;
      }


      .content {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
      }

      .tab-content {
        display: none;
      }

      .tab-content.active {
        display: contents;
      }
    `;


  @state() private activeTab = 'collections';
  @state() private filterText = '';

  // No additional state needed for confirmation since it's handled by extension



  private tabs = [
    { id: 'collections', label: 'Collections' },
    { id: 'env', label: 'Env' },
    { id: 'history', label: 'History' }
  ];

  private handleTabChange(e: CustomEvent) {
    this.activeTab = e.detail.tabId;
  }

  private handleFilter(e: CustomEvent) {
    this.filterText = e.detail.value;
  }

  private get tabActions() {
    switch (this.activeTab) {
      case 'history':
        return [{ id: 'clear-history', label: 'Clear History', danger: true }];
      case 'collections':
        return [
          { id: 'add-collection', label: 'New Collection' },
          { id: 'import-collection', label: 'Import Collection' }
        ];
      case 'env':
        return [{ id: 'add-env', label: 'New Environment' }];
      default:
        return [];
    }
  }

  private handleFilterAction(e: CustomEvent) {
    const { actionId } = e.detail;
    switch (actionId) {
      case 'clear-history':
        postMessage({ type: 'history-action', action: 'clear-all' });
        break;

      case 'add-collection':
        postMessage({ type: 'add-collection' });
        break;
      case 'import-collection':
        postMessage({ type: 'import-collection' });
        break;
      case 'add-env':
        postMessage({ type: 'env-action', action: 'add' });
        break;
    }
  }



  private handleNewRequest() {
    postMessage({ type: 'new-request' });
  }

  private handleNewCollection() {
    postMessage({ type: 'add-collection' });
  }

  private handleOpenRequest(e: CustomEvent) {
    const { id, source, collectionId } = e.detail;
    postMessage({ type: 'open-request', id, source, sourceCollectionId: collectionId });
  }

  private handleHistoryAction(e: CustomEvent) {
    const { action, id, ids } = e.detail;
    postMessage({ type: 'history-action', action, id, ids });
  }

  private handleCollectionAction(e: CustomEvent) {
    const { action, collectionId, parentId } = e.detail;

    // Check specific actions passed from tree
    if (action === 'add-collection-request') {
      postMessage({ type: 'add-collection-request', collectionId, parentId });
    } else if (action === 'add-collection-folder') {
      postMessage({ type: 'add-collection-folder', collectionId, parentId });
    } else {
      postMessage({ type: 'collection-action', action, collectionId });
    }
  }

  // Generic handler for folders and requests
  private handleCollectionItemAction(e: CustomEvent) {
    const { action, id, collectionId, itemId, name } = e.detail;
    // Note: itemId is passed as 'itemId' in detail

    postMessage({ type: 'collection-item-action', action, collectionId, itemId, name });
  }

  private handleMoveItem(e: CustomEvent) {
    const { sourceCollectionId, targetCollectionId, itemId, targetParentId, insertBeforeId } = e.detail;
    postMessage({ type: 'move-collection-item', sourceCollectionId, targetCollectionId, itemId, targetParentId, insertBeforeId });
  }

  private handleEnvAction(e: CustomEvent) {
    const { action, id } = e.detail;
    postMessage({ type: 'env-action', action, id });
  }

  private handleEnvVariableAction(e: CustomEvent) {
    const { action, envId, varName } = e.detail;
    // Handle variable-specific actions
    if (action === 'add-variable') {
      // For adding variables, we'll need to prompt for key and value
      // This will be handled in the extension
      postMessage({ type: 'env-variable-action', action, envId, varName });
    } else if (action === 'edit-variable') {
      postMessage({ type: 'env-variable-action', action, envId, varName });
    } else if (action === 'delete-variable') {
      postMessage({ type: 'env-variable-action', action, envId, varName });
    }
  }



  override render() {
    return html`
      <div class="header">
        <button class="new-request-btn" @click=${this.handleNewRequest}>
          New Request
        </button>
        <lc-tabs
          .tabs=${this.tabs}
          activeTab=${this.activeTab}
          @tab-change=${this.handleTabChange}
        ></lc-tabs>
      </div>

      <lc-filter-bar
        .value=${this.filterText}
        .actions=${this.tabActions}
        @filter=${this.handleFilter}
        @action=${this.handleFilterAction}
        placeholder="Filter ${this.activeTab}..."
      ></lc-filter-bar>



      <div class="content">
        <div class="tab-content ${this.activeTab === 'history' ? 'active' : ''}">
          <lc-history-list
            .filterText=${this.filterText}
            @history-action=${this.handleHistoryAction}
            @open-request=${this.handleOpenRequest}
          ></lc-history-list>
        </div>
        <div class="tab-content ${this.activeTab === 'collections' ? 'active' : ''}">
          <lc-collection-tree
            .filterText=${this.filterText}
            @collection-action=${this.handleCollectionAction}
            @collection-item-action=${this.handleCollectionItemAction}
            @open-request=${this.handleOpenRequest}
            @move-item=${this.handleMoveItem}
          ></lc-collection-tree>
        </div>
        <div class="tab-content ${this.activeTab === 'env' ? 'active' : ''}">
          <lc-env-switcher
            .filterText=${this.filterText}
            @env-action=${this.handleEnvAction}
            @env-variable-action=${this.handleEnvVariableAction}
          ></lc-env-switcher>
        </div>
      </div>


    `;
  }

}
