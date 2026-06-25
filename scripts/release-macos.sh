#!/usr/bin/env bash
# release-macos.sh — Build, assinar, notarizar e staple o DMG universal + artefato de updater.
# Uso: ./scripts/release-macos.sh
# Pré-requisitos:
#   - xcrun notarytool store-credentials "ax-notarytool" no Keychain (notarização).
#   - Chave privada do updater em ~/.tauri/ax-control-updater.key (gerada com `tauri signer generate`).
#     A pubkey correspondente está em apps/desktop/src-tauri/tauri.conf.json (plugins.updater.pubkey).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../apps/desktop"
TARGET="universal-apple-darwin"
RELEASE_DIR="$APP_DIR/src-tauri/target/$TARGET/release"
DMG_DIR="$RELEASE_DIR/bundle/dmg"
UPDATER_DIR="$RELEASE_DIR/bundle/macos"
PROFILE="ax-notarytool"
UPDATER_KEY="$HOME/.tauri/ax-control-updater.key"

if [ ! -f "$UPDATER_KEY" ]; then
  echo "✗ Chave do updater não encontrada em $UPDATER_KEY"
  exit 1
fi

# Assina os artefatos de updater no build (chave sem senha → password vazio).
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$UPDATER_KEY")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""

echo "→ Building macOS universal (DMG + updater artifact)..."
cd "$APP_DIR"
npm run tauri build -- --target "$TARGET"

DMG=$(find "$DMG_DIR" -name "*.dmg" | sort | tail -1)
[ -z "$DMG" ] && { echo "✗ DMG não encontrado em $DMG_DIR"; exit 1; }
echo "→ DMG: $DMG"

echo "→ Notarizando + staple do DMG..."
xcrun notarytool submit "$DMG" --keychain-profile "$PROFILE" --wait
xcrun stapler staple "$DMG"

# Artefato de updater (.app.tar.gz) já é assinado pela Tauri durante o build (env acima).
# O .app dentro dele tem a MESMA assinatura do .app notarizado no DMG → o Gatekeeper
# reconhece online no auto-update (máquina está online ao baixar).
TARGZ=$(find "$UPDATER_DIR" -name "*.app.tar.gz" | sort | tail -1)
SIG=$(find "$UPDATER_DIR" -name "*.app.tar.gz.sig" | sort | tail -1)

echo ""
echo "✓ DMG notarizado:        $DMG"
echo "✓ Updater artifact:      ${TARGZ:-<não encontrado>}"
echo "✓ Updater signature:     ${SIG:-<não encontrado>}"
echo ""
echo "Próximo: subir o .app.tar.gz para /downloads e registrar em app_versions"
echo "(updater_url = URL do .app.tar.gz; updater_signature = conteúdo do .sig)."
