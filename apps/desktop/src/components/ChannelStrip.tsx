import { useMemo, useRef } from "react";
import { Knob } from "./Knob";
import { VerticalFader } from "./VerticalFader";
import { MeterBar, MeterScale } from "./Meter";
import { eqMagnitudeDb, type EqState } from "./ChannelProcessors";
import { stripColorForScope, type StripColorScope } from "./stripColor";
import { useRawParamSelector } from "../hooks/useRawParamSelector";
import type { UniversalRawParamStore } from "../lib/universalRawParamStore";
import type { DomainSelectors } from "../lib/domainSelectors";

export type ChannelStripProps = {
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
  usbInputOn?: boolean;
  onToggleInputSource?: () => void;
  onFaderChange: (value: number) => void;
  onPanChange: (value: number) => void;
  onGainChange: (value: number) => void;
  onToggleLink?: () => void;
  linkButtonLabel?: string;
  onFooterClick?: () => void;
  onOpenDetail?: (channel: number) => void;
  onOpenEditMenu?: (channel: number) => void;
  rawParamStore?: UniversalRawParamStore;
  domainSelectors?: DomainSelectors;
};

const FOOTER_LONG_PRESS_MS = 450;

function formatPan(value: number) {
  if (value === 100) return "C";
  if (value < 100) return `${100 - value}L`;
  return `${value - 100}R`;
}

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
  usbInputOn = false,
  onToggleInputSource,
  onFaderChange,
  onPanChange,
  onGainChange,
  onToggleLink,
  linkButtonLabel,
  onFooterClick,
  onOpenDetail,
  onOpenEditMenu,
  rawParamStore,
  domainSelectors,
}: ChannelStripProps) {
  const storeStrip = useRawParamSelector(
    rawParamStore ?? null,
    (store) => {
      void store;
      return domainSelectors?.selectChannelStrip(channel) ?? null;
    },
    (prev, next) =>
      prev?.fader?.rawValue === next?.fader?.rawValue &&
      prev?.mute?.rawValue === next?.mute?.rawValue &&
      prev?.solo?.soloOn === next?.solo?.soloOn &&
      prev?.pan?.rawValue === next?.pan?.rawValue
  );

  const activeFaderDb = storeStrip?.fader?.db ?? faderDb;
  const activeFaderPosition = storeStrip?.fader?.position ?? faderPosition;
  const activeMuted = storeStrip?.mute?.muted ?? muted;
  const activeSoloOn = storeStrip?.solo?.soloOn ?? soloOn;
  const activePan = storeStrip?.pan?.pan ?? pan;

  const colorScope: StripColorScope = section === "aux" ? "aux" : section === "fx" ? "fx" : "channel";
  const channelColor = disabled ? stripColorForScope(0, "channel") : stripColorForScope(colorId, colorScope);
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
  const canOpenEditMenu = typeof onOpenEditMenu === "function";
  const canToggleLink = typeof onToggleLink === "function" && Boolean(linkButtonLabel);
  const canToggleInputSource = typeof onToggleInputSource === "function" && section === "inputs";
  const isDetailVariant = variant === "detail";
  const footerLongPressTimerRef = useRef<number | null>(null);
  const footerLongPressTriggeredRef = useRef(false);

  function clearFooterLongPress() {
    if (footerLongPressTimerRef.current !== null) {
      window.clearTimeout(footerLongPressTimerRef.current);
      footerLongPressTimerRef.current = null;
    }
  }

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

      {canToggleInputSource && (
        <div
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            width: "100%",
            paddingLeft: 0,
            paddingRight: 0,
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onToggleInputSource?.();
            }}
            style={{
              height: 28,
              width: "100%",
              borderRadius: 8,
              border: usbInputOn ? "1px solid #22d3ee" : "1px solid #facc15",
              background: usbInputOn
                ? "linear-gradient(180deg, rgba(34,211,238,0.2) 0%, rgba(14,116,144,0.26) 100%)"
                : "linear-gradient(180deg, rgba(250,204,21,0.2) 0%, rgba(161,98,7,0.26) 100%)",
              color: "#e2e8f0",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.09em",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.55 : 1,
              boxShadow: usbInputOn
                ? "0 0 12px rgba(34,211,238,0.18)"
                : "0 0 12px rgba(250,204,21,0.18)",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "999px",
                background: usbInputOn ? "#22d3ee" : "#facc15",
                boxShadow: usbInputOn
                  ? "0 0 7px rgba(34,211,238,0.5)"
                  : "0 0 7px rgba(250,204,21,0.5)",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 10, lineHeight: "10px" }}>
              {usbInputOn ? "USB" : "INPUT"}
            </span>
          </button>
        </div>
      )}

      {canToggleLink && (
        <div
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            width: "100%",
            paddingLeft: 0,
            paddingRight: 0,
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onToggleLink?.();
            }}
            style={{
              width: "100%",
              height: "28px",
              borderRadius: "8px",
              border: isPairLinked ? "1px solid #67e8f9" : "1px solid #334155",
              background: isPairLinked ? "#164e63" : "#0f172a",
              color: isPairLinked ? "#f0fdff" : "#64748b",
              fontWeight: 900,
              fontSize: "8px",
              letterSpacing: "0.04em",
              padding: "0 2px",
              minWidth: 0,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              boxShadow: isPairLinked ? "0 0 8px rgba(103,232,249,0.35)" : "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {`LINK ${linkButtonLabel}`}
          </button>
        </div>
      )}

      {/* Knobs: GAIN + PAN */}
      <div
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        style={{
          display: "flex",
          gap: "6px",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          paddingLeft: "0px",
          paddingRight: "0px",
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
          size={40}
          disabled={disabled}
          onChange={onGainChange}
        />

        <Knob
          label="PAN"
          variant="pan"
          value={activePan}
          min={0}
          max={200}
          pixelsPerStep={2.5}
          displayValue={formatPan(pan)}
          size={40}
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
            border: activeMuted
              ? "2px solid var(--button-mute-border)"
              : "1px solid var(--button-default-border)",
            background: activeMuted ? "var(--button-mute-bg)" : "var(--button-default-bg)",
            color: activeMuted ? "var(--button-mute-text)" : "var(--button-default-text)",
            fontSize: "8px",
            fontWeight: 700,
            letterSpacing: "0.4px",
            padding: "0 2px",
            minWidth: 0,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            boxShadow: activeMuted ? "var(--button-mute-glow)" : "none",
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
            border: activeSoloOn
              ? "2px solid var(--button-solo-border)"
              : "1px solid var(--button-default-border)",
            background: activeSoloOn ? "var(--button-solo-bg)" : "var(--button-default-bg)",
            color: activeSoloOn ? "var(--button-solo-text)" : "var(--button-default-text)",
            fontSize: "8px",
            fontWeight: 700,
            letterSpacing: "0.4px",
            padding: "0 2px",
            minWidth: 0,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            boxShadow: activeSoloOn ? "var(--button-solo-glow)" : "none",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
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
                height: "28px",
                borderRadius: "8px",
                border: phantomOn
                  ? "2px solid var(--button-phantom-border)"
                  : "1px solid var(--button-default-border)",
                background: phantomOn ? "var(--button-phantom-bg)" : "var(--button-default-bg)",
                color: phantomOn ? "var(--button-phantom-text)" : "var(--button-default-text)",
                fontSize: "8px",
                fontWeight: 700,
                letterSpacing: "0.4px",
                padding: "0 2px",
                minWidth: 0,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                boxShadow: phantomOn ? "var(--button-phantom-glow)" : "none",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
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
            value={activeFaderPosition}
            height="100%"
            width={21}
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
          opacity: activeMuted ? 0.7 : 1,
        }}
      >
        {activeFaderDb <= -120 ? "-∞" : `${activeFaderDb} dB`}
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
            onFooterClick?.();
          }}
          onPointerDown={(e) => {
            if (disabled || !canOpenEditMenu) return;
            e.stopPropagation();
            footerLongPressTriggeredRef.current = false;
            clearFooterLongPress();
            footerLongPressTimerRef.current = window.setTimeout(() => {
              footerLongPressTriggeredRef.current = true;
              onOpenEditMenu?.(channel);
            }, FOOTER_LONG_PRESS_MS);
          }}
          onPointerUp={() => {
            clearFooterLongPress();
          }}
          onPointerCancel={() => {
            clearFooterLongPress();
          }}
          onPointerLeave={() => {
            clearFooterLongPress();
          }}
          onDoubleClick={(e) => {
            if (disabled || !canOpenDetail) return;
            e.stopPropagation();
            clearFooterLongPress();
            onOpenDetail(channel);
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
            {footerTitle}
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
            {footerName}
          </span>
        </button>
      )}
    </div>
  );
}
