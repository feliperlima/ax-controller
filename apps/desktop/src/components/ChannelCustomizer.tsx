import { useEffect, useState } from "react";

const CHANNEL_COLOR_PALETTE: Record<number, string> = {
  0: "#7B7B7B",
  1: "#4174BE",
  2: "#4F22E8",
  3: "#13BEC4",
  4: "#8BA52C",
  5: "#0CBD42",
  6: "#139EE6",
  7: "#A514E8",
  8: "#EBD93A",
  9: "#ED004C",
  10: "#F95361",
  11: "#E80CE9",
  12: "#C96626",
};

type ChannelCustomizerProps = {
  channel: number;
  title?: string;
  defaultName: string;
  channelName: string;
  colorId: number;
  allowZeroColorSelection?: boolean;
  onSave: (patch: { channelName: string; colorId: number }) => void;
  onClose: () => void;
};

export function ChannelCustomizer({
  channel,
  title = "Editar Canal",
  defaultName,
  channelName,
  colorId,
  allowZeroColorSelection = false,
  onSave,
  onClose,
}: ChannelCustomizerProps) {
  const [draftName, setDraftName] = useState(channelName);
  const [draftColorId, setDraftColorId] = useState(colorId);

  useEffect(() => {
    setDraftName(channelName.trim() === defaultName.trim() ? "" : channelName);
    setDraftColorId(colorId);
  }, [channelName, colorId, channel, defaultName]);

  const channelColor =
    CHANNEL_COLOR_PALETTE[draftColorId] ?? CHANNEL_COLOR_PALETTE[0] ?? "#7B7B7B";
  const displayName = draftName.trim() || defaultName;

  function handleClear() {
    setDraftName("");
    setDraftColorId(0);
  }

  function handleSave() {
    onSave({ channelName: draftName, colorId: draftColorId });
    onClose();
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          zIndex: 99,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 100,
          width: "min(92vw, 430px)",
          maxHeight: "calc(100vh - 24px)",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg, #151b22 0%, #0f141a 100%)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.58)",
          color: "#e5eef5",
          fontFamily: "system-ui, sans-serif",
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: "#d7e1ea" }}>{title}</div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#94a3b8",
              fontSize: 20,
              cursor: "pointer",
              padding: 0,
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "16px",
            display: "grid",
            gap: 14,
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder={defaultName}
                maxLength={32}
                autoFocus
                style={{
                  width: "100%",
                  minWidth: 0,
                  padding: "14px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "#1a2332",
                  color: "#e5eef5",
                  fontSize: 14,
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <button
                type="button"
                onClick={handleClear}
                style={{
                  height: 48,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "#cbd5e1",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                CLEAR
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                gap: 8,
                padding: 10,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#121923",
              }}
            >
              {Object.entries(CHANNEL_COLOR_PALETTE)
                .filter(([id]) => allowZeroColorSelection || Number(id) !== 0)
                .map(([id, color]) => {
                const numericId = Number(id);
                const isActive = numericId === draftColorId;

                return (
                  <button
                    key={id}
                    type="button"
                    title={`Cor ${id}`}
                    aria-label={`Selecionar cor ${id}`}
                    onClick={() => setDraftColorId(numericId)}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      minHeight: 22,
                      padding: 0,
                      borderRadius: 999,
                      border: isActive
                        ? "3px solid #ffffff"
                        : "1px solid rgba(255,255,255,0.14)",
                      background: color,
                      cursor: "pointer",
                      boxShadow: isActive
                        ? `0 0 0 3px rgba(255,255,255,0.14), 0 0 14px ${color}88`
                        : "inset 0 0 0 1px rgba(0,0,0,0.18)",
                      transform: isActive ? "scale(1.05)" : "scale(1)",
                      transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        borderRadius: 999,
                        boxShadow: isActive
                          ? "inset 0 0 0 1px rgba(255,255,255,0.35)"
                          : "none",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#9fb0c4",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 150ms",
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#161d27",
              color: "#cbd5e1",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1a2332";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#161d27";
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </>
  );
}
