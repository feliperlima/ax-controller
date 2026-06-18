import { useMemo, useState } from "react";
import type { DiscoveredMixer, ProfileConfidence } from "../services/mixerDiscovery";
import productAxios16 from "../assets/product-axios16.webp";
import productAxios24 from "../assets/product-axios24.webp";
import productAxios32 from "../assets/product-axios32.webp";

type ManualModelOption = 16 | 24 | 32;

export type DeviceSelectionPanelProps = {
  mixers: DiscoveredMixer[];
  knownMixers: DiscoveredMixer[];
  hasSearched: boolean;
  discoveryLoading: boolean;
  discoveryError: string | null;
  connectBusy: boolean;
  connectionError: string | null;
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
  const resolvedChannels = resolveMixerChannels(mixer);
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
              <span
                className={`device-card__badge${mixer.status !== "online" ? " device-card__badge--pending" : ""}`}
              >
                <span className="device-card__badge-dot" aria-hidden="true" />
                <span>{mixer.status === "online" ? "Online" : "Verificando..."}</span>
              </span>
            </div>

            <div className="device-card__subtitle">
              <span>IP: {mixer.ip}</span>
              <span className="device-card__separator">|</span>
              <span>{resolvedChannels} canais</span>
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
  return "?";
}

function resolveMixerModelLabel(mixer: DiscoveredMixer) {
  if (mixer.model) return mixer.model;
  const channels = resolveMixerChannels(mixer);
  return channels !== "?" ? `AXIOS${channels}` : mixer.name;
}

function resolveMixerPreviewImage(mixer: DiscoveredMixer) {
  const channels = resolveMixerChannels(mixer);
  if (channels === 24) return productAxios24;
  if (channels === 32) return productAxios32;
  return productAxios16;
}

function resolveMixerDiscoveryConfidence(mixer: DiscoveredMixer): ProfileConfidence {
  return (mixer as DiscoveredMixer & { confidence?: ProfileConfidence }).confidence ?? "confirmed";
}

function isValidIpv4(value: string): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const n = Number(part);
    return Number.isInteger(n) && n >= 0 && n <= 255 && String(n) === part;
  });
}

