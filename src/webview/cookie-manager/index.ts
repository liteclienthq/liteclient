import { html, render } from 'lit';
import { onMessage, postMessage } from '../shared/messaging';
import './components/lc-cookie-manager';

function updateApp() {
    const root = document.getElementById('app');
    if (!root) {
        return;
    }

    render(html`<lc-cookie-manager></lc-cookie-manager>`, root);
}

onMessage(message => {
    const manager = document.querySelector('lc-cookie-manager') as any;
    if (!manager) {
        return;
    }

    switch (message.type) {
        case 'cookies-list':
            manager.domains = (message as any).domains;
            break;
    }
});

updateApp();

postMessage({ type: 'get-cookies' } as any);
