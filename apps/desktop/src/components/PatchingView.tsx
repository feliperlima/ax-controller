import { useState, type CSSProperties } from "react";
import { stripColorForScope } from "./stripColor";

type PatchingViewProps = {
  isConnected: boolean;
  isAx32ProfileActive: boolean;
  channelCount?: number;
  usbInputToUsbRoutes: number[];
  usbReturnRoutes: number[];
  inputRoutes: number[];
  outputRoutes: number[];
  channelNames?: string[];
  channelColorIds?: number[];
  auxNames?: string[];
  auxColorIds?: number[];
  onUsbInputToUsbRouteChange: (destination: number, source: number) => void;
  onUsbReturnRouteChange: (destination: number, source: number) => void;
  onInputRouteChange: (destination: number, source: number) => void;
  onOutputRouteChange: (destination: number, source: number) => void;
};

function sourceLabel(prefix: string, source: number) {
  return `${prefix}${source}`;
}

export function PatchingView({
  isConnected,
  isAx32ProfileActive,
  channelCount = 32,
  usbInputToUsbRoutes,
  usbReturnRoutes,
  inputRoutes,
  outputRoutes,
  channelNames,
  channelColorIds,
  auxNames,
  auxColorIds,
  onUsbInputToUsbRouteChange,
  onUsbReturnRouteChange,
  onInputRouteChange,
  onOutputRouteChange,
}: PatchingViewProps) {
  if (!isAx32ProfileActive) {
    return (
      <section className="patching-view patching-view--unavailable">
        <h2 className="patching-view__title">Patching</h2>
        <p className="patching-view__hint">
          Disponivel somente para AX32 no momento.
        </p>
      </section>
    );
  }

  const visibleChannelCount = Math.max(1, Math.min(32, channelCount));
  const outputVisibleCount = outputRoutes.length;
  const usbReturnVisibleCount = Math.min(usbReturnRoutes.length, visibleChannelCount);
  const usbRouteMax = 32;
  const inputSourceMax = 32;
  const outputSourceMax = 14;
  const [activeTab, setActiveTab] = useState<"record" | "play">("record");

  const channels = Array.from({ length: visibleChannelCount }, (_, index) => {
    const id = index + 1;
    return {
      id,
      tag: `CH ${id}`,
      name: channelNames?.[index]?.trim() || `CH ${id}`,
      color: stripColorForScope(channelColorIds?.[index], "channel"),
    };
  });

  const auxRows = Array.from({ length: outputVisibleCount }, (_, index) => {
    const id = index + 1;
    return {
      id,
      tag: `OUT ${id}`,
      name: auxNames?.[index]?.trim() || `AUX ${id}`,
      color: stripColorForScope(auxColorIds?.[index], "aux"),
    };
  });

  const splitIndex = Math.ceil(channels.length / 2);
  const channelCol1 = channels.slice(0, splitIndex);
  const channelCol2 = channels.slice(splitIndex);

  const usbSourceOptions = Array.from({ length: usbRouteMax }, (_, sourceIndex) => sourceIndex + 1);
  const inputSourceOptions = Array.from({ length: inputSourceMax }, (_, sourceIndex) => sourceIndex + 1);
  const outputSourceOptions = Array.from({ length: outputSourceMax }, (_, sourceIndex) => sourceIndex + 1);

  return (
    <section className="patching-view">
      <div className="patching-view__header">
        <h2 className="patching-view__title">Patching</h2>
        <p className="patching-view__hint">
          {activeTab === "record"
            ? "Controle USB (Record/Play). Escolher uma rota ja usada libera o destino anterior como Unpatched."
            : "Patching fisico de canais. Escolher uma rota ja usada libera o destino anterior como Unpatched."}
        </p>
      </div>

      <div className="groups-structured-tabs" role="tablist" aria-label="Patching tabs">
        <button
          id="patching-tab-record"
          type="button"
          role="tab"
          aria-selected={activeTab === "record"}
          onClick={() => setActiveTab("record")}
          className={`groups-structured-tab ${activeTab === "record" ? "groups-structured-tab--active" : ""}`}
        >
          RECORD
        </button>
        <button
          id="patching-tab-play"
          type="button"
          role="tab"
          aria-selected={activeTab === "play"}
          onClick={() => setActiveTab("play")}
          className={`groups-structured-tab ${activeTab === "play" ? "groups-structured-tab--active" : ""}`}
        >
          PLAY
        </button>
      </div>

      <section className="groups-structured-panel" role="tabpanel" aria-labelledby={`patching-tab-${activeTab}`}>
        <div className="groups-matrix-card patching-matrix-card">
          <section className="groups-matrix-col groups-matrix-col--channels patching-matrix-col">
            <header className="groups-matrix-col__header">
              <span className="groups-matrix-col__title">INPUT CHANNELS</span>
            </header>
            <div className="groups-matrix-col__list">
              <div className="groups-matrix-col__split patching-matrix-split">
                <div className="patching-matrix-list">
                  {channelCol1.map((channel) => {
                    const destination = channel.id;
                    const currentSource = activeTab === "record"
                      ? (usbInputToUsbRoutes[destination - 1] ?? 0)
                      : (inputRoutes[destination - 1] ?? 0);

                    return (
                      <div key={`${activeTab}-left-${destination}`} className="patching-structured-row">
                        <span className="groups-structured-row__tag" style={{ "--channel-accent": channel.color } as CSSProperties}>
                          {channel.tag}
                        </span>
                        <span className="groups-structured-row__name">{channel.name}</span>
                        <select
                          className={`patching-row__select patching-row__select--matrix ${currentSource === 0 ? "patching-row__select--empty" : ""}`}
                          value={currentSource}
                          disabled={!isConnected}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (activeTab === "record") {
                              onUsbInputToUsbRouteChange(destination, value);
                              return;
                            }
                            onInputRouteChange(destination, value);
                          }}
                        >
                          <option value={0}>Unpatched</option>
                          {(activeTab === "record" ? usbSourceOptions : inputSourceOptions).map((source) => (
                            <option key={`${activeTab}-left-${destination}-source-${source}`} value={source}>
                              {sourceLabel(activeTab === "record" ? "USB " : "CH ", source)}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                <div className="patching-matrix-list">
                  {channelCol2.map((channel) => {
                    const destination = channel.id;
                    const currentSource = activeTab === "record"
                      ? (usbInputToUsbRoutes[destination - 1] ?? 0)
                      : (inputRoutes[destination - 1] ?? 0);

                    return (
                      <div key={`${activeTab}-right-${destination}`} className="patching-structured-row">
                        <span className="groups-structured-row__tag" style={{ "--channel-accent": channel.color } as CSSProperties}>
                          {channel.tag}
                        </span>
                        <span className="groups-structured-row__name">{channel.name}</span>
                        <select
                          className={`patching-row__select patching-row__select--matrix ${currentSource === 0 ? "patching-row__select--empty" : ""}`}
                          value={currentSource}
                          disabled={!isConnected}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (activeTab === "record") {
                              onUsbInputToUsbRouteChange(destination, value);
                              return;
                            }
                            onInputRouteChange(destination, value);
                          }}
                        >
                          <option value={0}>Unpatched</option>
                          {(activeTab === "record" ? usbSourceOptions : inputSourceOptions).map((source) => (
                            <option key={`${activeTab}-right-${destination}-source-${source}`} value={source}>
                              {sourceLabel(activeTab === "record" ? "USB " : "CH ", source)}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="groups-matrix-col patching-matrix-col patching-matrix-col--secondary">
            <header className="groups-matrix-col__header">
              <span className="groups-matrix-col__title">{activeTab === "record" ? "USB RETURN" : "AUX / BUSSES"}</span>
            </header>
            <div className="groups-matrix-col__list patching-matrix-list">
              {(activeTab === "record"
                ? channels.slice(0, usbReturnVisibleCount).map((channel) => ({
                    key: `record-return-${channel.id}`,
                    tag: channel.tag,
                    name: channel.name,
                    color: channel.color,
                    destination: channel.id,
                    currentSource: usbReturnRoutes[channel.id - 1] ?? 0,
                    sourcePrefix: "USB ",
                    options: usbSourceOptions,
                    onChange: onUsbReturnRouteChange,
                  }))
                : auxRows.map((row) => ({
                    key: `play-output-${row.id}`,
                    tag: row.tag,
                    name: row.name,
                    color: row.color,
                    destination: row.id,
                    currentSource: outputRoutes[row.id - 1] ?? 0,
                    sourcePrefix: "AUX ",
                    options: outputSourceOptions,
                    onChange: onOutputRouteChange,
                  }))
              ).map((row) => (
                <div key={row.key} className="patching-structured-row">
                  <span className="groups-structured-row__tag" style={{ "--channel-accent": row.color } as CSSProperties}>
                    {row.tag}
                  </span>
                  <span className="groups-structured-row__name">{row.name}</span>
                  <select
                    className={`patching-row__select patching-row__select--matrix ${row.currentSource === 0 ? "patching-row__select--empty" : ""}`}
                    value={row.currentSource}
                    disabled={!isConnected}
                    onChange={(event) => {
                      row.onChange(row.destination, Number(event.target.value));
                    }}
                  >
                    <option value={0}>Unpatched</option>
                    {row.options.map((source) => (
                      <option key={`${row.key}-source-${source}`} value={source}>
                        {sourceLabel(row.sourcePrefix, source)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </section>
  );
}
