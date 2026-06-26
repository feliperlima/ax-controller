#!/usr/bin/env bash
# release-ios.sh — Build + upload do IPA p/ TestFlight (assinatura de DISTRIBUIÇÃO).
#
# IMPORTANTE: o `tauri ios build` gera um ExportOptions.plist com method=debugging
# (export de DEV), então o IPA dele é rejeitado pela App Store (erro 90161). Por isso
# aqui fazemos o archive via tauri e depois exportamos manualmente com method
# app-store-connect + App Store Connect API key + -allowProvisioningUpdates (o
# xcodebuild cria/atualiza o perfil de DISTRIBUIÇÃO na hora). Upload via API key.
#
# Pré-req: ~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8 (não versionada).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../apps/desktop"
ARCHIVE="$APP_DIR/src-tauri/gen/apple/build/desktop_iOS.xcarchive"
EXPORT_DIR="/tmp/ax-ios-export"
PLIST="/tmp/ax-ios-exportOptions.plist"

export APPLE_DEVELOPMENT_TEAM="UQ34KWR782"
export APPLE_API_ISSUER="a796b1fa-f810-439d-afa3-a1814c19199b"
export APPLE_API_KEY="6SCBX57WB5"
export APPLE_API_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_6SCBX57WB5.p8"

echo "→ Gerando o archive (tauri)... (o export interno do tauri falha — ok, exportamos manual)"
cd "$APP_DIR"
npm run tauri ios build -- --export-method app-store-connect || \
  echo "  (export do tauri falhou como esperado; seguindo com export manual)"

[ -d "$ARCHIVE" ] || { echo "✗ archive não encontrado em $ARCHIVE"; exit 1; }

cat > "$PLIST" <<'PLIST_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>teamID</key><string>UQ34KWR782</string>
  <key>signingStyle</key><string>automatic</string>
  <key>destination</key><string>export</string>
</dict>
</plist>
PLIST_EOF

echo "→ Exportando IPA (app-store-connect, API key, allowProvisioningUpdates)..."
rm -rf "$EXPORT_DIR"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$PLIST" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$APPLE_API_KEY_PATH" \
  -authenticationKeyID "$APPLE_API_KEY" \
  -authenticationKeyIssuerID "$APPLE_API_ISSUER"

IPA=$(find "$EXPORT_DIR" -name "*.ipa" | head -1)
[ -n "$IPA" ] || { echo "✗ IPA não gerado"; exit 1; }
echo "→ IPA: $IPA"

echo "→ Upload TestFlight (API key)..."
xcrun altool --upload-app --type ios \
  --file "$IPA" \
  --apiKey "$APPLE_API_KEY" \
  --apiIssuer "$APPLE_API_ISSUER"

echo "✓ Upload concluído. Aguarde processamento no App Store Connect."
