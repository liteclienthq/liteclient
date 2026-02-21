# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.15.0] - 2026-02-21

### Added
- **Response Body Formatting**: JSON and HTML/XML responses are now automatically pretty-printed for readability
- **Format Button**: Manual "Format" button in the response toolbar to re-trigger formatting on demand
- **js-beautify Integration**: HTML/XML formatting powered by `js-beautify` for reliable, industry-standard output

## [0.14.0] - 2026-02-19

### Added
- **Environment Manager**: Full webview panel for managing environments and variables in a table UI (similar to Postman). Open via command palette (`LiteClient: Manage Environments`) or the "Manage" action on any environment in the sidebar. Supports inline editing of variable name, initial value, current value, type (default/secret), and enabled state.
- **Current Value Overrides**: Set workspace-local "current values" for environment variables that override initial values during request execution. Current values are stored in VS Code's `workspaceState` and never committed to Git.
- **Secret Variable Masking**: Variables with type `secret` display masked values (`••••••••`) in the sidebar, URL bar autocomplete, and request metadata views. Secret fields use password inputs in the Environment Manager.
- **Current Value Actions**: Context menu on variables includes "Set Current Value" and "Clear Current Value" options. Secret variables use a password input when setting current values.

### Changed
- **Environment Variables Data Model**: Variables now use structured `EnvironmentVariable` objects with `id`, `name`, `initialValue`, `type` (default/secret), and `enabled` fields instead of plain key-value pairs
- **Variable Resolution**: New centralized `variableResolver` with layered resolution order: Globals → Collection → Environment. Resolution precedence: overrides → currentValue → initialValue.
- **Auto-Migration**: Existing environments using the legacy format are automatically migrated on load
- **Type Consolidation**: Single `Environment` interface in `models.ts`, removing duplicates from `messages.ts` and `variableSubstitution.ts`
- **Documentation**: Reorganized CONTRIBUTING.md, MAINTAINING.md, and AGENTS.md with clear separation of concerns

## [0.13.0] - 2026-02-09

### Added
- **Workspace-Scoped Storage**: Store collections, environments, and history in a `.liteclient/` folder in your workspace root for team sharing via Git. Configurable via `liteclient.storageScope` setting.
- **Storage Scope Switcher**: Status bar indicator shows current storage scope (Global/Workspace). Click to switch.
- **Migrate to Workspace Command**: `LiteClient: Migrate Data to Workspace` copies existing global data into the workspace `.liteclient/` folder.
- **File System Watcher**: Automatically refreshes sidebar when `.liteclient/*.json` files change externally (e.g., after `git pull`).

## [0.12.1] - 2026-02-07

### Documentation
- Updated AGENTS.md with complete architecture and feature documentation
- Updated README.md with comprehensive user guide and feature descriptions

## [0.12.0] - 2026-02-04

### Added
- **Variable Autocomplete**: Type `{{` in URL, params, headers, or body fields to trigger autocomplete dropdown showing available environment and global variables. Navigate with arrow keys, select with Enter/Tab.
- **Tab Indicators**: Visual indicators on tabs show item counts (Params, Headers, Response Headers, Cookies) or a dot (Body) when content is present.

### Changed
- **Draggable Separator**: Updated request/response separator to match VS Code's native sash styling—subtle border by default, blue highlight on hover.

### Fixed
- **Dropdown Backgrounds on Windows**: Fixed dropdown elements in auth panel showing white backgrounds in dark mode on Windows. Dropdowns now use consistent neutral background matching the extension's styling.

## [0.11.0] - 2026-02-02

### Added
- **OAuth 2.0 Authentication**: Full OAuth 2.0 support with three grant type options:
  - **Authorization Code**: For user authentication via browser with traditional flow.
  - **Authorization Code with PKCE**: Enhanced security for public clients using Proof Key for Code Exchange.
  - **Client Credentials**: For machine-to-machine authentication (e.g., Auth0 M2M apps).
  - Configurable client authentication method: "Send as Basic Auth Header" (default) or "Send credentials in body".
  - Support for Audience and Scope parameters for providers like Auth0.
  - Automatic token caching in VS Code's secure secret storage.
  - Automatic token refresh when tokens expire.
  - Token status display showing expiration time.
  - Authorization header automatically injected when sending requests.

## [0.10.0] - 2025-01-29