function KnownDeviceCard({
  mixer,
  connectBusy,
  onConnect,
}: {
  mixer: DiscoveredMixer;
  connectBusy: boolean;
  onConnect: (mixer: DiscoveredMixer) => void;
}) {
  const modelLabel = resolveMixerModelLabel(mixer);
  const resolvedChannels = resolveMixerChannels(mixer);
  const channelsLabel =
    resolvedChannels === undefined ? "canais nao confirmados" : `${resolvedChannels} canais`;
  const previewImage = resolveMixerPreviewImage(mixer);

  return (
    <article className="device-card device-card--known">
      <div className="device-card__header">
        <div className="device-card__identity">
          <div className="device-card__preview-wrap">
            <img className="device-card__preview" src={previewImage} alt={modelLabel} />
          </div>
          <div className="device-card__identity-text">
            <div className="device-card__title-row">
              <div className="device-card__title">{mixer.name}</div>
              <span className="device-card__badge device-card__badge--cached">
                <span className="device-card__badge-dot" aria-hidden="true" />
                <span>Ultima sessao</span>
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

function DeviceSelectionPanelContent({
  mixers,
  knownMixers,
  hasSearched,
  discoveryLoading,
  discoveryError,
  connectBusy,
  connectionError,
  onRefresh,
  onConnectMixer,
}: DeviceSelectionPanelProps) {
  const [manualIp, setManualIp] = useState("");
  const [manualModel, setManualModel] = useState<ManualModelOption>(16);

  const visibleMixers = useMemo(
    () => mixers.filter((m) => resolveMixerDiscoveryConfidence(m) === "confirmed"),
    [mixers]
  );
  const hiddenMixers = useMemo(
    () => mixers.filter((m) => resolveMixerDiscoveryConfidence(m) !== "confirmed"),
    [mixers]
  );

  const discoveredIps = useMemo(() => new Set(mixers.map((m) => m.ip)), [mixers]);
  const fallbackKnownMixers = useMemo(
    () => knownMixers.filter((m) => !discoveredIps.has(m.ip)),
    [knownMixers, discoveredIps]
  );
  const showKnownFallback = hasSearched && visibleMixers.length === 0 && fallbackKnownMixers.length > 0;

  const hasAnyMixer = visibleMixers.length > 0 || showKnownFallback;
  const showEmptyState = !discoveryLoading && !hasAnyMixer;
  const showInitialSearchingState = discoveryLoading && !hasSearched;
  const isActiveForegroundSearch = discoveryLoading;

  const manualIpTrimmed = manualIp.trim();
  const manualIpValid = useMemo(() => isValidIpv4(manualIpTrimmed), [manualIpTrimmed]);

  function handleManualConnect() {
    if (!manualIpValid) return;
    const manualMixer: DiscoveredMixer = {
      id: `manual:${manualIpTrimmed}:${manualModel}`,
      name: `AXIOS${manualModel}`,
      ip: manualIpTrimmed,
      model: `AXIOS${manualModel}`,
      channels: manualModel,
      status: "online",
      source: "manual",
    };
    onConnectMixer(manualMixer);
  }

  return (
    <div className="device-selection-shell device-selection-shell--reference">
      <section className="device-selection-intro">
        <h1 className="device-selection-header__title">Selecione uma mesa</h1>
        <p className="device-selection-hero__subtitle">
          Conecte-se a uma mesa Duonn Axios disponivel na rede local.
        </p>
      </section>
      <div className="device-selection-grid device-selection-grid--reference">
        <section className="startup-card device-selection-panel device-selection-panel--discovery">
          <div className="device-selection-panel__header">
            <h2 className="device-selection-panel__title">Mesas encontradas</h2>
            <div className="device-selection-status">
              <span className="device-selection-status__dot" />
              {isActiveForegroundSearch
                ? "Buscando"
                : hasAnyMixer
                  ? `${visibleMixers.length} encontrada(s)`
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

            {visibleMixers.map((mixer) => (
              <DeviceCard
                key={mixer.id}
                mixer={mixer}
                connectBusy={connectBusy}
                onConnect={onConnectMixer}
              />
            ))}

            {showKnownFallback
              ? fallbackKnownMixers.map((mixer) => (
                  <KnownDeviceCard
                    key={mixer.id}
                    mixer={mixer}
                    connectBusy={connectBusy}
                    onConnect={onConnectMixer}
                  />
                ))
              : null}

            {showEmptyState ? (
              <article className="device-empty-state">
                <h3>Nenhuma mesa encontrada</h3>
              </article>
            ) : null}
          </div>

          {hiddenMixers.length > 0 && !showInitialSearchingState && (
            <div className="device-inline-message device-inline-message--warning">
              {hiddenMixers.length === 1
                ? `Mesa em ${hiddenMixers[0].ip} não pôde ser identificada com segurança.`
                : `${hiddenMixers.length} mesas não identificadas com segurança (${hiddenMixers.map((m) => m.ip).join(", ")}).`
              }{" "}Use Conexão Manual com o IP correspondente.
            </div>
          )}
          {discoveryError ? <div className="device-inline-message device-inline-message--warning">{discoveryError}</div> : null}
          {connectionError ? <div className="device-inline-message device-inline-message--danger">{connectionError}</div> : null}
          <button
            type="button"
            className="startup-button startup-button--ghost"
            disabled={connectBusy || isActiveForegroundSearch}
            onClick={onRefresh}
          >
            {isActiveForegroundSearch ? "Buscando..." : "Atualizar"}
          </button>
        </section>

        <section className="startup-card device-selection-panel device-selection-panel--manual">
          <div className="device-selection-panel__header">
            <h2 className="device-selection-panel__title">Conexao manual</h2>
          </div>
          <section className="device-selection-block">
            <label className="device-input-label" htmlFor="manual-mixer-ip">
              IP da mesa
            </label>
            <input
              id="manual-mixer-ip"
              className="device-input"
              value={manualIp}
              onChange={(event) => setManualIp(event.target.value)}
              placeholder="Informe o IP da Mesa"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              disabled={connectBusy}
            />
            <label className="device-input-label" htmlFor="manual-mixer-model">
              Modelo
            </label>
            <select
              id="manual-mixer-model"
              className="device-input"
              value={String(manualModel)}
              onChange={(event) => setManualModel(Number(event.target.value) as ManualModelOption)}
              disabled={connectBusy}
            >
              <option value="16">AXIOS16 (16 canais)</option>
              <option value="24">AXIOS24 (24 canais)</option>
              <option value="32">AXIOS32 (32 canais)</option>
            </select>
            <button
              type="button"
              className="startup-button startup-button--primary"
              onClick={handleManualConnect}
              disabled={connectBusy || !manualIpValid}
            >
              Conectar Manualmente
            </button>
          </section>
        </section>
      </div>
    </div>
  );
}

export function DeviceSelectionPanel(props: DeviceSelectionPanelProps) {
  return (
    <div className="device-selection-content device-selection-content--embedded">
      <DeviceSelectionPanelContent {...props} />
    </div>
  );
}
