# LiteClient

<div align="center">

[![VS Marketplace](https://img.shields.io/badge/VS%20Marketplace-Install-E11D48?style=flat-square&logo=visual-studio-code&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=liteclienthq.liteclient)
[![Open VSX](https://img.shields.io/badge/Open%20VSX-Install-orange?style=flat-square&logo=eclipse-ide&logoColor=white)](https://open-vsx.org/extension/liteclienthq/liteclient)
[![Documentation](https://img.shields.io/badge/Docs-docs.liteclient.com-blue?style=flat-square&logo=readthedocs&logoColor=white)](https://docs.liteclient.com)
[![License](https://img.shields.io/github/license/liteclienthq/liteclient?style=flat-square&color=green)](https://github.com/liteclienthq/liteclient)

**The fast, local-first REST API client for VS Code.**

</div>

LiteClient is a native VS Code extension for sending HTTP requests, managing environments, organizing collections, and inspecting responses without leaving your editor.

![LiteClient Screenshot](media/screenshot.png)

## Table of Contents

- [Why LiteClient](#why-liteclient)
- [Core Features](#core-features)
- [Install](#install)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Privacy](#privacy)
- [Development](#development)
- [Support](#support)
- [License](#license)

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
- Collection runner for sequential execution with variable chaining and real-time results
- Pre-request and post-response scripts with a Postman-style `pm` API, including `pm.sendRequest()`
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
3. Enter a URL such as `https://liteclient.com/hello`.
4. Choose an HTTP method and click **Send**.
5. Inspect the response body, headers, timing, and cookies.

## Documentation

Full guides and references are available at [docs.liteclient.com](https://docs.liteclient.com):

- [Introduction](https://docs.liteclient.com/introduction)
- [Quickstart](https://docs.liteclient.com/quickstart)
- [Variables](https://docs.liteclient.com/guides/variables)
- [OAuth](https://docs.liteclient.com/guides/oauth)
- [Scripting](https://docs.liteclient.com/guides/scripting)
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