### Added
- **Drag-and-Drop Reordering**: Requests and folders can now be reordered within collections via drag-and-drop. Drag items before/after siblings to reorder, or drop onto folders to nest them inside.
- **Cross-Collection Moves**: Items can be dragged between different collections, not just within the same collection.

## [0.9.1] - 2025-01-29

### Fixed
- **Variable Substitution in Form Bodies**: Variables (`{{varName}}`) are now correctly substituted in `form-data` and `x-www-form-urlencoded` request body fields. Previously, variable substitution only worked for raw body content.

## [0.9.0] - 2025-01-26

### Added
- **Request Timeout & Cancel**: Requests now have a 30-second default timeout. Cancel button appears in the response area while a request is in flight, allowing users to abort long-running requests.
- **Cookie Jar**: Per-domain cookie persistence using `tough-cookie`. Cookies are automatically sent on subsequent requests to the same domain.
- **Cookie Manager**: New webview panel for managing stored cookies. Access via "LiteClient: Manage Cookies" command. View all cookies grouped by domain in collapsible accordions. Delete individual cookies, all cookies for a domain, or clear all cookies.
- **Cookies Tab**: New "Cookies" tab in response area displays parsed Set-Cookie headers with Name, Value, Domain, Path, Expires, and flags (Secure, HttpOnly, SameSite) in a table format. Cookie count shown in tab label.

### Fixed
- **Cookie Capture on Redirects**: Cookies set during HTTP redirects (e.g., 302 responses) are now properly captured and displayed. Previously, only cookies from the final response were visible.

### Changed
- **Basic Auth Encoding**: Replaced deprecated `btoa` with `Buffer.from().toString('base64')` for proper Base64 encoding.
- **ID Generation**: Unified all ID generators to use `crypto.randomUUID()` via `idUtils.ts`.
- **History Metadata**: Added `durationMs` to history execution records for response time tracking.

## [0.8.0] - 2025-01-25

### Added
- **File Upload Support**: Form-data requests now support file uploads with a Postman-style UI
  - Text/File type dropdown inside the key field
  - File picker with name and size display
  - 25MB file size limit with VS Code notification warning
- **YAML Language Support**: Added YAML syntax highlighting using @codemirror/lang-yaml

### Fixed
- **JSON Auto-Formatting**: Removed aggressive automatic JSON formatting to match VS Code's behavior - now preserves user input exactly as typed

## [0.7.3] - 2025-01-19

### Fixed
- **Critical: Collections Not Loading**: Fixed JSON parse error that prevented collections, history, and environments from loading when data files were corrupted. The extension now gracefully handles corrupted files by backing them up and starting fresh.
- **Data Corruption Prevention**: Implemented atomic file writes with write locking to prevent race conditions that could corrupt JSON data files during rapid operations.

## [0.7.2] - 2025-01-19

### Added
- **Unsaved Changes Indicator**: Request editor tabs now show a "●" suffix when there are unsaved changes, following VS Code's file indicator pattern. Cleared only on explicit save.
- **Tab Icon**: LiteClient request tabs now display the LC icon for instant recognition among other editor tabs.

### Changed
- **Sidebar Tabs**: Improved tab navigation UX with bold text, proper active state styling, and a separator below tabs. Tabs gracefully truncate at narrow widths without overlapping.
- **Filter Bar**: Transparent background to match sidebar styling.

## [0.7.1] - 2025-01-17

### Changed
- **History Panel UI**: Grouped history items by local calendar day with collapsible accordions (Today, Yesterday, January 18, etc.)
- **History Item Display**: Simplified to show only METHOD + URL with tooltip for full URL on hover
- **Tab Order**: Changed sidebar tabs to Collections → Env → History

### Added
- **Day-Level Delete**: Trash icon on day headers to bulk-delete all requests from that day
- **Item-Level Delete**: Trash icon appears on hover for individual history items

### Fixed
- **Sidebar Scrolling**: Fixed scrolling issue in History, Collections, and Env panels

## [0.7.0] - 2025-01-15

### Changed
- **History Architecture**: Migrated from Thunder Client-style deduplication to Postman-style execution ledger. Every Send creates a new immutable history entry.
- **History Limit**: Increased from 50 to 100 entries.

### Added
- **Source Tracking**: History entries now track their origin (scratch, collection, or history replay).
- **Automatic Migration**: Existing history entries are automatically converted to the new format.

