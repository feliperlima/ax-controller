import { VerticalFader } from "./VerticalFader";
import { MeterBar, MeterScale } from "./Meter";
import { stripColorFromId } from "./stripColor";

type MasterBusProps = {
  name?: string;
  leftColorId?: number;
  rightColorId?: number;
  muted: boolean;
  soloOn: boolean;
  linked: boolean;
  leftFaderDb: number;
  leftFaderPosition: number;
  rightFaderPosition: number;
  meterDbL: number;
  meterDbR: number;
  peakDbL?: number;
  peakDbR?: number;
  clippedL: boolean;
  clippedR: boolean;
  disabled?: boolean;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onToggleLink: () => void;
  onMainFaderChange: (value: number) => void;
  onLeftFaderChange: (value: number) => void;
  onRightFaderChange: (value: number) => void;
  onOpenDetail?: () => void;
};

const FADER_DB_POINTS = [
  { pos: 0, db: -120 },
  { pos: 10, db: -50 },
  { pos: 25, db: -30 },
  { pos: 45, db: -20 },
  { pos: 65, db: -10 },
  { pos: 80, db: -5 },
  { pos: 90, db: 0 },
  { pos: 95, db: 5 },
  { pos: 100, db: 10 },
];

function dbToFaderScalePosition(db: number) {
  for (let i = 0; i < FADER_DB_POINTS.length - 1; i++) {
    const current = FADER_DB_POINTS[i];
    const next = FADER_DB_POINTS[i + 1];
    if (db >= current.db && db <= next.db) {
      const t = (db - current.db) / (next.db - current.db);
      return current.pos + t * (next.pos - current.pos);
    }
  }
  return db <= -120 ? 0 : 100;
}

const FADER_SNAP_POINTS_DB = [-50, -40, -30, -20, -10, -5, 0, 5, 10];
const FADER_SNAP_POINTS = FADER_SNAP_POINTS_DB.map(dbToFaderScalePosition);

