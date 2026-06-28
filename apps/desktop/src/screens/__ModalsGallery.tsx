import { useState, type CSSProperties } from "react";
import { DeviceGateModal } from "./DeviceGateModal";
import { UpgradeModal } from "./UpgradeModal";
import { TrialActivatedModal } from "./TrialActivatedModal";
import type { LicenseDevice } from "../lib/licenseState";

/** DEV-only — galeria de modais do app (via #modals). Não vai pra produção.
 *  NÃO inclui o modal inline de login/licença/PIX (acoplado ao state do App). */

const MOCK_DEVICES: LicenseDevice[] = [
  { deviceId: "dev-1", deviceName: "MacBook Pro", devicePlatform: "macOS", active: true },
  { deviceId: "dev-2", deviceName: "Windows PC", devicePlatform: "windows", active: true },
  { deviceId: "dev-3", deviceName: "Galaxy Tab A9", devicePlatform: "android", active: true },
];

type ModalKey = "upgrade-trial" | "upgrade-notrial" | "trial-activated" | "gate-limit" | "gate-revoked";

const ITEMS: { key: ModalKey; label: string }[] = [
  { key: "upgrade-trial", label: "UpgradeModal · com trial disponível" },
  { key: "upgrade-notrial", label: "UpgradeModal · sem trial (já usado)" },
  { key: "trial-activated", label: "TrialActivatedModal" },
  { key: "gate-limit", label: "DeviceGateModal · limite (4º aparelho)" },
  { key: "gate-revoked", label: "DeviceGateModal · revogado (offline)" },
];

const btn: CSSProperties = {
  display: "block", width: "100%", textAlign: "left",
  padding: "14px 16px", borderRadius: 10,
  background: "#0a1628", border: "1px solid #20304b", color: "#fff",
  fontSize: 14, fontWeight: 600, cursor: "pointer",
};
const closeBtn: CSSProperties = {
  position: "fixed", top: 12, right: 12, zIndex: 100000,
  padding: "8px 12px", borderRadius: 8,
  background: "rgba(0,0,0,0.7)", border: "1px solid #20304b", color: "#fff",
  fontSize: 12, fontWeight: 700, cursor: "pointer",
};

export function ModalsGallery() {
  const [active, setActive] = useState<ModalKey | null>(null);
  const close = () => setActive(null);
  const noop = () => {};
  const trialExpiry = new Date(Date.now() + 7 * 86_400_000).toISOString();

  return (
    <div style={{ background: "#000814", minHeight: "100vh", padding: 48 }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <h1 style={{ color: "#fff", margin: 0, fontSize: 24, fontWeight: 600 }}>Galeria de modais</h1>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 8px" }}>
          Clique para abrir cada modal. Use uma ação do modal (ou "✕ fechar") para voltar.
          <br />Não inclui o modal inline de login/licença/PIX (muito acoplado ao app).
        </p>
        {ITEMS.map((it) => (
          <button key={it.key} type="button" style={btn} onClick={() => setActive(it.key)}>{it.label}</button>
        ))}
      </div>

      {active && <button type="button" style={closeBtn} onClick={close}>✕ fechar</button>}

      {active === "upgrade-trial" && (
        <UpgradeModal featureKey="scenes" canStartTrial onUpgrade={noop} onStartTrial={noop} onClose={close} />
      )}
      {active === "upgrade-notrial" && (
        <UpgradeModal featureKey="details" canStartTrial={false} onUpgrade={noop} onStartTrial={noop} onClose={close} />
      )}
      {active === "trial-activated" && (
        <TrialActivatedModal trialExpiryAt={trialExpiry} originFeature="scenes" onContinue={close} onDismiss={close} />
      )}
      {active === "gate-limit" && (
        <DeviceGateModal mode="limit" revokedAt={null} devices={MOCK_DEVICES} installationId="this-device"
          loading={false} actionBusy={null} feedback={null}
          onRefresh={noop} onRevoke={noop} onReactivateThis={close} onLogout={close} />
      )}
      {active === "gate-revoked" && (
        <DeviceGateModal mode="revoked" revokedAt={new Date().toISOString()} devices={MOCK_DEVICES} installationId="this-device"
          loading={false} actionBusy={null} feedback={null}
          onRefresh={noop} onRevoke={noop} onReactivateThis={close} onLogout={close} />
      )}
    </div>
  );
}
