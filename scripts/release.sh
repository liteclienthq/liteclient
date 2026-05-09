#!/usr/bin/env bash
set -euo pipefail

# Local-first LiteClient release script.
#
# Canonical release path:
#   1. Prepare package.json and CHANGELOG.md on main.
#   2. Run npm run release:dry or npm run release:check.
#   3. Run npm run release.
#
# The script publishes from the local machine, then tags, pushes, and creates
# the GitHub release from the matching CHANGELOG.md section.

MODE="release"
case "${1:-}" in
    --dry)
        MODE="dry"
        ;;
    --check)
        MODE="check"
        ;;
    "")
        ;;
    *)
        echo "Unknown option: $1"
        echo "Usage: $0 [--dry|--check]"
        exit 1
        ;;
esac

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${GREEN}> $1${NC}"; }
warn() { echo -e "${YELLOW}! $1${NC}"; }
fail() { echo -e "${RED}x $1${NC}"; exit 1; }

run_or_print() {
    if [[ "$MODE" == "release" ]]; then
        "$@"
    else
        printf '  [would run]'
        printf ' %q' "$@"
        printf '\n'
    fi
}

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        fail "Required command not found: $1"
    fi
}

trim_blank_edges() {
    awk '
        NF { started=1 }
        started { lines[++count]=$0 }
        END {
            while (count > 0 && lines[count] == "") {
                count--
            }
            for (i = 1; i <= count; i++) {
                print lines[i]
            }
        }
    '
}

extract_changelog_section() {
    local version="$1"
    awk -v version="$version" '
        $0 ~ "^## \\[" version "\\]" {
            found=1
            next
        }
        found && /^## / {
            exit
        }
        found {
            print
        }
    ' CHANGELOG.md | trim_blank_edges
}

step "Reading release metadata"
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"
BRANCH=$(git branch --show-current)
NOTES_FILE=$(mktemp)
trap 'rm -f "$NOTES_FILE"' EXIT

echo "  Version: ${VERSION}"
echo "  Tag:     ${TAG}"
echo "  Branch:  ${BRANCH}"

step "Pre-flight checks"

[[ "$BRANCH" == "main" ]] || fail "Release must run from main. Current branch: ${BRANCH}"

if [[ -n "$(git status --porcelain)" ]]; then
    fail "Working tree is not clean. Commit or stash changes before releasing."
fi

if git rev-parse "$TAG" >/dev/null 2>&1; then
    fail "Local tag ${TAG} already exists."
fi

set +e
git ls-remote --exit-code --tags origin "refs/tags/${TAG}" >/dev/null 2>&1
REMOTE_TAG_STATUS=$?
set -e
if [[ "$REMOTE_TAG_STATUS" -eq 0 ]]; then
    fail "Remote tag ${TAG} already exists."
elif [[ "$REMOTE_TAG_STATUS" -ne 2 ]]; then
    fail "Could not check remote tag ${TAG}. Verify network access and origin permissions."
fi

if gh release view "$TAG" >/dev/null 2>&1; then
    fail "GitHub release ${TAG} already exists."
fi

if ! grep -q "^## \\[${VERSION}\\]" CHANGELOG.md; then
    fail "CHANGELOG.md does not contain a release section for [${VERSION}]."
fi

extract_changelog_section "$VERSION" > "$NOTES_FILE"
if [[ ! -s "$NOTES_FILE" ]]; then
    fail "CHANGELOG.md section for [${VERSION}] is empty."
fi

require_command node
require_command npm
require_command git
require_command npx
require_command gh

if ! gh auth status >/dev/null 2>&1; then
    fail "GitHub CLI is not authenticated. Run: gh auth login"
fi

if [[ -z "${VSCE_PAT:-}" ]]; then
    fail "VSCE_PAT is not set. Export a VS Code Marketplace token before releasing."
fi

if [[ -z "${OVSX_PAT:-}" ]]; then
    fail "OVSX_PAT is not set. Export an Open VSX token before releasing."
fi

echo "  Pre-flight checks passed."

if [[ "$MODE" != "release" ]]; then
    step "Planned release commands"
    run_or_print npm run check
    run_or_print npm run lint
    run_or_print npm test
    run_or_print npx vsce publish
    run_or_print npx ovsx publish
    run_or_print git tag "$TAG"
    run_or_print git push origin main
    run_or_print git push origin "$TAG"
    run_or_print gh release create "$TAG" --title "$TAG" --notes-file "$NOTES_FILE"
    echo ""
    echo "Release notes preview:"
    sed -n '1,120p' "$NOTES_FILE"
    exit 0
fi

step "Running verification"
npm run check
npm run lint
npm test

step "Publishing to VS Code Marketplace"
npx vsce publish

step "Publishing to Open VSX"
npx ovsx publish

step "Tagging and pushing"
git tag "$TAG"
git push origin main
git push origin "$TAG"

step "Creating GitHub release"
gh release create "$TAG" --title "$TAG" --notes-file "$NOTES_FILE"

echo ""
echo -e "${GREEN}Release ${TAG} complete.${NC}"
