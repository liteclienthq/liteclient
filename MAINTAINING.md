# Maintenance Guide

This document outlines the standard workflow for maintaining, updating, and releasing LiteClient. It serves as a reference for maintainers and contributors to ensure consistency and quality.

## Development Workflow

1.  **Branching Strategy**
    *   Never commit directly to `main`.
    *   Create a feature branch for every task: `git checkout -b feature/your-feature-name`.
    *   Use descriptive branch names (e.g., `feature/auth-improvements`, `fix/response-scrolling`).

2.  **Implementation & Verification**
    *   Implement changes incrementally.
    *   Verify changes manually or with tests (`npm run check`, `npm test`).
    *   Ensure no regressions in existing functionality.

3.  **Documentation Updates**
    *   **CHANGELOG.md**: Always update the Changelog. Add a new `[Unreleased]` section or update the upcoming version section. List changes under `Added`, `Changed`, `Fixed`, or `Removed`.
    *   **README.md**: If the feature is user-facing, update the documentation in the README.
    *   **package.json**: Bump the version number according to [Semantic Versioning](https://semver.org/) rules (Major.Minor.Patch).

## Release Process

Once a feature or set of features is ready on a branch:

1.  **Final Verification**
    *   Run full checks: `npm run check`.
    *   Verify the `version` in `package.json` matches the release target.
    *   Verify `CHANGELOG.md` has the correct date and version entry.

2.  **Merge to Main**
    *   Commit all changes on the feature branch.
    *   Switch to main: `git checkout main`.
    *   Merge the feature branch: `git merge feature/your-feature-name`.

3.  **Publish to Marketplaces**
    *   **VS Code Marketplace**:
        ```bash
        npx vsce publish
        ```
    *   **Open VSX Registry**:
        ```bash
        npx ovsx publish
        ```
    *   *Note: Ensure you have the necessary publisher access tokens configured.*

4.  **GitHub Release**
    *   Create a git tag: `git tag vX.Y.Z` (e.g., `git tag v0.5.0`).
    *   Push main and tags: `git push origin main --tags`.
    *   Create a Release on GitHub using the tag, pasting the relevant `CHANGELOG.md` entry as the description.

## Code Style & Standards
*   Follow the existing code style (Prettier/ESLint are configured).
*   Keep commits small, scoped, and descriptive.
*   Prioritize backward compatibility for user data (collections, history).