export function MasterBus({
  leftColorId = 0,
  rightColorId = 0,
  muted,
  soloOn,
  linked,
  leftFaderDb,
  leftFaderPosition,
  rightFaderPosition,
  meterDbL,
  meterDbR,
  peakDbL,
  peakDbR,
  clippedL = false,
  clippedR = false,
  disabled = false,
  onToggleMute,
  onToggleSolo,
  onToggleLink,
  onMainFaderChange,
  onLeftFaderChange,
  onRightFaderChange,
  onOpenDetail,
}: MasterBusProps) {
  const footerName = "Master Bus";
  const isLinked = linked;
  const canOpenDetail = typeof onOpenDetail === "function";
  const faderDbLabel = (db: number) => (db <= -120 ? "-∞" : `${db} dB`);
  const leftColor = stripColorFromId(leftColorId, 0, "var(--module-master-primary)");
  const rightColor = stripColorFromId(rightColorId, 0, "var(--module-master-primary)");
  const footerBackground =
    leftColor === rightColor
      ? leftColor
      : `linear-gradient(90deg, ${leftColor} 0%, ${leftColor} 50%, ${rightColor} 50%, ${rightColor} 100%)`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: "4px",
        width: 183,
        minWidth: 183,
        height: "100%",
        backgroundColor: "var(--surface-card-hover)",
        boxShadow: "0px 4px 2px rgba(0,0,0,0.25)",
        color: "var(--text-primary)",
        fontFamily: "system-ui, sans-serif",
        fontSize: "10px",
      }}
    >
      {/* Buttons group */}
      <div
        style={{
          marginTop: 8,
          paddingLeft: 4,
          paddingRight: 4,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Row 1: STEREO LINK */}
        <button
          disabled={disabled}
          onClick={(e) => { e.stopPropagation(); onToggleLink(); }}
          style={{
            width: "100%",
            height: 32,
            borderRadius: 8,
            border: linked
              ? "2px solid #38bdf8"
              : "1px solid var(--button-default-border)",
            background: linked
              ? "linear-gradient(180deg, rgba(56,189,248,0.52) 0%, rgba(8,145,178,0.55) 100%)"
              : "var(--button-default-bg)",
            color: linked
              ? "#a5f3fc"
              : "var(--button-default-text)",
            fontSize: 10,
            lineHeight: "12px",
            fontWeight: 700,
            letterSpacing: "1.2px",
            padding: "8px 14px",
            boxSizing: "border-box",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            boxShadow: linked
              ? "0 0 18px rgba(34,211,238,0.56)"
              : "none",
          }}
        >
          STEREO LINK
        </button>
        {/* Row 2: MUTE + SOLO */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
            style={{
              height: 32,
              borderRadius: 8,
              border: muted ? "2px solid var(--button-mute-border)" : "1px solid var(--button-default-border)",
              background: muted ? "var(--button-mute-bg)" : "var(--button-default-bg)",
              color: muted ? "var(--button-mute-text)" : "var(--button-default-text)",
              fontSize: 10,
              lineHeight: "12px",
              fontWeight: 700,
              letterSpacing: "1.2px",
              padding: "8px 14px",
              boxSizing: "border-box",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              boxShadow: muted ? "var(--button-mute-glow)" : "none",
            }}
          >
            MUTE
          </button>
          <button
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); onToggleSolo(); }}
            style={{
              height: 32,
              borderRadius: 8,
              border: soloOn ? "2px solid var(--button-solo-border)" : "1px solid var(--button-default-border)",
              background: soloOn ? "var(--button-solo-bg)" : "var(--button-default-bg)",
              color: soloOn ? "var(--button-solo-text)" : "var(--button-default-text)",
              fontSize: 10,
              lineHeight: "12px",
              fontWeight: 700,
              letterSpacing: "1.2px",
              padding: "8px 14px",
              boxSizing: "border-box",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              boxShadow: soloOn ? "var(--button-solo-glow)" : "none",
            }}
          >
            SOLO
          </button>
        </div>
      </div>

      {/* Fader + Meter area: 24px below buttons */}
      <div
        style={{
          marginTop: 24,
          paddingLeft: 4,
          paddingRight: 4,
          paddingBottom: 8,
          flex: "1 1 0",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* Content row: Meter block (left) + Fader(s) (right), centered */}
        <div
          style={{
            flex: "1 1 0",
            minHeight: 0,
            display: "flex",
            gap: 24,
            justifyContent: "center",
            alignItems: "stretch",
          }}
        >
          {/* === Meter block: 49px (scale 21 + gap 4 + L bar 10 + gap 4 + R bar 10) === */}
          <div style={{ width: 49, flexShrink: 0, display: "flex", gap: 4, height: "100%" }}>
            <MeterScale clipped={clippedL || clippedR} />
            <MeterBar meterDb={meterDbL} peakDb={peakDbL} clipped={clippedL} />
            <MeterBar meterDb={meterDbR} peakDb={peakDbR} clipped={clippedR} />
          </div>

          {/* Fader(s) */}
          {isLinked ? (
            <div style={{ width: 23, flexShrink: 0, height: "100%", overflow: "visible" }}>
              <VerticalFader
                value={leftFaderPosition}
                height="100%"
                width={23}
                disabled={disabled}
                snapPoints={FADER_SNAP_POINTS}
                snapThreshold={1.8}
                zeroMarkerValue={dbToFaderScalePosition(0)}
                layoutWidth={23}
                thumbVariant="master"
                onChange={onMainFaderChange}
              />
            </div>
          ) : (
            <>
              <div style={{ width: 23, flexShrink: 0, height: "100%", overflow: "visible" }}>
                <VerticalFader
                  value={leftFaderPosition}
                  height="100%"
                  width={23}
                  disabled={disabled}
                  snapPoints={FADER_SNAP_POINTS}
                  snapThreshold={1.8}
                  zeroMarkerValue={dbToFaderScalePosition(0)}
                  layoutWidth={23}
                  thumbVariant="master"
                  onChange={onLeftFaderChange}
                />
              </div>
              <div style={{ width: 23, flexShrink: 0, height: "100%", overflow: "visible" }}>
                <VerticalFader
                  value={rightFaderPosition}
                  height="100%"
                  width={23}
                  disabled={disabled}
                  snapPoints={FADER_SNAP_POINTS}
                  snapThreshold={1.8}
                  zeroMarkerValue={dbToFaderScalePosition(0)}
                  layoutWidth={23}
                  thumbVariant="master"
                  onChange={onRightFaderChange}
                />
              </div>
            </>
          )}
        </div>

        {/* dB display: fills the strip content width */}
        <div
          style={{
            marginTop: 8,
            height: 36,
            width: "100%",
            alignSelf: "stretch",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.8)",
            borderRadius: 4,
            padding: "11px 29px",
            boxSizing: "border-box",
            fontSize: 13,
            lineHeight: 1,
            fontWeight: 400,
            color: muted ? "var(--text-muted)" : "var(--text-primary)",
            whiteSpace: "nowrap",
          }}
        >
          {faderDbLabel(leftFaderDb)}
        </div>
      </div>

      {/* Footer: height=40, L/R label + name */}
      <button
        onClick={(e) => { e.stopPropagation(); }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (disabled || !canOpenDetail) return;
          onOpenDetail();
        }}
        disabled={disabled}
        style={{
          width: "100%",
          height: 40,
          flexShrink: 0,
          padding: 4,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          textAlign: "left",
          gap: 3,
          background: footerBackground,
          border: "none",
          cursor: disabled ? "not-allowed" : canOpenDetail ? "pointer" : "default",
          boxSizing: "border-box",
          fontFamily: "inherit",
          opacity: disabled ? 0.58 : 1,
          filter: disabled ? "saturate(0.55) brightness(0.82)" : "none",
        }}
      >
        <div
          style={{
            fontSize: 10,
            lineHeight: "12px",
            color: "var(--text-inverse)",
            fontWeight: 600,
            letterSpacing: "0.5px",
            width: "100%",
            display: "flex",
            justifyContent: "flex-start",
            textAlign: "left",
          }}
        >
          L/R
        </div>
        <div
          style={{
            fontSize: 16,
            lineHeight: "20px",
            fontWeight: 700,
            color: "var(--text-inverse)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
            textAlign: "left",
          }}
        >
          {footerName}
        </div>
      </button>
    </div>
  );
}
