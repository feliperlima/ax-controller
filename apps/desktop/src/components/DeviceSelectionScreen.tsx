import { useMemo, useState } from "react";
import type { DiscoveredMixer, ProfileConfidence } from "../services/mixerDiscovery";
import axControlBrand from "../assets/AX-control-Brand-vert.svg";
import productAxios16 from "../assets/product-axios16.webp";
import productAxios24 from "../assets/product-axios24.webp";
import productAxios32 from "../assets/product-axios32.webp";

type ManualModelOption = 16 | 24 | 32;

type DeviceSelectionScreenProps = {
  mixers: DiscoveredMixer[];
  knownMixers: DiscoveredMixer[];
  hasSearched: boolean;
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

  const text = `${mixer.model ?? ""} ${mixer.name}`.toUpperCase();
  const match = text.match(/AXIOS\s*(16|24|32)/i);
  if (!match) return undefined;

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function extractChannelsFromName(mixer: DiscoveredMixer): number | null {
  const text = `${mixer.model ?? ""} ${mixer.name}`.toUpperCase();
  const match = text.match(/AXIOS\s*(16|24|32)/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveMixerDiscoveryConfidence(mixer: DiscoveredMixer): ProfileConfidence {
  const probeChannels =
    typeof mixer.channels === "number" && Number.isFinite(mixer.channels)
      ? Math.max(1, Math.round(mixer.channels))
      : null;
  const nameChannels = extractChannelsFromName(mixer);

  if (probeChannels === null && nameChannels === null) return "unknown";
  if (probeChannels === null) return "inferred"; // nome aponta modelo mas probe não confirmou
  if (nameChannels === null) return "confirmed"; // só probe, sem nome para contradizer
  if (probeChannels === nameChannels) return "confirmed"; // probe e nome concordam
  return "inferred"; // probe e nome divergem — não listar
}

function resolveMixerModelLabel(mixer: DiscoveredMixer) {
  const channels = resolveMixerChannels(mixer);
  if (channels === 32) return "AXIOS 32";
  if (channels === 24) return "AXIOS 24";
  if (channels === 16) return "AXIOS 16";
  return "AXIOS";
}

function resolveMixerPreviewImage(mixer: DiscoveredMixer) {
  const channels = resolveMixerChannels(mixer);
  if (channels === 32) return productAxios32;
  if (channels === 24) return productAxios24;
  return productAxios16;
}

function isValidIpv4(value: string) {
  const parts = value.trim().split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const parsed = Number(part);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 255;
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

export function DeviceSelectionScreen({
  mixers,
  knownMixers,
  hasSearched,
  discoveryLoading,
  discoveryError,
  connectBusy,
  connectionError,
  onRefresh,
  onConnectMixer,
}: DeviceSelectionScreenProps) {
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
  // Placeholder de busca: só durante a primeira busca, antes de qualquer resultado
  const showInitialSearchingState = discoveryLoading && !hasSearched;
  // Botão "Buscando...": sempre que há uma busca em andamento (inclusive refreshes)
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
    <section className="startup-shell startup-shell--device-selection">
      <nav className="top-nav">
        <div className="top-nav__brand">
          <img className="brand-logo brand-logo--wordmark" src={axControlBrand} alt="AX Control" />
        </div>

        <div className="top-nav__actions">
          <button
            type="button"
            className="startup-button startup-button--ghost"
            disabled={connectBusy || isActiveForegroundSearch}
            onClick={onRefresh}
          >
            {isActiveForegroundSearch ? "Buscando..." : "Atualizar"}
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

                {!manualIpValid && manualIpTrimmed.length > 0 ? (
                  <div className="device-inline-message device-inline-message--warning">
                    Informe um IPv4 valido no formato 0.0.0.0.
                  </div>
                ) : null}

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
      </div>
    </section>
  );
}
