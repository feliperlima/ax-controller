import type { DiscoveredMixer } from "../services/mixerDiscovery";
import axControlBrand from "../assets/AX-control-Brand-vert.svg";

type DeviceSelectionScreenProps = {
  mixers: DiscoveredMixer[];
  discoveryLoading: boolean;
  discoveryError: string | null;
  connectBusy: boolean;
  manualConnectBusy: boolean;
  connectionStatus: string;
  connectionError: string | null;
  manualIp: string;
  version?: string;
  onManualIpChange: (value: string) => void;
  onRefresh: () => void;
  onConnectManual: () => void;
  onConnectMixer: (mixer: DiscoveredMixer) => void;
};

function DeviceCard({
  mixer,
  connectBusy,
  onConnect,
}: {
  mixer: DiscoveredMixer;
  connectBusy: boolean;
  onConnect: (mixer: DiscoveredMixer) => void;
}) {
  return (
    <article className="device-card">
      <div className="device-card__header">
        <div className="device-card__title-row">
          <div className="device-card__title">{mixer.name}</div>
          <span className="device-card__badge">Online</span>
        </div>
        <button
          type="button"
          className="startup-button startup-button--secondary"
          disabled={connectBusy}
          onClick={() => onConnect(mixer)}
        >
          Conectar
        </button>
      </div>

      <div className="device-card__subtitle">
        <span>IP: {mixer.ip}</span>
        {mixer.channels ? (
          <>
            <span className="device-card__separator">|</span>
            <span>{mixer.channels} canais</span>
          </>
        ) : null}
      </div>
    </article>
  );
}

export function DeviceSelectionScreen({
  mixers,
  discoveryLoading,
  discoveryError,
  connectBusy,
  manualConnectBusy,
  connectionStatus,
  connectionError,
  manualIp,
  onManualIpChange,
  onRefresh,
  onConnectManual,
  onConnectMixer,
}: DeviceSelectionScreenProps) {
  const showEmptyState = !discoveryLoading && mixers.length === 0;
  const showSearchingState = discoveryLoading && mixers.length > 0;

  return (
    <section className="startup-shell startup-shell--device-selection">
      <header className="device-selection-fixed-header">
        <div className="device-selection-shell device-selection-shell--reference">
          <div className="device-selection-hero">
            <img
              className="device-selection-hero__logo"
              src={axControlBrand}
              alt="AX Control"
            />
            <button
              type="button"
              className="startup-button startup-button--ghost"
              disabled={discoveryLoading || connectBusy}
              onClick={onRefresh}
            >
              {discoveryLoading ? "Buscando..." : "Atualizar"}
            </button>
          </div>
        </div>
      </header>

      <div className="device-selection-content">
        <div className="device-selection-shell device-selection-shell--reference">
          <section className="device-selection-intro">
            <h1 className="device-selection-header__title">Selecione uma mesa</h1>
            <p className="device-selection-hero__subtitle">
              Conecte-se a uma mesa Duonn Axios disponivel na rede local.
            </p>
          </section>
          <div className="device-selection-grid device-selection-grid--reference">
          <section className="startup-card device-selection-panel">
            <div className="device-selection-panel__header">
              <h2 className="device-selection-panel__title">Mesas encontradas</h2>
              <div className="device-selection-status">
                <span className="device-selection-status__dot" />
                {discoveryLoading
                  ? "Buscando"
                  : mixers.length > 0
                    ? `${mixers.length} encontrada(s)`
                    : "Sem resultado"}
              </div>
            </div>

            <div className="device-selection-list">
              {mixers.map((mixer) => (
                <DeviceCard
                  key={mixer.id}
                  mixer={mixer}
                  connectBusy={connectBusy}
                  onConnect={onConnectMixer}
                />
              ))}

              {showEmptyState ? (
                <article className="device-empty-state">
                  <h3>Nenhuma mesa encontrada</h3>
                </article>
              ) : null}

              {showSearchingState ? (
                <article className="device-searching-state">
                  <h3>Buscando outras mesas na rede...</h3>
                  <p>Isso pode levar alguns segundos.</p>
                </article>
              ) : null}
            </div>

            {discoveryError ? <div className="device-inline-message device-inline-message--warning">{discoveryError}</div> : null}
          </section>

          <section className="startup-card device-selection-panel">
            <h2 className="device-selection-panel__title">Conexao Manual</h2>
            <div className="device-manual-row">
              <span className="device-manual-row__label">IP</span>
              <input
                id="manual-mixer-ip"
                className="device-input"
                value={manualIp}
                onChange={(event) => onManualIpChange(event.target.value)}
                placeholder="000.000.000.000"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="numeric"
                disabled={manualConnectBusy}
              />
            </div>
            <button
              type="button"
              className="startup-button startup-button--secondary device-manual-connect"
              disabled={manualConnectBusy || manualIp.trim().length === 0}
              onClick={onConnectManual}
            >
              {manualConnectBusy ? "Conectando..." : "Conectar"}
            </button>

            {connectionStatus ? (
              <div className="device-inline-message">{connectionStatus}</div>
            ) : null}
            {connectionError ? (
              <div className="device-inline-message device-inline-message--danger">{connectionError}</div>
            ) : null}
          </section>
          </div>
        </div>
      </div>
    </section>
  );
}
