import { useMemo } from "react";
import { VerticalFader } from "./VerticalFader";
import { MeterBar, MeterScale } from "./Meter";
import { eqMagnitudeDb, type EqState } from "./ChannelProcessors";
import { stripColorFromId } from "./stripColor";

type FxStripProps = {
  fxNumber: 1 | 2;
  variant?: "default" | "detail";
  colorId?: number;
  channelName?: string;
  eqState?: EqState;
  muted: boolean;
  soloOn: boolean;
  faderDb: number;
  faderPosition: number;
  meterDb?: number;
  peakDb?: number;
  clipped?: boolean;
  disabled?: boolean;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onFaderChange: (value: number) => void;
  onOpenDetail?: (fxNumber: 1 | 2) => void;
};

const EQ_PREVIEW_WIDTH = 78;
const EQ_PREVIEW_HEIGHT = 48;

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

function ratioToDisplayFreq(ratio: number) {
  const min = Math.log10(10);
  const max = Math.log10(24000);
  return 10 ** (min + Math.max(0, Math.min(1, ratio)) * (max - min));
}

const FLAT_EQ: EqState = {
  enabled: false,
  hpfEnabled: false,
  hpfType: "butterworth",
  hpfSlope: 24,
  hpfFreq: 20,
  lpfEnabled: false,
  lpfType: "butterworth",
  lpfSlope: 24,
  lpfFreq: 20000,
  bands: [],
};

