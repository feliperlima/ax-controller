import { useMemo } from "react";
import { Knob } from "./Knob";
import { VerticalFader } from "./VerticalFader";
import { MeterBar, MeterScale } from "./Meter";
import { eqMagnitudeDb, type EqState } from "./ChannelProcessors";

type ChannelStripProps = {
  channel?: number;
  channelName?: string;
  section?: "inputs" | "aux" | "fx";
  variant?: "default" | "detail";
  isPairLinked?: boolean;
  muted: boolean;
  soloOn: boolean;
  phantomOn: boolean;
  phasePositive?: boolean;
  colorId: number;
  faderDb: number;
  faderPosition: number;
  pan: number;
  gain: number;
  meterDb: number;
  peakDb?: number;
  clipped: boolean;
  disabled?: boolean;
  eqState?: EqState;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onTogglePhantom: () => void;
  onTogglePhase?: () => void;
  onFaderChange: (value: number) => void;
  onPanChange: (value: number) => void;
  onGainChange: (value: number) => void;
  onFooterClick?: () => void;
  onOpenDetail?: (channel: number) => void;
};

function formatPan(value: number) {
  if (value === 100) return "C";
  if (value < 100) return `${100 - value}L`;
  return `${value - 100}R`;
}

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

function buildEqPreview(eq: EqState, width: number, height: number, pointCount = 40) {
  const maxDb = 12;
  const minDb = -24;
  const halfHeight = height / 2;
  const yForGain = (gain: number) => {
    const clamped = Math.max(minDb, Math.min(maxDb, gain));
    if (clamped >= 0) {
      return halfHeight - (clamped / maxDb) * halfHeight;
    }

    return halfHeight + (Math.abs(clamped) / Math.abs(minDb)) * halfHeight;
  };
  const zeroY = halfHeight;
  const points = Array.from({ length: pointCount }, (_, index) => {
    const ratio = pointCount <= 1 ? 0 : index / (pointCount - 1);
    const x = ratio * width;
    const freq = ratioToDisplayFreq(ratio);
    const gain = eqMagnitudeDb(freq, eq);
    return `${x.toFixed(2)},${yForGain(gain).toFixed(2)}`;
  }).join(" ");
  return { points, zeroY };
}

