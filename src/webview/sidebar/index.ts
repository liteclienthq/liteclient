import { html, render } from 'lit';
import { onMessage, postMessage } from '../shared/messaging';
import './lc-sidebar-panel';
import './components/lc-history-list';
import './components/lc-collection-tree';
import './components/lc-env-switcher';
import './components/lc-environment-list';

function updateSidebar() {
    const root = document.getElementById('app');
    if (!root) {
        return;
    }

    render(html`
    <lc-sidebar-panel></lc-sidebar-panel>
  `, root);
}

onMessage(message => {
    const sidebar = document.querySelector('lc-sidebar-panel') as any;
    if (!sidebar || !sidebar.shadowRoot) {
        return;
    }

    switch (message.type) {
        case 'history-list':
            const historyList = sidebar.shadowRoot.querySelector('lc-history-list');
            if (historyList) {
                historyList.items = message.items;
            }
            break;

        case 'collections-list':
            const collectionTree = sidebar.shadowRoot.querySelector('lc-collection-tree');
            if (collectionTree) {
                collectionTree.collections = message.collections;
            }
            break;

        case 'environments-list':
            const envSwitcher = sidebar.shadowRoot.querySelector('lc-env-switcher');
            if (envSwitcher) {
                envSwitcher.environments = message.environments;
                envSwitcher.selectedEnvironmentId = message.selectedEnvironmentId;
            }
            break;
    }
});

updateSidebar();

// Request initial data
postMessage({ type: 'get-history' });
postMessage({ type: 'get-collections' });
postMessage({ type: 'get-environments' });


