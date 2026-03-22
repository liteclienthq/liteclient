# LiteClient

<div align="center">

[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/liteclienthq.liteclient?style=flat-square&color=E11D48&label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=liteclienthq.liteclient)
[![VS Code Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/liteclienthq.liteclient?style=flat-square&color=blue&label=installs)](https://marketplace.visualstudio.com/items?itemName=liteclienthq.liteclient)
[![Open VSX Version](https://img.shields.io/open-vsx/v/liteclienthq/liteclient?style=flat-square&color=orange&label=Open%20VSX)](https://open-vsx.org/extension/liteclienthq/liteclient)
[![License](https://img.shields.io/github/license/liteclienthq/liteclient?style=flat-square&color=green)](https://github.com/liteclienthq/liteclient)

**The fast, local-first REST API client for VS Code.**

</div>

LiteClient is a native VS Code extension for sending HTTP requests, managing environments, organizing collections, and inspecting responses without leaving your editor.

![LiteClient Screenshot](media/screenshot.png)

## Why LiteClient

LiteClient is built for developers who want a focused API client inside VS Code:

- Fast startup and native VS Code UX
- Local-first storage with no account requirement
- No telemetry or cloud sync
- Strong support for environments, collections, cookies, OAuth, and scripting

## Core Features

- Collections with folders, drag-and-drop reordering, and Postman Collection v2.1 import/export
- Environments, globals, and collection variables with `{{variable}}` substitution
- Request building for headers, params, raw bodies, form data, and URL-encoded bodies
- Authentication support for API key, bearer token, basic auth, and OAuth 2.0
- Response inspection with formatting, headers, cookies, and timing
- Request history with quick replay
- Pre-request and post-response scripts with a Postman-style `pm` API
- Built-in cookie jar and cookie manager
- Global and workspace storage scopes
- Multi-tab request editing with `.lcreq` files

## Install

### VS Code Marketplace

1. Open Extensions in VS Code.
2. Search for `LiteClient`.
3. Click Install.

Marketplace page: [liteclienthq.liteclient](https://marketplace.visualstudio.com/items?itemName=liteclienthq.liteclient)

### Open VSX

Install from [Open VSX](https://open-vsx.org/extension/liteclienthq/liteclient) if your editor uses that registry.

## Quick Start

1. Open the LiteClient view from the VS Code activity bar.
2. Create a new request.
3. Enter a URL such as `https://jsonplaceholder.typicode.com/users`.
4. Choose an HTTP method and click **Send**.
5. Inspect the response body, headers, timing, and cookies.

For a guided walkthrough, see the docs site:
- [Introduction](https://docs.liteclient.com/introduction)
- [Quickstart](https://docs.liteclient.com/quickstart)
- [Variables guide](https://docs.liteclient.com/guides/variables)
- [OAuth guide](https://docs.liteclient.com/guides/oauth)
- [Troubleshooting](https://docs.liteclient.com/guides/troubleshooting)

## Privacy

LiteClient is designed to keep request data on your machine:

- Collections, environments, history, and cookies are stored locally
- OAuth tokens are stored in VS Code's secret storage
- Workspace storage can keep shared API data in a `.liteclient/` folder
- The extension does not require an account and does not use telemetry

## Development

- Contributor workflow: [CONTRIBUTING.md](CONTRIBUTING.md)
- Maintainer release process: [MAINTAINING.md](MAINTAINING.md)
- AI assistant guidance: [AGENTS.md](AGENTS.md)
- Full documentation source: [`docs/`](docs)

## Support

- Bugs: [GitHub Issues](https://github.com/liteclienthq/liteclient/issues)
- Feature requests: [GitHub Discussions](https://github.com/liteclienthq/liteclient/discussions)
- Source: [github.com/liteclienthq/liteclient](https://github.com/liteclienthq/liteclient)

## License

MIT License. See [LICENSE](LICENSE).
