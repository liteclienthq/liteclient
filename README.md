# LiteClient

**The lightweight, native REST API client for Visual Studio Code.**

LiteClient is a fast, no-nonsense API testing tool built specifically for the VS Code ecosystem. It provides the core functionality of Postman or Thunder Client without the bloat, forced cloud accounts, or telemetry.

## Core Features

- ⚡ **Lightweight & Fast**: Instant startup and low memory footprint.
- 🎨 **Native UX**: Designed to look and feel like a part of VS Code, not a web app in a frame.
- 📁 **Collections**: Organize your requests into logical folders and save them for later.
- 🌍 **Environments**: Manage variables (`{{host}}`, `{{token}}`) across different environments seamlessly.
- 🛠️ **Full Method Support**: GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS.
- 🧱 **Flexible Editor**: Intuitive editors for Query Params, Headers, and Body (JSON, Text, Form Data).
- 🌓 **Layout Flexibility**: Choose between single-pane or two-pane views to match your workflow.
- 🔒 **Privacy First**: No account required. No telemetry. All data stays on your machine.
- 🔑 **Authentication**: Built-in support for Bearer Token, Basic Auth, and API Key.

## Getting Started

### Creating Your First Request
1. Click the **LiteClient** icon in the Activity Bar.
2. In the **Requests** view, click the **+ (New Request)** button.
3. Enter your URL and click **Send**.

### Using Environments
1. Go to the **Environments** view and click **+**.
2. Add variables like `baseUrl` or `apiKey`.
3. Use them in your requests with double curly braces: `{{baseUrl}}/users`.

### Saving to Collections
Once you have a request configured:
1. Click the **Save** button.
2. Select an existing collection or create a new one.

---

## Why LiteClient?

Most API clients have become bloated with social features, forced cloud syncing, and AI marketing. LiteClient returns to the basics:

- **Speed**: We don't load a browser-within-a-browser.
- **Privacy**: We don't track your requests or your usage.
- **Integration**: We use VS Code's native treeviews and themes for a seamless experience.

## Privacy & Security

We take your data seriously:
- **No Telemetry**: We do not collect any data about how you use the extension.
- **No Third-Party Tracking**: Your requests are your own.
- **Local Storage**: All collections, history, and environments are stored locally in your VS Code global storage.

## Roadmap

- [ ] Import from Postman / Thunder Client
- [ ] View Response Headers tab
- [ ] Multi-part form data support

## Links

- **GitHub Issues**: [liteclienthq/liteclient-issues](https://github.com/liteclienthq/liteclient-issues)
- **Marketplace**: [LiteClient on VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=liteclienthq.liteclient)

---

**Enjoy a faster way to test APIs.**
