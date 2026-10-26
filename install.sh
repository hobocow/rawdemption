#!/bin/bash
# Installs RAWdemption: curl -fsSL https://rawdemption.com/install.sh | bash
#
# Why a command: RAWdemption isn't notarised by Apple (that needs a paid developer membership), and
# macOS calls such apps "damaged" when a browser downloads them, with no way to open them. Files that
# Terminal downloads aren't marked that way. This puts the app in Applications and nothing else;
# you open it yourself. After that, updates install from inside the app.
set -euo pipefail

SITE="https://rawdemption.com"
APP=RAWdemption.app

say() { printf '%s\n' "$*"; }
fail() { printf 'RAWdemption: %s\n' "$*" >&2; exit 1; }

[ "$(uname -s)" = Darwin ] || fail "this installs the Mac app; it needs macOS."
[ "$(uname -m)" = arm64 ] || fail "RAWdemption needs a Mac with Apple silicon (M1 or later)."
major="$(sw_vers -productVersion | cut -d. -f1)"
[ "$major" -ge 13 ] || fail "RAWdemption needs macOS 13 Ventura or later (this Mac has $(sw_vers -productVersion))."
if pgrep -x RAWdemption >/dev/null 2>&1; then fail "quit RAWdemption first, then run this again."; fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
say "Downloading RAWdemption…"
curl -fL --progress-bar "$SITE/downloads/RAWdemption.zip" -o "$tmp/RAWdemption.zip" || fail "the download failed; check the connection and try again."
ditto -x -k "$tmp/RAWdemption.zip" "$tmp/x" || fail "the download looks incomplete; try again."
# The app must arrive intact and be RAWdemption itself.
codesign --verify --deep --strict "$tmp/x/$APP" 2>/dev/null || fail "the downloaded app didn't pass its signature check; nothing was installed."
codesign -dr - "$tmp/x/$APP" 2>&1 | grep -q 'identifier "app.rawdemption.mac"' || fail "the download isn't RAWdemption; nothing was installed."

dest=/Applications
[ -w "$dest" ] || { dest="$HOME/Applications"; mkdir -p "$dest"; }
rm -rf "${dest:?}/$APP"
ditto "$tmp/x/$APP" "$dest/$APP"
xattr -dr com.apple.quarantine "$dest/$APP" 2>/dev/null || true
say "RAWdemption is installed in $dest. Open it from there, or with Spotlight (⌘ Space)."