export function ChannelStrip({
  channel = 1,
  channelName,
  section,
  variant = "default",
  isPairLinked = false,
  muted,
  soloOn,
  phantomOn,
  phasePositive = true,
  colorId,
  faderDb,
  faderPosition,
  pan,
  gain,
  meterDb,
  peakDb,
  clipped,
  disabled = false,
  eqState,
  onToggleMute,
  onToggleSolo,
  onTogglePhantom,
  onTogglePhase,
  onFaderChange,
  onPanChange,
  onGainChange,
  onFooterClick,
  onOpenDetail,
}: ChannelStripProps) {
  const CHANNEL_COLOR_PALETTE: Record<number, string> = {
    0: "#7B7B7B",
    1: "var(--channel-01)",
    2: "var(--channel-02)",
    3: "var(--channel-03)",
    4: "var(--channel-04)",
    5: "var(--channel-05)",
    6: "var(--channel-06)",
    7: "var(--channel-07)",
    8: "var(--channel-08)",
    9: "var(--channel-09)",
    10: "var(--channel-10)",
    11: "var(--channel-11)",
    12: "var(--channel-12)",
  };

  const effectiveColorId = disabled ? 0 : colorId;
  const channelColor = CHANNEL_COLOR_PALETTE[effectiveColorId] ?? CHANNEL_COLOR_PALETTE[0];
  const channelPrefix = section === "aux" ? "AUX" : section === "fx" ? "FX" : "CH";
  const footerTitle = `${channelPrefix} ${channel}`;
  const footerName = channelName?.trim().length ? channelName.trim() : footerTitle;
  const eqPreview = useMemo(
    () => (eqState ? buildEqPreview(eqState, EQ_PREVIEW_WIDTH, EQ_PREVIEW_HEIGHT, 40) : null),
    [eqState]
  );
  const phaseInverted = !phasePositive;
  const canTogglePhase = typeof onTogglePhase === "function";
  const canOpenDetail = typeof onOpenDetail === "function";
  const isDetailVariant = variant === "detail";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        alignItems: "center",
        justifyContent: "flex-start",
        overflow: "hidden",
        padding: isDetailVariant ? "8px 4px" : 0,
        borderRadius: "4px",
        width: 110,
        minWidth: 110,
        height: "100%",
        backgroundColor: "var(--surface-card)",
        boxShadow: "0px 4px 2px rgba(0,0,0,0.25)",
        color: "var(--text-primary)",
        fontFamily: "system-ui, sans-serif",
        fontSize: "10px",
      }}
    >
      {!isDetailVariant && (
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            paddingTop: "8px",
            paddingLeft: "4px",
            paddingRight: "4px",
            paddingBottom: 0,
          }}
        >
          {eqState && eqPreview ? (
            <svg
              viewBox={`0 0 ${EQ_PREVIEW_WIDTH} ${EQ_PREVIEW_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              onClick={(event) => {
                if (!canOpenDetail) return;
                event.stopPropagation();
                onOpenDetail?.(channel);
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
                stroke={channelColor}
                strokeWidth={0.9}
                opacity={0.22}
              />
              <polygon
                points={`0,${eqPreview.zeroY.toFixed(2)} ${eqPreview.points} ${EQ_PREVIEW_WIDTH},${eqPreview.zeroY.toFixed(2)}`}
                fill={channelColor}
                opacity={eqState.enabled ? 0.22 : 0.1}
              />
              <polyline
                points={eqPreview.points}
                fill="none"
                stroke="var(--text-primary)"
                strokeWidth={1.4}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={eqState.enabled ? 0.95 : 0.62}
              />
              {!eqState.enabled && (
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
          ) : (
            <div
              onClick={(event) => {
                if (!canOpenDetail) return;
                event.stopPropagation();
                onOpenDetail?.(channel);
              }}
              style={{
                width: "100%",
                height: `${EQ_PREVIEW_HEIGHT}px`,
                backgroundColor: "rgba(0,0,0,0.8)",
                borderRadius: "4px",
                cursor: canOpenDetail ? "pointer" : "default",
              }}
              title={canOpenDetail ? "Open channel detail" : undefined}
            />
          )}
        </div>
      )}

      {/* Knobs: GAIN + PAN */}
      <div
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        style={{
          display: "flex",
          gap: "6px",
          alignItems: "flex-start",
          justifyContent: "space-between",
          width: "100%",
          paddingLeft: "4px",
          paddingRight: "4px",
          boxSizing: "border-box",
        }}
      >
        <Knob
          label="GAIN"
          variant="gain"
          value={gain}
          min={0}
          max={63}
          displayValue={`${gain}`}
          size={48}
          disabled={disabled}
          onChange={onGainChange}
        />

        <Knob
          label="PAN"
          variant="pan"
          value={pan}
          min={0}
          max={200}
          pixelsPerStep={2.5}
          displayValue={formatPan(pan)}
          size={48}
          disabled={disabled}
          onChange={onPanChange}
        />
      </div>

      {/* Buttons: 2x2 grid */}
      <div
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          width: "100%",
          paddingLeft: "4px",
          paddingRight: "4px",
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

        {section !== "aux" && (
          <>
            <button
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePhantom();
              }}
              style={{
                width: "100%",
                height: "32px",
                borderRadius: "8px",
                border: phantomOn
                  ? "2px solid var(--button-phantom-border)"
                  : "1px solid var(--button-default-border)",
                background: phantomOn ? "var(--button-phantom-bg)" : "var(--button-default-bg)",
                color: phantomOn ? "var(--button-phantom-text)" : "var(--button-default-text)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.8px",
                padding: "0 4px",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                boxShadow: phantomOn ? "var(--button-phantom-glow)" : "none",
              }}
            >
              +48V
            </button>

            <button
              disabled={disabled || !canTogglePhase}
              onClick={(e) => {
                e.stopPropagation();
                if (!canTogglePhase) return;
                onTogglePhase();
              }}
              style={{
                width: "100%",
                height: "32px",
                borderRadius: "8px",
                border: phaseInverted
                  ? "2px solid var(--button-phase-border)"
                  : "1px solid var(--button-default-border)",
                background: phaseInverted
                  ? "var(--button-phase-bg)"
                  : "var(--button-default-bg)",
                color: phaseInverted
                  ? "var(--button-phase-text)"
                  : "var(--button-default-text)",
                fontSize: "16px",
                fontWeight: 700,
                letterSpacing: 0,
                lineHeight: 1,
                padding: "0 4px",
                cursor: disabled || !canTogglePhase ? "not-allowed" : "pointer",
                opacity: disabled || !canTogglePhase ? 0.5 : 1,
                boxShadow: phaseInverted
                  ? "var(--button-phase-glow)"
                  : "none",
              }}
            >
              ∅
            </button>
          </>
        )}
      </div>

      {/* Fader + Meter */}
      <div
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        style={{
          display: "flex",
          gap: 0,
          alignItems: "center",
          justifyContent: "space-between",
          flex: "1 1 0",
          minHeight: 0,
          width: "calc(100% - 8px)",
          alignSelf: "stretch",
          paddingLeft: 0,
          paddingRight: 0,
          boxSizing: "border-box",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {/* Meter (Scale + Segments) */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            height: "100%",
            alignItems: "flex-end",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
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
            thumbIndicatorColor={isPairLinked ? "#fb923c" : undefined}
            onChange={onFaderChange}
          />
        </div>
      </div>

      {/* FaderDisplay (51:1390) */}
      <div
        style={{
          marginTop: "-16px",
          width: "calc(100% - 8px)",
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
          padding: "11px 29px",
          boxSizing: "border-box",
          fontFamily: "Inter, system-ui, sans-serif",
          fontStyle: "normal",
          lineHeight: 1,
          whiteSpace: "nowrap",
          opacity: muted ? 0.7 : 1,
        }}
      >
        {faderDb <= -120 ? "-∞" : `${faderDb} dB`}
      </div>

      {/* FooterChannel (51:1392) */}
      {!isDetailVariant && (
        <button
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            onFooterClick?.();
          }}
          onDoubleClick={(e) => {
            if (disabled || !canOpenDetail) return;
            e.stopPropagation();
            onOpenDetail(channel);
          }}
          style={{
            width: "100%",
            height: "40px",
            marginTop: "-16px",
            padding: "4px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: "3px",
            textAlign: "left",
            color: "var(--text-inverse)",
            backgroundColor: channelColor,
            border: "none",
            borderRadius: "0 0 4px 4px",
            cursor: disabled ? "not-allowed" : canOpenDetail ? "pointer" : "default",
            minHeight: "40px",
            fontFamily: "Inter, system-ui, sans-serif",
            fontStyle: "normal",
            opacity: disabled ? 0.58 : 1,
            filter: disabled ? "saturate(0.55) brightness(0.82)" : "none",
          }}
          title={canOpenDetail ? "Double click to open channel detail" : undefined}
        >
          <span
            style={{
              width: "100%",
              fontSize: "10px",
              lineHeight: "12px",
              fontWeight: 600,
              letterSpacing: "0.5px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {footerTitle}
          </span>
          <span
            style={{
              width: "100%",
              fontSize: "16px",
              lineHeight: "20px",
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {footerName}
          </span>
        </button>
      )}
    </div>
  );
}
