/**
 * Base element for all LiteClient web components.
 * Uses light DOM to inherit VS Code's CSS variables.
 */

import { LitElement } from 'lit';

export class LcBaseElement extends LitElement {
    // Standard LitElement uses Shadow DOM by default.
    // This allows static styles to work correctly.
}