function buildEqPreview(eq: EqState, width: number, height: number, pointCount = 40) {
  const zeroY = height / 2;
  const points = Array.from({ length: pointCount }, (_, i) => {
    const ratio = pointCount <= 1 ? 0 : i / (pointCount - 1);
    const x = ratio * width;
    const gain = eqMagnitudeDb(ratioToDisplayFreq(ratio), eq);
    const y = zeroY - (gain / 12) * zeroY;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return { points, zeroY };
}

export function FxStrip({
  fxNumber,
  variant = "default",
  colorId = 7,
  channelName,
  eqState,
  muted,
  soloOn,
  faderDb,
  faderPosition,
  meterDb = -75,
  peakDb,
  clipped = false,
  disabled = false,
  onToggleMute,
  onToggleSolo,
  onFaderChange,
  onOpenDetail,
}: FxStripProps) {
  const isDetailVariant = variant === "detail";
  const stripColor = stripColorFromId(colorId, 7, "var(--module-fx-primary)");
  const label = `FX${fxNumber}`;
  const displayName = channelName?.trim().length
    ? channelName.trim()
    : `FX ${fxNumber}`;
  const canOpenDetail = typeof onOpenDetail === "function";
  const eqPreviewState = eqState ?? FLAT_EQ;

  const eqPreview = useMemo(
    () => buildEqPreview(eqPreviewState, EQ_PREVIEW_WIDTH, EQ_PREVIEW_HEIGHT, 40),
    [eqPreviewState],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        overflow: "hidden",
        padding: 0,
        borderRadius: "4px",
        width: "var(--strip-width)",
        minWidth: "var(--strip-width)",
        height: "100%",
        backgroundColor: "var(--surface-card)",
        boxShadow: "0px 4px 2px rgba(0,0,0,0.25)",
        color: "var(--text-primary)",
        fontFamily: "system-ui, sans-serif",
        fontSize: "10px",
      }}
    >
      <div
        style={{
          width: "100%",
          flex: "1 1 0",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          padding: "8px 4px 8px",
          boxSizing: "border-box",
        }}
      >
      {!isDetailVariant && (
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            paddingTop: 0,
            paddingLeft: 0,
            paddingRight: 0,
            paddingBottom: 0,
          }}
        >
          <svg
            viewBox={`0 0 ${EQ_PREVIEW_WIDTH} ${EQ_PREVIEW_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            onClick={(event) => {
              if (!canOpenDetail) return;
              event.stopPropagation();
              onOpenDetail?.(fxNumber);
            }}
            style={{
              width: "100%",
              height: `${EQ_PREVIEW_HEIGHT}px`,
              display: "block",
              backgroundColor: "rgba(0,0,0,0.8)",
              borderRadius: "4px",
              cursor: canOpenDetail ? "pointer" : "default",
            }}
          >
            <line
              x1={0}
              y1={eqPreview.zeroY}
              x2={EQ_PREVIEW_WIDTH}
              y2={eqPreview.zeroY}
              stroke={stripColor}
              strokeWidth={0.9}
              opacity={0.22}
            />
            <polygon
              points={`0,${eqPreview.zeroY.toFixed(2)} ${eqPreview.points} ${EQ_PREVIEW_WIDTH},${eqPreview.zeroY.toFixed(2)}`}
              fill={stripColor}
              opacity={eqPreviewState.enabled ? 0.22 : 0.1}
            />
            <polyline
              points={eqPreview.points}
              fill="none"
              stroke="var(--text-primary)"
              strokeWidth={1.4}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={eqPreviewState.enabled ? 0.95 : 0.62}
            />
            {!eqPreviewState.enabled && (
              <>
                <rect
                  x={0}
                  y={0}
                  width={EQ_PREVIEW_WIDTH}
                  height={EQ_PREVIEW_HEIGHT}
                  fill="rgba(0,0,0,0.48)"
                />
                <text
                  x={EQ_PREVIEW_WIDTH / 2}
                  y={EQ_PREVIEW_HEIGHT / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(241,245,249,0.95)"
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  EQ OFF
                </text>
              </>
            )}
          </svg>
        </div>
      )}

      {/* MUTE + SOLO buttons */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          width: "100%",
          paddingLeft: 0,
          paddingRight: 0,
          boxSizing: "border-box",
        }}
      >
        <button
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          style={{
            width: "100%",
            height: "32px",
            borderRadius: "8px",
            border: muted
              ? "2px solid var(--button-mute-border)"
              : "1px solid var(--button-default-border)",
            background: muted ? "var(--button-mute-bg)" : "var(--button-default-bg)",
            color: muted ? "var(--button-mute-text)" : "var(--button-default-text)",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.8px",
            padding: "0 4px",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            boxShadow: muted ? "var(--button-mute-glow)" : "none",
          }}
        >
          MUTE
        </button>

        <button
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSolo();
          }}
          style={{
            width: "100%",
            height: "32px",
            borderRadius: "8px",
            border: soloOn
              ? "2px solid var(--button-solo-border)"
              : "1px solid var(--button-default-border)",
            background: soloOn ? "var(--button-solo-bg)" : "var(--button-default-bg)",
            color: soloOn ? "var(--button-solo-text)" : "var(--button-default-text)",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.8px",
            padding: "0 4px",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            boxShadow: soloOn ? "var(--button-solo-glow)" : "none",
          }}
        >
          SOLO
        </button>
      </div>

      {/* Fader + Meter */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          gap: "clamp(12px, 3vw, 24px)",
          alignItems: "center",
          justifyContent: "center",
          flex: "1 1 0",
          minHeight: 0,
          width: "100%",
          alignSelf: "stretch",
          paddingLeft: 4,
          paddingRight: 4,
          boxSizing: "border-box",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {/* Meter */}
        <div
          style={{
            display: "flex",
            gap: 4,
            height: "100%",
            alignItems: "flex-end",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          <MeterScale clipped={clipped} />
          <MeterBar meterDb={meterDb} peakDb={peakDb} clipped={clipped} />
        </div>

        {/* Fader */}
        <div style={{ flex: "0 0 auto", height: "100%", display: "flex", alignItems: "center", overflow: "visible" }}>
          <VerticalFader
            value={faderPosition}
            height="100%"
            width={23}
            disabled={disabled}
            dragFromThumbOnly
            snapPoints={FADER_SNAP_POINTS}
            snapThreshold={1.8}
            zeroMarkerValue={dbToFaderScalePosition(0)}
            thumbVariant="default"
            onChange={onFaderChange}
          />
        </div>
      </div>

      {/* dB display */}
      <div
        style={{
          marginTop: 0,
          marginBottom: 0,
          width: "100%",
          alignSelf: "center",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: "16px",
          fontWeight: 400,
          color: "var(--text-primary)",
          backgroundColor: "var(--surface-overlay-strong)",
          borderRadius: "4px",
          overflow: "hidden",
          padding: "11px 4px",
          boxSizing: "border-box",
          fontFamily: "Inter, system-ui, sans-serif",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {faderDb <= -120 ? "-∞" : `${faderDb} dB`}
      </div>
      </div>

      {!isDetailVariant && (
        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (disabled || !canOpenDetail) return;
            onOpenDetail(fxNumber);
          }}
          style={{
            width: "100%",
            height: "40px",
            marginTop: 0,
            padding: "4px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: "3px",
            backgroundColor: stripColor,
            borderRadius: "0 0 4px 4px",
            boxSizing: "border-box",
            minHeight: "40px",
            cursor: disabled ? "not-allowed" : canOpenDetail ? "pointer" : "default",
            opacity: disabled ? 0.58 : 1,
            filter: disabled ? "saturate(0.55) brightness(0.82)" : "none",
          }}
        >
          <span
            style={{
              width: "100%",
              fontSize: "10px",
              lineHeight: "12px",
              fontWeight: 600,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              color: "rgba(0,0,0,0.7)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
          <span
            style={{
              width: "100%",
              fontSize: "16px",
              fontWeight: 700,
              color: "rgba(0,0,0,0.85)",
              lineHeight: "20px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </span>
        </div>
      )}
    </div>
  );
}
