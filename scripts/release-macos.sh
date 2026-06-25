#!/usr/bin/env bash
# release-macos.sh — Build, assinar, notarizar e staple o DMG universal do AX Control.
# Uso: ./scripts/release-macos.sh
# Pré-requisito: xcrun notarytool store-credentials "ax-notarytool" configurado no Keychain.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../apps/desktop"
TARGET="universal-apple-darwin"
BUNDLE_DIR="$APP_DIR/src-tauri/target/$TARGET/release/bundle/dmg"
PROFILE="ax-notarytool"

echo "→ Building macOS universal DMG..."
cd "$APP_DIR"
npm run tauri build -- --target "$TARGET"

DMG=$(find "$BUNDLE_DIR" -name "*.dmg" | sort | tail -1)
if [ -z "$DMG" ]; then
  echo "✗ DMG não encontrado em $BUNDLE_DIR"
  exit 1
fi
echo "→ DMG: $DMG"

echo "→ Submetendo para notarização Apple..."
xcrun notarytool submit "$DMG" \
  --keychain-profile "$PROFILE" \
  --wait

echo "→ Aplicando staple no DMG..."
xcrun stapler staple "$DMG"

echo "✓ DMG notarizado e pronto: $DMG"
