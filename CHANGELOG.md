# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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