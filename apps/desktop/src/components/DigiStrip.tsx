import { useMemo, useRef } from "react";

const FOOTER_LONG_PRESS_MS = 450;
import { Knob } from "./Knob";
import { VerticalFader } from "./VerticalFader";
import { MeterBar, MeterScale } from "./Meter";
import { eqMagnitudeDb, type EqState } from "./ChannelProcessors";
import { stripColorForScope } from "./stripColor";

export type DigiStripProps = {
  variant?: "default" | "detail";
  channelName?: string;
  muted: boolean;
  soloOn: boolean;
  phasePositive?: boolean;
  colorId: number;
  faderDb: number;
  faderPosition: number;
  pan: number;
  meterDb: number;
  peakDb?: number;
  clipped: boolean;
  disabled?: boolean;
  eqState?: EqState;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onTogglePhase?: () => void;
  onFaderChange: (value: number) => void;
  onPanChange: (value: number) => void;
  onOpenDetail?: () => void;
  onOpenEditMenu?: () => void;
};

const EQ_PREVIEW_WIDTH = 78;
const EQ_PREVIEW_HEIGHT = 44;

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

function formatPan(value: number) {
  if (value === 100) return "C";
  if (value < 100) return `${100 - value}L`;
  return `${value - 100}R`;
}

export function DigiStrip({
  variant = "default",
  channelName,
  muted,
  soloOn,
  phasePositive = true,
  colorId,
  faderDb,
  faderPosition,
  pan,
  meterDb,
  peakDb,
  clipped,
  disabled = false,
  eqState,
  onToggleMute,
  onToggleSolo,
  onTogglePhase,
  onFaderChange,
  onPanChange,
  onOpenDetail,
  onOpenEditMenu,
}: DigiStripProps) {
  const channelColor = disabled ? stripColorForScope(0, "channel") : stripColorForScope(colorId, "channel");
  const eqPreview = useMemo(
    () => (eqState ? buildEqPreview(eqState, EQ_PREVIEW_WIDTH, EQ_PREVIEW_HEIGHT, 40) : null),
    [eqState]
  );
  const phaseInverted = !phasePositive;
  const canTogglePhase = typeof onTogglePhase === "function";
  const canOpenDetail = typeof onOpenDetail === "function";
  const canOpenEditMenu = typeof onOpenEditMenu === "function";
  const isDetailVariant = variant === "detail";

  const footerLongPressTimerRef = useRef<number | null>(null);
  const footerLongPressTriggeredRef = useRef(false);

  function clearFooterLongPress() {
    if (footerLongPressTimerRef.current !== null) {
      window.clearTimeout(footerLongPressTimerRef.current);
      footerLongPressTimerRef.current = null;
    }
  }

  const displayName = channelName && channelName.trim().length > 0 ? channelName : "DIGI";

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
          gap: "12px",
          padding: "6px 4px 6px",
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
            {eqState && eqPreview ? (
              <svg
                viewBox={`0 0 ${EQ_PREVIEW_WIDTH} ${EQ_PREVIEW_HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
                onClick={(event) => {
                  if (!canOpenDetail) return;
                  event.stopPropagation();
                  onOpenDetail?.();
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
                  onOpenDetail?.();
                }}
                style={{
                  width: "100%",
                  height: `${EQ_PREVIEW_HEIGHT}px`,
                  backgroundColor: "rgba(0,0,0,0.8)",
                  borderRadius: "4px",
                  cursor: canOpenDetail ? "pointer" : "default",
                }}
                title={canOpenDetail ? "Open detail" : undefined}
              />
            )}

          </div>
        )}

        {/* PAN knob centered */}
        <div
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <Knob
            label="PAN"
            variant="pan"
            value={pan}
            min={0}
            max={200}
            pixelsPerStep={2.5}
            displayValue={formatPan(pan)}
            size={40}
            disabled={disabled}
            onChange={onPanChange}
          />
        </div>

        {/* Buttons: 2x2 grid — MUTE | SOLO / PHASE | (empty) */}
        <div
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px",
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
              height: "28px",
              borderRadius: "8px",
              border: muted
                ? "2px solid var(--button-mute-border)"
                : "1px solid var(--button-default-border)",
              background: muted ? "var(--button-mute-bg)" : "var(--button-default-bg)",
              color: muted ? "var(--button-mute-text)" : "var(--button-default-text)",
              fontSize: "8px",
              fontWeight: 700,
              letterSpacing: "0.4px",
              padding: "0 2px",
              minWidth: 0,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              boxShadow: muted ? "var(--button-mute-glow)" : "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
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
              height: "28px",
              borderRadius: "8px",
              border: soloOn
                ? "2px solid var(--button-solo-border)"
                : "1px solid var(--button-default-border)",
              background: soloOn ? "var(--button-solo-bg)" : "var(--button-default-bg)",
              color: soloOn ? "var(--button-solo-text)" : "var(--button-default-text)",
              fontSize: "8px",
              fontWeight: 700,
              letterSpacing: "0.4px",
              padding: "0 2px",
              minWidth: 0,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              boxShadow: soloOn ? "var(--button-solo-glow)" : "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            SOLO
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
              height: "28px",
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
              boxShadow: phaseInverted ? "var(--button-phase-glow)" : "none",
            }}
          >
            ∅
          </button>

          <div />
        </div>

        {/* Fader + Meter */}
        <div
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            display: "flex",
            gap: "clamp(8px, 2vw, 14px)",
            alignItems: "center",
            justifyContent: "center",
            flex: "1 1 0",
            minHeight: 0,
            width: "100%",
            alignSelf: "stretch",
            paddingLeft: 2,
            paddingRight: 2,
            boxSizing: "border-box",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
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

          <div style={{ flex: "0 0 auto", height: "100%", display: "flex", alignItems: "center", overflow: "visible" }}>
            <VerticalFader
              value={faderPosition}
              height="100%"
              width={21}
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

        {/* Fader dB display */}
        <div
          style={{
            marginTop: 0,
            marginBottom: 0,
            width: "100%",
            alignSelf: "center",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontSize: "14px",
            fontWeight: 400,
            color: "var(--text-primary)",
            backgroundColor: "var(--surface-overlay-strong)",
            borderRadius: "4px",
            overflow: "hidden",
            padding: "8px 8px",
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
      </div>

      {!isDetailVariant && (
        <button
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            if (footerLongPressTriggeredRef.current) {
              footerLongPressTriggeredRef.current = false;
              return;
            }
            onOpenDetail?.();
          }}
          onPointerDown={(e) => {
            if (disabled || !canOpenEditMenu) return;
            e.stopPropagation();
            footerLongPressTriggeredRef.current = false;
            clearFooterLongPress();
            footerLongPressTimerRef.current = window.setTimeout(() => {
              footerLongPressTriggeredRef.current = true;
              onOpenEditMenu?.();
            }, FOOTER_LONG_PRESS_MS);
          }}
          onPointerUp={clearFooterLongPress}
          onPointerCancel={clearFooterLongPress}
          onPointerLeave={clearFooterLongPress}
          onDoubleClick={(e) => {
            if (disabled || !canOpenDetail) return;
            e.stopPropagation();
            clearFooterLongPress();
            onOpenDetail?.();
          }}
          style={{
            width: "100%",
            height: "36px",
            marginTop: 0,
            padding: "3px 4px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: "2px",
            textAlign: "left",
            color: "var(--text-inverse)",
            backgroundColor: channelColor,
            border: "none",
            borderRadius: "0 0 4px 4px",
            cursor: disabled ? "not-allowed" : canOpenDetail ? "pointer" : "default",
            minHeight: "36px",
            fontFamily: "Inter, system-ui, sans-serif",
            fontStyle: "normal",
            opacity: disabled ? 0.58 : 1,
            filter: disabled ? "saturate(0.55) brightness(0.82)" : "none",
          }}
          title={canOpenDetail || canOpenEditMenu ? "Double click to open detail. Long press to edit." : undefined}
        >
          <span
            style={{
              width: "100%",
              fontSize: "10px",
              lineHeight: "11px",
              fontWeight: 600,
              letterSpacing: "0.5px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            DIGI
          </span>
          <span
            style={{
              width: "100%",
              fontSize: "14px",
              lineHeight: "16px",
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </span>
        </button>
      )}
    </div>
  );
}