### Removed
- **History Rename**: Removed ability to rename history entries (immutability by design).

## [0.6.0] - 2025-01-13

### Changed
- **Codebase Refactor**: Extracted command handlers to dedicated files in `src/extension/commands/` for better maintainability.
- **Message Protocol**: Added typed message definitions in `src/shared/messages.ts` for type-safe extension ↔ webview communication.
- **Handler Pattern**: Replaced switch statements with handler maps in `SidebarProvider` and `RequestPanelManager`.
- **Extension Entry Point**: Simplified `extension.ts` from ~440 lines to ~50 lines.

### Added
- **Save Button**: Added save button to the request panel URL bar for saving requests to collections.
- **Keyboard Shortcut**: Added Ctrl+S / Cmd+S shortcut to save requests.

### Fixed
- **Collection Save**: Ensured `type: 'request'` is set when saving requests to collections.

## [0.5.3] - 2026-01-11

### Changed
- **Accessibility:** Body panel — keyboard activation (Space/Enter) and visible focus styles for body-type options.

### Fixed
- **UI:** Corrected raw-type dropdown border CSS variable to use `--vscode-dropdown-border`.

## [0.5.2] - 2026-01-09

### Changed
- **URL Bar UI Improvements**: Enhanced the visual design of the URL bar with improved spacing, sizing, and alignment.
- **Method Selector Styling**: Added custom SVG arrow to the method selector dropdown with proper spacing.
- **Environment Selector Fixed Width**: Set a fixed width for the environment selector to prevent resizing with long environment names.
- **Input Box Readability**: Improved text readability in the URL input box with adjusted padding, font size, and line height.
- **Toggle Icon Update**: Changed the layout toggle icon to a three-box design representing two-pane/single-pane layouts with transparent borders.

## [0.5.1] - 2026-01-07

### Changed
- **Body Panel Improvements**: Enhanced layout and usability of the request body panel.
- **Default Raw Type**: JSON is now the default selection for raw body types.
- **Dropdown Positioning**: Moved raw type dropdown to the top right of the editor area for better UX.
- **UI Polish**: Removed unnecessary borders, improved centering, and fixed layout shifts.

### Fixed
- **Layout Stability**: Eliminated subtle movements and overlaps in the body panel when switching modes or resizing.
- **Responsive Design**: Radio buttons now scroll horizontally without text wrapping on narrow panels.

## [0.5.0] - 2026-01-06

### Added
- **Request Body Support**: Full support for `none`, `raw` (text, JSON, HTML, etc.), `form-data`, and `x-www-form-urlencoded` body types.
- **Tabular Body Editor**: Postman-consistent tabular editor for `form-data` and `url-encoded` bodies.
- **Improved Request Engine**: Native encoding for multipart and url-encoded bodies.

### Fixed
- **Backward Compatibility**: Automatically handle and migrate collections/history from older versions that do not have body definitions.

## [0.4.0] - 2026-01-06

### Added
- **Postman Support**: Full support for importing and exporting Postman Collection v2.1 format.
- **Authentication Persistence**: Added mapping for Basic, Bearer, and API Key authentication during Postman import/export.
- **Improved URL Parsing**: Better handling of ports and query parameters during collection portability.

### Fixed
- Fixed a bug where custom ports were lost during collection export.
- Resolved "Missing name" errors when importing standard Postman collections.


## [0.3.0] - 2026-01-04

### Changed
- **Architectural Overhaul**: Complete refactor of the core request engine for better performance and stability.
- **Public Repository**: Project is now open source! Issues have been moved to the main repository.

### Added
- **New Logo**: Updated branding.
- **Enhanced Type Safety**: Strict null checks and better type definitions across the extension and webview.
- **Improved UI/UX**: Polished sidebar interactions and response view layout.

## [0.2.0] - 2025-12-24

### Added
- **Enhanced Response View**: Introduced a tabbed interface with "Response" and "Headers" tabs.
- **Auto-Formatting**: JSON responses are now automatically formatted and syntax-highlighted.
- **Editor Experience**: Response area features line numbers and is selectable for easy copying.
- **Response Headers**: Dedicated tab to view all response headers in a structured table.
- **Professional Status Bar**: Status, Size, and Time are always visible with placeholders.

### Removed
- Removed the manual "Format" button as formatting is now automatic.

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