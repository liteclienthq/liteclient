import { html, render } from 'lit';
import { onMessage, postMessage } from '../shared/messaging';
import './components/lc-runner-panel';

function updateApp() {
    const root = document.getElementById('app');
    if (!root) {
        return;
    }

    render(html`<lc-runner-panel></lc-runner-panel>`, root);
}

onMessage(message => {
    const panel = document.querySelector('lc-runner-panel') as any;
    if (!panel) {
        return;
    }

    switch (message.type) {
        case 'runner-state':
            panel.collectionName = (message as any).collectionName;
            panel.folderName = (message as any).folderName;
            panel.totalRequests = (message as any).totalRequests;
            panel.environmentName = (message as any).environmentName;
            break;
        case 'runner-progress':
            panel.handleProgress(message);
            break;
        case 'runner-complete':
            panel.handleComplete(message);
            break;
        case 'runner-error':
            panel.handleError((message as any).error);
            break;
    }
});

updateApp();

postMessage({ type: 'runner-get-state' } as any);
