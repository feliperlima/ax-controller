#!/usr/bin/env bash
# Bump the app version in every place it lives, so they never drift again.
# Usage: scripts/bump-version.sh 1.1.1
set -euo pipefail

VERSION="${1:?uso: bump-version.sh X.Y.Z}"
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Versão inválida: $VERSION (esperado X.Y.Z)" >&2; exit 1
fi

D="$(cd "$(dirname "$0")/.." && pwd)"   # apps/desktop
T="$D/src-tauri"

IFS=. read -r MAJ MIN PAT <<< "$VERSION"
CODE=$(( MAJ * 1000000 + MIN * 1000 + PAT ))   # Android versionCode: 1.1.0 -> 1001000

# 1) package.json  2) tauri.conf.json — primeira chave "version"
sed -i '' -E "s/\"version\": \"[0-9]+\.[0-9]+\.[0-9]+\"/\"version\": \"$VERSION\"/" "$D/package.json"
sed -i '' -E "s/\"version\": \"[0-9]+\.[0-9]+\.[0-9]+\"/\"version\": \"$VERSION\"/" "$T/tauri.conf.json"

# 3) Cargo.toml — só o version dentro de [package] (não mexe em deps)
sed -i '' -E "/^\[package\]/,/^\[/ s/^version = \"[0-9]+\.[0-9]+\.[0-9]+\"/version = \"$VERSION\"/" "$T/Cargo.toml"

# 4) App.tsx — const APP_VERSION
sed -i '' -E "s/const APP_VERSION = \"[0-9]+\.[0-9]+\.[0-9]+\"/const APP_VERSION = \"$VERSION\"/" "$D/src/App.tsx"

# 5,6,8) plists (macOS, iOS fonte, iOS gerado) — via PlistBuddy
for P in "$T/Info.plist" "$T/Info.ios.plist" "$T/gen/apple/desktop_iOS/Info.plist"; do
  if [ -f "$P" ]; then
    /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$P"
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $VERSION" "$P"
  fi
done

# 7) Android tauri.properties — versionName + versionCode
PROP="$T/gen/android/app/tauri.properties"
if [ -f "$PROP" ]; then
  sed -i '' -E "s/^tauri\.android\.versionName=.*/tauri.android.versionName=$VERSION/" "$PROP"
  sed -i '' -E "s/^tauri\.android\.versionCode=.*/tauri.android.versionCode=$CODE/" "$PROP"
fi

echo "✅ Versão -> $VERSION  (Android versionCode=$CODE)"
echo "Confira com: git diff --stat"
