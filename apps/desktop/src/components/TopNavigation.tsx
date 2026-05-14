type AxHeaderStatusTagProps = {
  status: "connected" | "connecting" | "disconnected";
};

type AxHeaderConnectionIpProps = {
  ip: string;
  connected: boolean;
  onIpChange: (value: string) => void;
  onSubmit?: () => void;
  onDisconnect?: () => void;
};

export function AxHeaderStatusTag({ status }: AxHeaderStatusTagProps) {
  const statusLabel =
    status === "connected"
      ? "CONNECTED"
      : status === "connecting"
        ? "CONNECTING"
        : "DISCONNECTED";

  return (
    <div
      className={`ax-header-status-tag is-${status}`}
      data-node-id="75:504"
    >
      <span className="ax-header-status-tag__dot" data-node-id="75:505" />
      <p className="ax-header-status-tag__text" data-node-id="75:506">
        {statusLabel}
      </p>
    </div>
  );
}

export function AxHeaderConnectionIp({
  ip,
  connected,
  onIpChange,
  onSubmit,
  onDisconnect,
}: AxHeaderConnectionIpProps) {
  return (
    <div className="ax-header-connection-ip" data-node-id="75:514">
      <span className="ax-header-connection-ip__label" data-node-id="75:515">
        IP
      </span>
      <div className="ax-header-connection-ip__value-wrap">
        <input
          className="ax-header-connection-ip__input"
          value={ip}
          onChange={(event) => onIpChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            onSubmit?.();
          }}
          disabled={connected}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="numeric"
          aria-label="Mixer IP"
          data-node-id="75:516"
        />
        {connected && (
          <button
            type="button"
            className="ax-header-connection-ip__disconnect"
            onClick={onDisconnect}
            aria-label="Desconectar"
            title="Desconectar"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
