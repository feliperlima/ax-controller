#!/usr/bin/env bash
# release-ios.sh — Build e upload do IPA para TestFlight.
# Uso: ./scripts/release-ios.sh
# Pré-requisito: security add-generic-password -a "feliperlima35@gmail.com" -s "ax-altool" -w APP_SPECIFIC_PASSWORD -U

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../apps/desktop"
IPA_DIR="$APP_DIR/src-tauri/gen/apple/build/arm64"
APPLE_ID="feliperlima35@gmail.com"
KEYCHAIN_ITEM="ax-altool"

echo "→ Building iOS IPA..."
cd "$APP_DIR"
npm run tauri ios build -- --export-method app-store-connect

IPA=$(find "$IPA_DIR" -name "*.ipa" | sort | tail -1)
if [ -z "$IPA" ]; then
  echo "✗ IPA não encontrado em $IPA_DIR"
  exit 1
fi
echo "→ IPA: $IPA"

echo "→ Uploading para TestFlight..."
xcrun altool --upload-app --type ios \
  --file "$IPA" \
  --username "$APPLE_ID" \
  --password "@keychain:$KEYCHAIN_ITEM"

echo "✓ Upload concluído. Aguarde processamento no App Store Connect."
