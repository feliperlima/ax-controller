import type { DiscoveredMixer } from "../services/mixerDiscovery";
import axControlBrand from "../assets/AX-control-Brand-vert.svg";

type DeviceSelectionScreenProps = {
  mixers: DiscoveredMixer[];
  discoveryLoading: boolean;
  discoveryError: string | null;
  connectBusy: boolean;
  connectionStatus: string;
  connectionError: string | null;
  manualIp: string;
  version?: string;
  onManualIpChange: (value: string) => void;
  onRefresh: () => void;
  onConnectManual: () => void;
  onConnectMixer: (mixer: DiscoveredMixer) => void;
};

function renderChannelsLabel(channels?: number) {
  if (!channels) return "Canais";
  return `${channels} canais`;
}

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
        <div>
          <div className="device-card__title">{mixer.name}</div>
          <div className="device-card__subtitle">{mixer.ip}</div>
        </div>
      </div>

      <div className="device-card__meta-grid device-card__meta-grid--compact">
        <div className="device-meta-pill">
          <span className="device-meta-pill__label">Modelo</span>
          <span className="device-meta-pill__value">{mixer.model ?? "Axios"}</span>
        </div>
        <div className="device-meta-pill">
          <span className="device-meta-pill__label">Canais</span>
          <span className="device-meta-pill__value">{renderChannelsLabel(mixer.channels)}</span>
        </div>
      </div>

      <div className="device-card__actions">
        <button
          type="button"
          className="startup-button startup-button--secondary"
          disabled={connectBusy}
          onClick={() => onConnect(mixer)}
        >
          Conectar
        </button>
      </div>
    </article>
  );
}

export function DeviceSelectionScreen({
  mixers,
  discoveryLoading,
  discoveryError,
  connectBusy,
  connectionStatus,
  connectionError,
  manualIp,
  version,
  onManualIpChange,
  onRefresh,
  onConnectManual,
  onConnectMixer,
}: DeviceSelectionScreenProps) {
  const showEmptyState = !discoveryLoading && mixers.length === 0;

  return (
    <section className="startup-shell">
      <div className="device-selection-shell">
        <header className="startup-card device-selection-header">
          <div className="startup-brand-lockup startup-brand-lockup--compact">
            <img className="startup-brand-lockup__logo startup-brand-lockup__logo--small" src={axControlBrand} alt="AX Control" />
            <div className="startup-brand-lockup__text">
              <div className="startup-kicker">DIGITAL MIXING CONTROL</div>
              <h1 className="startup-title">Selecione uma mesa</h1>
              <p className="startup-subtitle">Mesas Axios na rede local.</p>
            </div>
          </div>

          <button
            type="button"
            className="startup-button startup-button--ghost"
            disabled={discoveryLoading || connectBusy}
            onClick={onRefresh}
          >
            {discoveryLoading ? "Buscando..." : "Atualizar"}
          </button>
        </header>

        <div className="device-selection-grid">
          <section className="startup-card device-selection-panel">
            <div className="device-selection-panel__header">
              <div>
                <div className="startup-kicker">DESCobERTA</div>
                <h2 className="device-selection-panel__title">Mixers encontrados</h2>
              </div>
              <div className="device-selection-status">
                {discoveryLoading
                  ? "Buscando"
                  : mixers.length > 0
                    ? `${mixers.length} encontrado(s)`
                    : "Sem resultado"}
              </div>
            </div>

            <div className="device-selection-list">
              <div className="device-selection-block">
                <div className="device-selection-block__label">Finder</div>
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
                    <p>Use o IP manual ou atualize a busca.</p>
                  </article>
                ) : null}
              </div>
            </div>

            {discoveryError ? <div className="device-inline-message device-inline-message--warning">{discoveryError}</div> : null}
          </section>

          <aside className="device-selection-side">
            <section className="startup-card device-selection-panel">
              <div className="device-selection-panel__header">
                <div>
                  <div className="startup-kicker">MANUAL</div>
                  <h2 className="device-selection-panel__title">Conectar por IP</h2>
                </div>
              </div>

              <label className="device-input-label" htmlFor="manual-mixer-ip">
                IP da mesa
              </label>
              <div className="device-input-row">
                <input
                  id="manual-mixer-ip"
                  className="device-input"
                  value={manualIp}
                  onChange={(event) => onManualIpChange(event.target.value)}
                  placeholder="192.168.1.20"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="numeric"
                  disabled={connectBusy}
                />
                <button
                  type="button"
                  className="startup-button startup-button--primary"
                  disabled={connectBusy || manualIp.trim().length === 0}
                  onClick={onConnectManual}
                >
                  {connectBusy ? "Conectando..." : "Conectar"}
                </button>
              </div>

              {connectionStatus ? (
                <div className="device-inline-message">{connectionStatus}</div>
              ) : null}
              {connectionError ? (
                <div className="device-inline-message device-inline-message--danger">{connectionError}</div>
              ) : null}
            </section>

            <section className="startup-card device-selection-panel device-help-card">
              <div className="startup-kicker">SUPORTE</div>
              <h2 className="device-selection-panel__title">Nao encontrou sua mesa?</h2>
              <p className="device-help-card__text">
                Confirme a rede e tente conectar pelo IP da mesa.
              </p>
            </section>
          </aside>
        </div>

        {version ? <div className="startup-footer">Versao {version}</div> : null}
      </div>
    </section>
  );
}
