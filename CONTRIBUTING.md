# Contributing to LiteClient
    
## Branching Strategy
We follow a **Feature Branch** workflow.
- **main**: stable, production-ready code.
- **feature/name**: for new features and non-trivial changes.
- **fix/issue**: for bug fixes.

**Workflow:**
1.  Checkout `main` and pull latest.
2.  Create a branch: `git checkout -b feature/my-feature`.
3.  Commit changes.
4.  Merge back to `main` via PR/Merge.

## Versioning Strategy
We follow **Semantic Versioning (SemVer)**: `vX.Y.Z`
- **Major (X)**: Breaking changes.
- **Minor (Y)**: New features (backward compatible).
- **Patch (Z)**: Bug fixes (backward compatible).

Examples:
- `v0.1.0` -> First release.
- `v0.2.0` -> Added Body Type selection.
- `v0.2.1` -> Fixed a bug in Body Type.

## Publishing
- The extension is published to VS Code Marketplace and Open VSX Registry.
- Publishing is done manually after verifying a feature set on `main`.
