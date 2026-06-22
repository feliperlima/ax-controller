import { Laptop2, Smartphone, Monitor, RefreshCw, X } from "lucide-react";
import type { LicenseDevice } from "../lib/licenseState";

function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p === "ios" || p === "android") return <Smartphone size={13} aria-hidden="true" />;
  if (p === "macos" || p === "windows" || p === "linux") return <Laptop2 size={13} aria-hidden="true" />;
  return <Monitor size={13} aria-hidden="true" />;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type DeviceGateModalProps = {
  mode: "limit" | "revoked";
  revokedAt: string | null;
  /** Active devices on the account (the current/unregistered device is filtered out). */
  devices: LicenseDevice[];
  installationId: string;
  loading: boolean;
  actionBusy: string | null;
  /** Error text to surface (null when none). */
  feedback: string | null;
  onRefresh: () => void;
  onRevoke: (deviceId: string) => void;
  onReactivateThis: () => void;
  onLogout: () => void;
};

export function DeviceGateModal({
  mode,
  revokedAt,
  devices,
  installationId,
  loading,
  actionBusy,
  feedback,
  onRefresh,
  onRevoke,
  onReactivateThis,
  onLogout,
}: DeviceGateModalProps) {
  // Mostra apenas os OUTROS dispositivos ativos — o device atual (não registrado / revogado)
  // não entra na lista; quem o reativa é o botão dedicado no modo "revoked".
  const others = devices.filter((d) => d.deviceId !== installationId && d.active);
  const revokedDate = formatDate(revokedAt);
  const busy = actionBusy !== null;

  return (
    <div className="dgate-overlay">
      <div className="dgate-card">
        <h2 className="upg-heading">
          {mode === "revoked" ? "Dispositivo removido" : "Limite de dispositivos atingido"}
        </h2>
        <p className="upg-desc">
          {mode === "revoked"
            ? `Este dispositivo foi removido da sua conta${revokedDate ? ` em ${revokedDate}` : ""}. Reative-o para voltar a usar — se já tiver 3 dispositivos ativos, remova um antes.`
            : "Você atingiu o limite de 3 dispositivos nesta conta. Remova um dos dispositivos abaixo para liberar e usar este aqui."}
        </p>

        {mode === "revoked" && (
          <button
            type="button"
            className="upg-btn upg-btn--primary"
            onClick={onReactivateThis}
            disabled={busy}
          >
            Reativar este dispositivo
          </button>
        )}

        <div className="dgate-listhead">
          <span className="dgate-count">
            {others.length} {others.length === 1 ? "dispositivo ativo" : "dispositivos ativos"}
          </span>
          <button
            type="button"
            className="startup-button startup-button--ghost home-panel__refresh-btn"
            disabled={loading}
            onClick={onRefresh}
          >
            <RefreshCw size={13} className={loading ? "home-panel__spin" : ""} aria-hidden="true" />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        <div className="dgate-list">
          {others.length === 0 ? (
            <p className="home-panel__empty">Nenhum outro dispositivo ativo.</p>
          ) : (
            others.map((device) => {
              const isBusy = actionBusy === device.deviceId;
              return (
                <div key={device.deviceId} className="home-panel__device-item">
                  <div className="home-panel__device-info">
                    <span className="home-panel__device-name">
                      <PlatformIcon platform={device.devicePlatform} />
                      {device.deviceName}
                    </span>
                    <span className="home-panel__device-meta">
                      {device.devicePlatform || "Plataforma desconhecida"}
                    </span>
                    <span className="home-panel__device-id">{device.deviceId}</span>
                  </div>
                  <button
                    type="button"
                    className="startup-button startup-button--ghost home-panel__device-action home-panel__device-action--danger"
                    disabled={isBusy}
                    onClick={() => onRevoke(device.deviceId)}
                  >
                    {isBusy ? (
                      <><RefreshCw size={12} className="home-panel__spin" aria-hidden="true" /> Removendo...</>
                    ) : (
                      <><X size={12} aria-hidden="true" /> Remover</>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {feedback && <p className="home-panel__hint home-panel__hint--error">{feedback}</p>}

        <button type="button" className="upg-btn upg-btn--ghost" onClick={onLogout}>
          Sair da conta
        </button>
      </div>
    </div>
  );
}
