import { html, render } from 'lit';
import { onMessage, postMessage } from '../shared/messaging';
import './components/lc-collection-manager';

function updateApp() {
    const root = document.getElementById('app');
    if (!root) {
        return;
    }

    render(html`<lc-collection-manager></lc-collection-manager>`, root);
}

onMessage(message => {
    const manager = document.querySelector('lc-collection-manager') as any;
    if (!manager) {
        return;
    }

    if (message.type === 'collectionmgr-state') {
        manager.collection = (message as any).collection;
    }
});

updateApp();

postMessage({ type: 'collectionmgr-get-state' } as any);
