#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# LiteClient Release Script
#
# Automates MAINTAINING.md steps 5–9:
#   1. Pre-flight checks (clean tree, changelog, version)
#   2. Run check + lint + test
#   3. Commit the release
#   4. Build & publish to VS Code Marketplace
#   5. Build & publish to Open VSX
#   6. Tag and push
#
# Usage:
#   npm run release          # interactive — reads version from package.json
#   npm run release -- --dry # dry run — skips publish/push
# ============================================================================

DRY_RUN=false
if [[ "${1:-}" == "--dry" ]]; then
    DRY_RUN=true
    echo "🧪 DRY RUN — will skip publish and push"
    echo ""
fi

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

step() { echo -e "\n${GREEN}▸ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✖ $1${NC}"; exit 1; }

# --- Pre-flight checks ---
step "Pre-flight checks"

# 1. Read version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"
echo "  Version: ${VERSION}"
echo "  Tag:     ${TAG}"

# 2. Ensure working tree is clean (allow untracked files)
if ! git diff --quiet HEAD; then
    fail "Working tree has uncommitted changes. Commit or stash them first."
fi

# 3. Ensure we're on main
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" ]]; then
    warn "You're on branch '${BRANCH}', not 'main'. Continue? (y/N)"
    read -r CONFIRM
    [[ "$CONFIRM" == "y" || "$CONFIRM" == "Y" ]] || exit 0
fi

# 4. Ensure tag doesn't already exist
if git rev-parse "$TAG" >/dev/null 2>&1; then
    fail "Tag ${TAG} already exists. Did you forget to bump the version in package.json?"
fi

# 5. Check CHANGELOG has this version
if ! grep -q "\[${VERSION}\]" CHANGELOG.md; then
    fail "CHANGELOG.md does not contain an entry for [${VERSION}]. Update it first."
fi

# 6. Check no 'Unreleased' heading with content (optional — just a warning)
UNRELEASED_LINE=$(grep -n "## \[Unreleased\]" CHANGELOG.md 2>/dev/null | head -1 || true)
if [[ -n "$UNRELEASED_LINE" ]]; then
    warn "CHANGELOG.md still has an [Unreleased] section — make sure it's empty or intentional."
fi

echo -e "  ${GREEN}All pre-flight checks passed${NC}"

# --- Verification ---
step "Running verification suite"
npm run check
npm run lint
npm test

echo -e "  ${GREEN}All checks passed${NC}"

# --- Commit ---
step "Committing release"
if $DRY_RUN; then
    echo "  [dry run] Would commit: chore: release ${TAG}"
else
    git add package.json CHANGELOG.md
    # Only commit if there are staged changes
    if git diff --cached --quiet; then
        echo "  Nothing to commit — package.json and CHANGELOG.md are already committed."
    else
        git commit -m "chore: release ${TAG}"
    fi
fi

# --- Publish to VS Code Marketplace ---
step "Publishing to VS Code Marketplace"
if $DRY_RUN; then
    echo "  [dry run] Would run: npx vsce publish"
else
    npx vsce publish
fi

# --- Publish to Open VSX ---
step "Publishing to Open VSX"
if $DRY_RUN; then
    echo "  [dry run] Would run: npx ovsx publish"
else
    npx ovsx publish
fi

# --- Tag and push ---
step "Tagging and pushing"
if $DRY_RUN; then
    echo "  [dry run] Would run: git tag ${TAG} && git push origin ${BRANCH} --tags"
else
    git tag "$TAG"
    git push origin "$BRANCH" --tags
fi

# --- Done ---
echo ""
echo -e "${GREEN}✔ Release ${TAG} complete!${NC}"
echo ""
echo "Remaining manual step:"
echo "  → Create the GitHub release at https://github.com/liteclienthq/liteclient/releases/new?tag=${TAG}"
