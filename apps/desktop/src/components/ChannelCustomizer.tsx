import { DuonnIcon, DUONN_CHANNEL_ICONS } from "./DuonnIcon";

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
  iconId: number;
  channelName: string;
  colorId: number;
  onIconChange: (iconId: number) => void;
  onNameChange: (name: string) => void;
  onColorChange: (colorId: number) => void;
  onClose: () => void;
};

export function ChannelCustomizer({
  channel,
  iconId,
  channelName,
  colorId,
  onIconChange,
  onNameChange,
  onColorChange,
  onClose,
}: ChannelCustomizerProps) {
  const channelColor = CHANNEL_COLOR_PALETTE[colorId] ?? CHANNEL_COLOR_PALETTE[1];
  const currentIcon =
    DUONN_CHANNEL_ICONS.find((icon) => icon.id === iconId) ??
    DUONN_CHANNEL_ICONS[0];
  const displayName = channelName.trim() || "Sem nome";

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
        aria-label={`Customizar canal ${channel}`}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#1c2430",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DuonnIcon
                id={currentIcon.iconId}
                size={24}
                color={channelColor}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#94a3b8" }}>
                CHANNEL {channel}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                {displayName}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
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
            gap: 16,
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
            <input
              type="text"
              value={channelName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Nome do canal"
              maxLength={20}
              autoFocus
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#1a2332",
                color: "#e5eef5",
                fontSize: 13,
                fontWeight: 600,
                outline: "none",
                boxSizing: "border-box",
              }}
            />

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
              {Object.entries(CHANNEL_COLOR_PALETTE).map(([id, color]) => {
                const numericId = Number(id);
                const isActive = numericId === colorId;

                return (
                  <button
                    key={id}
                    type="button"
                    title={`Cor ${id}`}
                    aria-label={`Selecionar cor ${id}`}
                    onClick={() => onColorChange(numericId)}
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
            }}
          >
            {DUONN_CHANNEL_ICONS.map((icon) => {
              const isActive = icon.id === iconId;

              return (
                <button
                  key={icon.id}
                  type="button"
                  title={icon.label}
                  aria-label={icon.label}
                  onClick={() => onIconChange(icon.id)}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    padding: 0,
                    borderRadius: 9,
                    border: isActive
                      ? `1px solid ${channelColor}`
                      : "1px solid rgba(255,255,255,0.08)",
                    background: isActive ? `${channelColor}18` : "#1a2332",
                    boxShadow: isActive
                      ? `0 0 0 1px ${channelColor}44 inset`
                      : "inset 0 1px 0 rgba(255,255,255,0.03)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <DuonnIcon
                    id={icon.iconId}
                    size={21}
                    color={isActive ? channelColor : "#94a3b8"}
                    glow={isActive}
                  />
                </button>
              );
            })}
          </div>

          <div
            style={{
              padding: "12px",
              borderRadius: 8,
              background: "#0a0f18",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: 12,
              color: "#94a3b8",
              lineHeight: 1.5,
            }}
          >
            <strong>Dica:</strong> O nome digitado e a cor escolhida definem a identidade do canal. Os icones aqui servem apenas como apoio visual.
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
              e.currentTarget.style.background = "transparent";
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </>
  );
}
