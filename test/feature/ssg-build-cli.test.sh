#!/usr/bin/env bash
# Feature test: SSG build CLI
# Runs node src/ssg/main.ts build against the test fixture and asserts
# that the expected static-site outputs are produced correctly.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
FIXTURE="$REPO/test/fixtures/ssg-cli"

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
pass() { printf 'PASS: %s\n' "$1"; }

# ── Test 1: successful build produces all expected outputs ─────────────────────

OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

node "$REPO/src/ssg/main.ts" build \
  --root "$FIXTURE" \
  --out "$OUT/dist" \
  2>/dev/null \
  || fail "CLI exited non-zero on a valid project"

# Root page → dist/index.html
[[ -f "$OUT/dist/index.html" ]] \
  || fail "root page.ts was not written to dist/index.html"

grep -q '<h1>Home</h1>' "$OUT/dist/index.html" \
  || fail "root page body content missing from index.html"

# Nested route → dist/about/index.html
[[ -f "$OUT/dist/about/index.html" ]] \
  || fail "pages/about/page.ts was not written to dist/about/index.html"

# (blog) group folder stripped → dist/post/index.html (not dist/(blog)/post/index.html)
[[ -f "$OUT/dist/post/index.html" ]] \
  || fail "pages/(blog)/post/page.ts should produce dist/post/index.html after group-folder strip"

[[ ! -d "$OUT/dist/(blog)" ]] \
  || fail "(blog) group directory must not appear in output"

# Public passthrough → dist/style.css
[[ -f "$OUT/dist/style.css" ]] \
  || fail "public/style.css was not copied verbatim to dist/style.css"

# Page with clientModules → bundled asset, no .ts specifier in HTML
[[ -f "$OUT/dist/app/index.html" ]] \
  || fail "pages/app/page.ts was not written to dist/app/index.html"

grep -qE '\.ts"' "$OUT/dist/app/index.html" \
  && fail ".ts specifier survived into dist/app/index.html — bundler rewrite failed"

ls "$OUT/dist/assets/"*.js > /dev/null 2>&1 \
  || fail "no bundled JS assets found under dist/assets/"

pass "build succeeds; all pages, public files, and bundled assets produced"

# ── Test 2: exit 1 when no pages are found ─────────────────────────────────────

EMPTY_ROOT="$(mktemp -d)"
trap 'rm -rf "$EMPTY_ROOT"' EXIT

node "$REPO/src/ssg/main.ts" build \
  --root "$EMPTY_ROOT" \
  --out "$EMPTY_ROOT/dist" \
  2>/dev/null \
  && fail "CLI must exit 1 when no pages directory exists" \
  || true

pass "CLI exits non-zero when no pages are found"

# ── Test 3: unknown flag exits non-zero ────────────────────────────────────────

node "$REPO/src/ssg/main.ts" --bogus-flag \
  2>/dev/null \
  && fail "CLI must exit non-zero on an unknown flag" \
  || true

pass "CLI exits non-zero on unknown flag"

# ── Test 4: --json writes manifest to stdout, nothing on stdout otherwise ───────

STDOUT_JSON="$(node "$REPO/src/ssg/main.ts" build \
  --root "$FIXTURE" \
  --out "$OUT/dist2" \
  --json \
  2>/dev/null)"

echo "$STDOUT_JSON" | node -e "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))" \
  || fail "--json output is not valid JSON"

STDOUT_QUIET="$(node "$REPO/src/ssg/main.ts" build \
  --root "$FIXTURE" \
  --out "$OUT/dist3" \
  2>/dev/null)"

[[ -z "$STDOUT_QUIET" ]] \
  || fail "CLI wrote to stdout without --json; stdout must be empty in normal mode"

pass "--json writes valid JSON to stdout; normal mode produces no stdout"

echo "ALL PASS"
