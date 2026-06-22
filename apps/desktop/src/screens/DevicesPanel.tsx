import { Laptop2, Monitor, RefreshCw, Smartphone, X } from "lucide-react";
import type { LicenseDevice } from "../lib/licenseState";

type DevicesPanelProps = {
  devices: LicenseDevice[];
  loading: boolean;
  actionBusy: string | null;
  installationId: string;
  deviceLimit: number | null;
  isUnlimited: boolean;
  isTrial: boolean;
  canReactivate: boolean;
  onRefresh: () => void;
  onRevoke: (deviceId: string) => void;
  onReactivate: (deviceId: string) => void;
};

function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p === "ios" || p === "android") return <Smartphone size={13} aria-hidden="true" />;
  if (p === "macos" || p === "windows" || p === "linux") return <Laptop2 size={13} aria-hidden="true" />;
  return <Monitor size={13} aria-hidden="true" />;
}

export function DevicesPanel({
  devices,
  loading,
  actionBusy,
  installationId,
  deviceLimit,
  isUnlimited,
  canReactivate,
  onRefresh,
  onRevoke,
  onReactivate,
}: DevicesPanelProps) {
  const limitLabel = isUnlimited
    ? "Sem limite de dispositivos"
    : deviceLimit !== null
      ? `Esta licença permite até ${deviceLimit} dispositivo${deviceLimit === 1 ? "" : "s"}.`
      : "Número de dispositivos definido pela sua licença.";

  return (
    <div className="home-panel">
      <div className="home-panel__header">
        <h1 className="home-panel__title">Meus dispositivos</h1>
        <p className="home-panel__subtitle">{limitLabel}</p>
      </div>

      <div className="home-panel__body">
        <div className="startup-card home-panel__card home-panel__card--devices">
          <div className="home-panel__devices-header">
            <span className="home-panel__label">
              {devices.length === 0 ? "Nenhum dispositivo" : `${devices.length} dispositivo${devices.length !== 1 ? "s" : ""}`}
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

          {devices.length > 0 ? (
            <div className="home-panel__device-list">
              {devices.map((device) => {
                const isCurrent = device.deviceId === installationId;
                const isBusy = actionBusy === device.deviceId;
                const isRevoked = !device.active;

                return (
                  <div
                    key={device.deviceId}
                    className={[
                      "home-panel__device-item",
                      isCurrent ? "home-panel__device-item--current" : "",
                      isRevoked ? "home-panel__device-item--revoked" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <div className="home-panel__device-info">
                      <span className="home-panel__device-name">
                        <PlatformIcon platform={device.devicePlatform} />
                        {device.deviceName}
                        {isCurrent && <span className="home-panel__device-tag home-panel__device-tag--current">Este dispositivo</span>}
                        {isRevoked && <span className="home-panel__device-tag home-panel__device-tag--revoked">Removido</span>}
                      </span>
                      <span className="home-panel__device-meta">
                        {device.devicePlatform || "Plataforma desconhecida"}
                        {isCurrent ? " · Ativo agora" : ""}
                      </span>
                      <span className="home-panel__device-id">{device.deviceId}</span>
                    </div>

                    {!isCurrent && (
                      isRevoked ? (
                        canReactivate && (
                          <button
                            type="button"
                            className="startup-button startup-button--ghost home-panel__device-action"
                            disabled={isBusy}
                            onClick={() => onReactivate(device.deviceId)}
                          >
                            {isBusy
                              ? <><RefreshCw size={12} className="home-panel__spin" aria-hidden="true" /> Reativando...</>
                              : "Reativar"}
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          className="startup-button startup-button--ghost home-panel__device-action home-panel__device-action--danger"
                          disabled={isBusy}
                          onClick={() => onRevoke(device.deviceId)}
                        >
                          {isBusy
                            ? <><RefreshCw size={12} className="home-panel__spin" aria-hidden="true" /> Revogando...</>
                            : <><X size={12} aria-hidden="true" /> Revogar</>}
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="home-panel__empty">Nenhum dispositivo associado no momento.</p>
          )}
        </div>
      </div>
    </div>
  );
}
