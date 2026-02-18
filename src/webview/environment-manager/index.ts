import { html, render } from 'lit';
import { onMessage, postMessage } from '../shared/messaging';
import './components/lc-environment-manager';

function updateApp() {
    const root = document.getElementById('app');
    if (!root) {
        return;
    }

    render(html`<lc-environment-manager></lc-environment-manager>`, root);
}

onMessage(message => {
    const manager = document.querySelector('lc-environment-manager') as any;
    if (!manager) {
        return;
    }

    switch (message.type) {
        case 'envmgr-state':
            manager.environment = (message as any).environment;
            break;
    }
});

updateApp();

postMessage({ type: 'envmgr-get-state' } as any);
