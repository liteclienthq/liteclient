# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-19

### Added
- **Core HTTP Features**: GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS support.
- **Authentication**: Native support for Bearer Token, Basic Auth, and API Key.
- **Collections**: Sidebar treeview for organizing requests into folders.
- **Environments**: Variable substitution (e.g., `{{baseUrl}}`) and quick switcher.
- **History**: Automatic history tracking for all sent requests.
- **Layouts**: Choice between Single-Pane and Two-Pane views.
- **Privacy**: Local-first storage with no telemetry or external tracking.

### Fixed
- Fixed real-time environment sync in open request panels.
- Resolved vertical scrolling issues in the response pane.
- Aligned treeview indentation by standardizing on VS Code Product Icons.
- Improved "New User" flow with proactive collection creation prompts.
- Fixed button visibility across all VS Code themes (light/dark mode).