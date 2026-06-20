import { useState, type CSSProperties } from "react";
import { stripColorForScope } from "./stripColor";

type PatchingViewProps = {
  isConnected: boolean;
  resetBusy?: boolean;
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
  onResetRecordPatchingDefaults: () => void;
  onResetPlayPatchingDefaults: () => void;
};

function sourceLabel(prefix: string, source: number) {
  return `${prefix}${source}`;
}

export function PatchingView({
  isConnected,
  resetBusy = false,
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
  onResetRecordPatchingDefaults,
  onResetPlayPatchingDefaults,
}: PatchingViewProps) {
  const visibleChannelCount = Math.max(1, channelCount);
  const outputVisibleCount = outputRoutes.length;
  const usbReturnVisibleCount = usbReturnRoutes.length;
  const usbRouteMax = usbInputToUsbRoutes.length;
  const inputSourceMax = inputRoutes.length;
  const outputSourceMax = outputRoutes.length;
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

  const secondaryRows = activeTab === "record"
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
      }));

  const secondarySplitIndex = Math.ceil(secondaryRows.length / 2);
  const secondaryCol1 = activeTab === "record" ? secondaryRows.slice(0, secondarySplitIndex) : secondaryRows;
  const secondaryCol2 = activeTab === "record" ? secondaryRows.slice(secondarySplitIndex) : [];

  const hasAnyPatchedRoute = activeTab === "record"
    ? channels.some((channel) => (usbInputToUsbRoutes[channel.id - 1] ?? 0) !== 0) ||
      channels.slice(0, usbReturnVisibleCount).some((channel) => (usbReturnRoutes[channel.id - 1] ?? 0) !== 0)
    : channels.some((channel) => (inputRoutes[channel.id - 1] ?? 0) !== 0) ||
      auxRows.some((row) => (outputRoutes[row.id - 1] ?? 0) !== 0);

  const handleClearActiveTab = () => {
    if (activeTab === "record") {
      onResetRecordPatchingDefaults();

      return;
    }

    onResetPlayPatchingDefaults();
  };

  const renderPatchingRow = (row: {
    key: string;
    tag: string;
    name: string;
    color: string;
    destination: number;
    currentSource: number;
    sourcePrefix: string;
    options: number[];
    allowUnpatched?: boolean;
    onChange: (destination: number, source: number) => void;
  }) => (
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
        {row.allowUnpatched !== false && <option value={0}>Unpatched</option>}
        {row.options.map((source) => (
          <option key={`${row.key}-source-${source}`} value={source}>
            {sourceLabel(row.sourcePrefix, source)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <section className="patching-view">
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
        <div className="groups-view__matrix-header">
          <span className="groups-view__matrix-title">
            {activeTab === "record" ? "Patching USB" : "Patching Fisico"}
          </span>
          <div className="groups-view__matrix-actions groups-view__matrix-actions--outline">
            <button
              type="button"
              className="groups-view__action-btn"
              disabled={!isConnected || !hasAnyPatchedRoute || resetBusy}
              onClick={handleClearActiveTab}
            >
              CLEAR ALL
            </button>
          </div>
        </div>

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
                      renderPatchingRow({
                        key: `${activeTab}-left-${destination}`,
                        tag: channel.tag,
                        name: channel.name,
                        color: channel.color,
                        destination,
                        currentSource,
                        sourcePrefix: activeTab === "record" ? "USB " : "CH ",
                        options: activeTab === "record" ? usbSourceOptions : inputSourceOptions,
                        allowUnpatched: activeTab !== "record",
                        onChange: activeTab === "record" ? onUsbInputToUsbRouteChange : onInputRouteChange,
                      })
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
                      renderPatchingRow({
                        key: `${activeTab}-right-${destination}`,
                        tag: channel.tag,
                        name: channel.name,
                        color: channel.color,
                        destination,
                        currentSource,
                        sourcePrefix: activeTab === "record" ? "USB " : "CH ",
                        options: activeTab === "record" ? usbSourceOptions : inputSourceOptions,
                        allowUnpatched: activeTab !== "record",
                        onChange: activeTab === "record" ? onUsbInputToUsbRouteChange : onInputRouteChange,
                      })
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
            <div className="groups-matrix-col__list">
              <div className={`groups-matrix-col__split patching-matrix-split ${activeTab === "record" ? "patching-matrix-split--secondary" : ""}`}>
                <div className="patching-matrix-list">
                  {secondaryCol1.map((row) => renderPatchingRow(row))}
                </div>
                {activeTab === "record" && secondaryCol2.length > 0 && (
                  <div className="patching-matrix-list">
                    {secondaryCol2.map((row) => renderPatchingRow(row))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </section>
  );
}
