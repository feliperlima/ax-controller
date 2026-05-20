import type { DiscoveredMixer } from "../services/mixerDiscovery";
import axControlBrand from "../assets/AX-control-Brand-vert.svg";
import productAxios16 from "../assets/product-axios16.webp";
import productAxios24 from "../assets/product-axios24.webp";
import productAxios32 from "../assets/product-axios32.webp";

type DeviceSelectionScreenProps = {
  mixers: DiscoveredMixer[];
  discoveryLoading: boolean;
  discoveryError: string | null;
  connectBusy: boolean;
  connectionError: string | null;
  version?: string;
  onRefresh: () => void;
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
  const modelLabel = resolveMixerModelLabel(mixer);
  const channelsLabel = `${resolveMixerChannels(mixer) ?? 16} canais`;
  const previewImage = resolveMixerPreviewImage(mixer);

  return (
    <article className="device-card">
      <div className="device-card__header">
        <div className="device-card__identity">
          <div className="device-card__preview-wrap">
            <img className="device-card__preview" src={previewImage} alt={modelLabel} />
          </div>

          <div className="device-card__identity-text">
            <div className="device-card__title-row">
              <div className="device-card__title">{mixer.name}</div>
              <span className="device-card__badge">
                <span className="device-card__badge-dot" aria-hidden="true" />
                <span>Online</span>
              </span>
            </div>

            <div className="device-card__subtitle">
              <span>IP: {mixer.ip}</span>
              <span className="device-card__separator">|</span>
              <span>{channelsLabel}</span>
            </div>
          </div>
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
    </article>
  );
}

function resolveMixerChannels(mixer: DiscoveredMixer) {
  if (typeof mixer.channels === "number" && Number.isFinite(mixer.channels)) {
    return Math.max(1, Math.round(mixer.channels));
  }

  const text = `${mixer.model ?? ""} ${mixer.name}`.toUpperCase();
  const match = text.match(/AXIOS\s*(16|24|32)/i);
  if (!match) return undefined;

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function resolveMixerModelLabel(mixer: DiscoveredMixer) {
  const channels = resolveMixerChannels(mixer);
  if (channels === 32) return "AXIOS 32";
  if (channels === 24) return "AXIOS 24";
  return "AXIOS 16";
}

function resolveMixerPreviewImage(mixer: DiscoveredMixer) {
  const channels = resolveMixerChannels(mixer);
  if (channels === 32) return productAxios32;
  if (channels === 24) return productAxios24;
  return productAxios16;
}

export function DeviceSelectionScreen({
  mixers,
  discoveryLoading,
  discoveryError,
  connectBusy,
  connectionError,
  onRefresh,
  onConnectMixer,
}: DeviceSelectionScreenProps) {
  const showEmptyState = !discoveryLoading && mixers.length === 0;
  const showInitialSearchingState = discoveryLoading && mixers.length === 0;
  const showSearchingMoreState = discoveryLoading && mixers.length > 0;

  return (
    <section className="startup-shell startup-shell--device-selection">
      <nav className="top-nav">
        <div className="top-nav__brand">
          <img className="brand-logo brand-logo--wordmark" src={axControlBrand} alt="AX Control" />
        </div>

        <div className="top-nav__actions">
          <button
            type="button"
            className="startup-button startup-button--ghost"
            disabled={discoveryLoading || connectBusy}
            onClick={onRefresh}
          >
            {discoveryLoading ? "Buscando..." : "Atualizar"}
          </button>
        </div>
      </nav>

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
              {showInitialSearchingState ? (
                <article className="device-searching-state">
                  <h3>Buscando mesas na rede...</h3>
                  <p>Isso pode levar alguns segundos.</p>
                </article>
              ) : null}

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

              {showSearchingMoreState ? (
                <article className="device-searching-state">
                  <h3>Buscando outras mesas na rede...</h3>
                  <p>Isso pode levar alguns segundos.</p>
                </article>
              ) : null}
            </div>

            {discoveryError ? <div className="device-inline-message device-inline-message--warning">{discoveryError}</div> : null}
            {connectionError ? <div className="device-inline-message device-inline-message--danger">{connectionError}</div> : null}
          </section>
          </div>
        </div>
      </div>
    </section>
  );
}
