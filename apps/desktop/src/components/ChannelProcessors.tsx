import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Knob } from "./Knob";
import { MeterBar, MeterScale } from "./Meter";
import { VerticalFader } from "./VerticalFader";
import { stripColorForScope } from "./stripColor";
import { useCompressorMeters } from "../hooks/useCompressorMeters";
import { useGateMeters } from "../hooks/useGateMeters";

export type GateState = {
  enabled: boolean;
  threshold: number;
  attack: number;
  decay: number;
  hold: number;
};

export type CompressorState = {
  enabled: boolean;
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  gain: number;
};

export type EqBandState = {
  enabled: boolean;
  freq: number;
  gain: number;
  q: number;
};

export type FilterType = "butterworth" | "bessel" | "linkwitz";
export type FilterSlope = 12 | 24;

export type EqState = {
  enabled: boolean;
  hpfEnabled: boolean;
  hpfType: FilterType;
  hpfSlope: FilterSlope;
  hpfFreq: number;
  lpfEnabled: boolean;
  lpfType: FilterType;
  lpfSlope: FilterSlope;
  lpfFreq: number;
  bands: EqBandState[];
};

export type ProcessorState = {
  gate: GateState;
  comp: CompressorState;
  eq: EqState;
};

export type ProcessorModule = "gate" | "comp" | "eq" | "sends" | "delay" | "presets";

export type SendStripId = string;

export type SendTapPoint = "pre" | "post";

export type SendStripView = {
  id: SendStripId;
  type: "fx" | "aux" | "channel" | "master";
  colorId: number;
  label: string;
  name: string;
  contextLabel?: string;
  value: number;
  tapPoint: SendTapPoint;
  isLinked: boolean;
};

type ChannelProcessorsProps = {
  activeModule: ProcessorModule;
  state: ProcessorState;
  disabled?: boolean;
  hideComp?: boolean;
  // Hide the compressor GR/OUT meter bars (AUX/MASTER — desk has no real post-comp data there).
  hideCompMeters?: boolean;
  hideGate?: boolean;
  hideSends?: boolean;
  hideModuleTabs?: boolean;
  moduleItems?: Array<{ id: ProcessorModule; label: string }>;
  customModuleContent?: Partial<Record<ProcessorModule, ReactNode>>;
  channelInputDb?: number;
  sends?: SendStripView[];
  onModuleChange: (module: ProcessorModule) => void;
  onGateChange: (patch: Partial<GateState>) => void;
  onCompChange: (patch: Partial<CompressorState>) => void;
  onEqChange: (patch: Partial<EqState>) => void;
  onEqBandChange: (band: number, patch: Partial<EqBandState>) => void;
  onSendValueChange?: (id: SendStripId, nextValue: number) => void;
  onSendTapPointToggle?: (id: SendStripId) => void;
  onResetGate: () => void;
  onResetComp: () => void;
  onResetEq: () => void;
};

const SEND_FADER_DB_POINTS = [
  { pos: 0, db: -120 },
  { pos: 10, db: -50 },
  { pos: 25, db: -30 },
  { pos: 45, db: -20 },
  { pos: 65, db: -10 },
  { pos: 80, db: -5 },
  { pos: 100, db: 0 },
];

const SEND_FADER_SNAP_POINTS_DB = [-50, -40, -30, -20, -10, -5, 0];
const SEND_FADER_SNAP_POINTS = SEND_FADER_SNAP_POINTS_DB.map((db) =>
  sendDbToFaderPosition(db)
);
const SEND_FADER_MARKS_DB = [-50, -40, -30, -20, -10, -5, 0];
const SEND_FADER_THUMB_HEIGHT = 50;
const SEND_FADER_THUMB_HALF = SEND_FADER_THUMB_HEIGHT / 2;
const SEND_FADER_TRACK_WIDTH = 23;
const SEND_MARKER_WIDTH = 8;
const SEND_MARKER_GAP = 2;
const SEND_MARKER_OUTSIDE_OFFSET = SEND_FADER_TRACK_WIDTH / 2 + SEND_MARKER_GAP;
const SEND_FADER_RENDERED_WIDTH =
  SEND_FADER_TRACK_WIDTH + (SEND_MARKER_GAP + SEND_MARKER_WIDTH) * 2;
const SENDS_RIGHT_BLEED_PX = 24;
const SENDS_RIGHT_END_GUTTER_PX = 24;

type SendsDragScrollState = {
  pointerId: number | null;
  pointerType: "mouse" | "touch" | "pen" | "";
  scrollerElement: HTMLElement | null;
  startX: number;
  startY: number;
  startScrollLeft: number;
  startAtMs: number;
  dragging: boolean;
  suppressClick: boolean;
};

function getDragScrollProfile(pointerType: "mouse" | "touch" | "pen" | "") {
  if (pointerType === "mouse") {
    return {
      holdMs: 0,
      thresholdPx: 2,
      horizontalBias: 1,
    };
  }

  if (pointerType === "pen") {
    return {
      holdMs: 0,
      thresholdPx: 3,
      horizontalBias: 1.02,
    };
  }

  return {
    holdMs: 8,
    thresholdPx: 4,
    horizontalBias: 1.04,
  };
}

function shouldPrioritizeLocalControl(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  if (
    target.closest(
      "button, input, select, textarea, label, a, [role='button'], [data-drag-scroll-priority='control'], [data-drag-scroll-priority='thumb']"
    )
  ) {
    return true;
  }

  const sliderElement = target.closest("[role='slider']");
  if (!sliderElement) return false;

  const thumbOnlySlider =
    sliderElement.getAttribute("data-thumb-only-drag") === "true";

  if (thumbOnlySlider) {
    return Boolean(target.closest("[data-drag-scroll-priority='thumb']"));
  }

  return true;
}

function sendMarkTop(db: number) {
  const pos = sendDbToFaderPosition(db);
  return `calc(${SEND_FADER_THUMB_HALF}px + ${(100 - pos) / 100} * (100% - ${SEND_FADER_THUMB_HEIGHT}px))`;
}

function sendValueToDb(value: number) {
  if (value <= 0) return -120;
  return Math.max(-120, Math.min(0, (Math.round(value) - 1200) / 10));
}

function sendDbToValue(db: number | "-inf") {
  if (db === "-inf") return 0;
  const clamped = Math.max(-120, Math.min(0, db));
  if (clamped <= -120) return 0;
  return Math.round(1200 + clamped * 10);
}

function sendDbToFaderPosition(db: number) {
  for (let i = 0; i < SEND_FADER_DB_POINTS.length - 1; i++) {
    const current = SEND_FADER_DB_POINTS[i];
    const next = SEND_FADER_DB_POINTS[i + 1];

    if (db >= current.db && db <= next.db) {
      const t = (db - current.db) / (next.db - current.db);
      return current.pos + t * (next.pos - current.pos);
    }
  }

  return db <= -120 ? 0 : 100;
}

function sendFaderPositionToDb(position: number) {
  const clamped = Math.max(0, Math.min(100, position));

  for (let i = 0; i < SEND_FADER_DB_POINTS.length - 1; i++) {
    const current = SEND_FADER_DB_POINTS[i];
    const next = SEND_FADER_DB_POINTS[i + 1];

    if (clamped >= current.pos && clamped <= next.pos) {
      const t = (clamped - current.pos) / (next.pos - current.pos);
      return current.db + t * (next.db - current.db);
    }
  }

  return clamped <= 0 ? -120 : 0;
}

function formatSendDb(value: number) {
  if (value <= 0) return "-∞";
  const db = sendValueToDb(value);
  return `${db > 0 ? "+" : ""}${db.toFixed(1)} dB`;
}

function getSendStripFooterColor(send: SendStripView) {
  if (send.type === "fx") return stripColorForScope(send.colorId, "fx");
  if (send.type === "aux") return stripColorForScope(send.colorId, "aux");
  if (send.type === "master") return stripColorForScope(send.colorId, "master");
  return stripColorForScope(send.colorId, "channel");
}

function SendsEditor({
  sends,
  disabled,
  onSendValueChange,
  onSendTapPointToggle,
}: {
  sends: SendStripView[];
  disabled?: boolean;
  onSendValueChange?: (id: SendStripId, nextValue: number) => void;
  onSendTapPointToggle?: (id: SendStripId) => void;
}) {
  const groupedSends = {
    fx: sends.filter((send) => send.type === "fx"),
    aux: sends.filter((send) => send.type === "aux"),
    channel: sends.filter((send) => send.type === "channel"),
    master: sends.filter((send) => send.type === "master"),
  };
  const visibleGroups = (["fx", "aux", "channel", "master"] as const)
    .map((type) => ({ type, sends: groupedSends[type] }))
    .filter((group) => group.sends.length > 0);
  const dragStateRef = useRef<SendsDragScrollState>({
    pointerId: null,
    pointerType: "",
    scrollerElement: null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startAtMs: 0,
    dragging: false,
    suppressClick: false,
  });
  const dragScrollRafRef = useRef<number | null>(null);
  const pendingDragScrollLeftRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (dragScrollRafRef.current !== null) {
        cancelAnimationFrame(dragScrollRafRef.current);
        dragScrollRafRef.current = null;
      }

      pendingDragScrollLeftRef.current = null;
    };
  }, []);

  function scheduleDragScrollLeft(scrollerElement: HTMLElement, scrollLeft: number) {
    pendingDragScrollLeftRef.current = scrollLeft;

    if (dragScrollRafRef.current !== null) {
      return;
    }

    dragScrollRafRef.current = requestAnimationFrame(() => {
      dragScrollRafRef.current = null;
      const nextScrollLeft = pendingDragScrollLeftRef.current;
      pendingDragScrollLeftRef.current = null;
      if (nextScrollLeft === null) return;

      scrollerElement.scrollLeft = nextScrollLeft;
    });
  }

  function resetDragScrollState() {
    if (dragScrollRafRef.current !== null) {
      cancelAnimationFrame(dragScrollRafRef.current);
      dragScrollRafRef.current = null;
    }

    pendingDragScrollLeftRef.current = null;
    dragStateRef.current.pointerId = null;
    dragStateRef.current.pointerType = "";
    dragStateRef.current.scrollerElement = null;
    dragStateRef.current.startX = 0;
    dragStateRef.current.startY = 0;
    dragStateRef.current.startScrollLeft = 0;
    dragStateRef.current.startAtMs = 0;
    dragStateRef.current.dragging = false;
  }

  function handleSendsPointerDownCapture(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (shouldPrioritizeLocalControl(event.target)) return;

    dragStateRef.current.pointerId = event.pointerId;
    dragStateRef.current.pointerType =
      event.pointerType === "mouse" ||
      event.pointerType === "touch" ||
      event.pointerType === "pen"
        ? event.pointerType
        : "touch";
    dragStateRef.current.startX = event.clientX;
    dragStateRef.current.startY = event.clientY;
    dragStateRef.current.scrollerElement = event.currentTarget;
    dragStateRef.current.startScrollLeft = event.currentTarget.scrollLeft;
    dragStateRef.current.startAtMs = Date.now();
    dragStateRef.current.dragging = false;
    dragStateRef.current.suppressClick = false;
  }

  function handleSendsPointerMoveCapture(event: React.PointerEvent<HTMLElement>) {
    if (dragStateRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;

    if (!dragStateRef.current.dragging) {
      const profile = getDragScrollProfile(dragStateRef.current.pointerType);
      const holdElapsed =
        Date.now() - dragStateRef.current.startAtMs >= profile.holdMs;
      const passedThreshold = Math.abs(deltaX) >= profile.thresholdPx;
      const horizontalIntent =
        Math.abs(deltaX) > Math.abs(deltaY) * profile.horizontalBias;

      if (!(holdElapsed && passedThreshold && horizontalIntent)) return;

      dragStateRef.current.dragging = true;
      dragStateRef.current.suppressClick = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    const scrollerElement =
      dragStateRef.current.scrollerElement ?? event.currentTarget;
    scheduleDragScrollLeft(
      scrollerElement,
      dragStateRef.current.startScrollLeft - deltaX
    );
  }

  function handleSendsPointerUpCapture(event: React.PointerEvent<HTMLElement>) {
    if (dragStateRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetDragScrollState();
  }

  function handleSendsPointerCancelCapture(event: React.PointerEvent<HTMLElement>) {
    if (dragStateRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetDragScrollState();
  }

  function handleSendsClickCapture(event: React.MouseEvent<HTMLElement>) {
    if (!dragStateRef.current.suppressClick) return;

    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current.suppressClick = false;
  }

  function renderSendStrip(send: SendStripView) {
    const faderDb = sendValueToDb(send.value);
    const position = sendDbToFaderPosition(faderDb);
    const auxNumber = send.type === "aux" ? Number(send.id.replace("aux", "")) : 0;
    const channelNumber = send.type === "channel" ? Number(send.id.replace("ch", "")) : 0;
    const isLinkedPairLeader =
      send.isLinked &&
      ((send.type === "aux" && auxNumber % 2 === 1) ||
        (send.type === "channel" && channelNumber % 2 === 1));
    const footerColor = getSendStripFooterColor(send);

    return (
      <div
        key={send.id}
        style={{
          width: "var(--strip-width)",
          minWidth: "var(--strip-width)",
          height: "100%",
          position: "relative",
          zIndex: isLinkedPairLeader ? 3 : 1,
        }}
      >
        {isLinkedPairLeader && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              bottom: 40,
              transform: "translateY(2px)",
              width: 224,
              height: 4,
              borderRadius: "1px",
              background: "#fb923c",
              boxShadow: "0 0 8px rgba(251,146,60,0.5)",
              pointerEvents: "none",
              zIndex: 8,
            }}
          />
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: "4px",
            width: "var(--strip-width)",
            minWidth: "var(--strip-width)",
            height: "100%",
            backgroundColor: "var(--surface-panel-raised)",
            boxShadow: "0px 4px 2px rgba(0,0,0,0.25)",
            color: "var(--text-primary)",
            fontFamily: "system-ui, sans-serif",
            fontSize: "10px",
            position: "relative",
            padding: 0,
            boxSizing: "border-box",
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
            <div
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
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
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSendTapPointToggle?.(send.id);
                }}
                disabled={disabled}
                style={{
                  height: 32,
                  width: "100%",
                  borderRadius: 8,
                  border:
                    send.tapPoint === "post"
                      ? "1px solid #22d3ee"
                      : "1px solid #facc15",
                  background:
                    send.tapPoint === "post"
                      ? "linear-gradient(180deg, rgba(34,211,238,0.2) 0%, rgba(14,116,144,0.26) 100%)"
                      : "linear-gradient(180deg, rgba(250,204,21,0.2) 0%, rgba(161,98,7,0.26) 100%)",
                  color: "#e2e8f0",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  textTransform: "none",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.55 : 1,
                  boxShadow:
                    send.tapPoint === "post"
                      ? "0 0 12px rgba(34,211,238,0.18)"
                      : "0 0 12px rgba(250,204,21,0.18)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "999px",
                    background: send.tapPoint === "post" ? "#22d3ee" : "#facc15",
                    boxShadow:
                      send.tapPoint === "post"
                        ? "0 0 7px rgba(34,211,238,0.5)"
                        : "0 0 7px rgba(250,204,21,0.5)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, lineHeight: "11px" }}>
                  {send.tapPoint === "post" ? "Post" : "Pre"}
                </span>
              </button>
            </div>

            <div
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
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
              <div style={{ flex: "0 0 auto", height: "100%", display: "flex", alignItems: "center", overflow: "visible" }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: SEND_FADER_RENDERED_WIDTH,
                    height: "100%",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  {SEND_FADER_MARKS_DB.map((db) => {
                    const isZero = db === 0;
                    const baseStyle = {
                      position: "absolute" as const,
                      top: sendMarkTop(db),
                      width: SEND_MARKER_WIDTH,
                      height: 1,
                      borderRadius: 999,
                      transform: "translateY(-50%)",
                      pointerEvents: "none" as const,
                      background: isZero ? "var(--fader-thumb-line)" : "#64748b",
                      opacity: isZero ? 0.95 : 0.42,
                      boxShadow: isZero ? "0 0 2px rgba(241,245,249,0.7)" : "none",
                    };

                    return (
                      <div key={`send-mark-${db}`}>
                        <span
                          style={{
                            ...baseStyle,
                            left: `calc(50% - ${SEND_MARKER_OUTSIDE_OFFSET + SEND_MARKER_WIDTH}px)`,
                          }}
                        />
                        <span
                          style={{
                            ...baseStyle,
                            left: `calc(50% + ${SEND_MARKER_OUTSIDE_OFFSET}px)`,
                          }}
                        />
                      </div>
                    );
                  })}

                  <VerticalFader
                    value={position}
                    height="100%"
                    width={SEND_FADER_TRACK_WIDTH}
                    disabled={disabled}
                    dragFromThumbOnly
                    snapPoints={SEND_FADER_SNAP_POINTS}
                    snapThreshold={1.8}
                    zeroMarkerValue={sendDbToFaderPosition(0)}
                    showZeroMarker={false}
                    thumbVariant="default"
                    thumbIndicatorColor={send.isLinked ? "#fb923c" : undefined}
                    onChange={(nextPosition) => {
                      const nextDb = sendFaderPositionToDb(nextPosition);
                      const nextValue = sendDbToValue(nextDb);
                      onSendValueChange?.(send.id, nextValue);
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 0,
                width: "100%",
                alignSelf: "center",
                marginBottom: 0,
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
              {formatSendDb(send.value)}
            </div>
          </div>

          <div
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
              textAlign: "left",
              color: "var(--text-inverse)",
              backgroundColor: footerColor,
              border: "none",
              borderRadius: "0 0 4px 4px",
              minHeight: "40px",
              fontFamily: "Inter, system-ui, sans-serif",
              boxSizing: "border-box",
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
              {send.label}
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
              title={send.name}
            >
              {send.name}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: 0,
        height: "100%",
        borderRadius: 4,
        border: "none",
        background: "transparent",
        overflowX: "hidden",
        overflowY: "hidden",
        display: "grid",
        gridTemplateRows: "minmax(0, 1fr)",
      }}
    >
      <div
        onPointerDownCapture={handleSendsPointerDownCapture}
        onPointerMoveCapture={handleSendsPointerMoveCapture}
        onPointerUpCapture={handleSendsPointerUpCapture}
        onPointerCancelCapture={handleSendsPointerCancelCapture}
        onClickCapture={handleSendsClickCapture}
        style={{
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: 0,
          WebkitOverflowScrolling: "touch",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          cursor: "grab",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 0,
            minHeight: "100%",
            alignItems: "stretch",
            width: "max-content",
            minWidth: "100%",
          }}
        >
          {visibleGroups.map((group, index) => (
            <div key={group.type} style={{ display: "contents" }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${group.sends.length}, 110px)`, gap: 4 }}>
                {group.sends.map((send) => renderSendStrip(send))}
              </div>

              {index < visibleGroups.length - 1 && (
                <div
                  aria-hidden="true"
                  style={{
                    width: 1,
                    alignSelf: "stretch",
                    margin: "0 8px",
                    background: "#334155",
                  }}
                />
              )}
            </div>
          ))}

          <div
            aria-hidden="true"
            style={{
              flex: `0 0 ${SENDS_RIGHT_END_GUTTER_PX}px`,
              width: SENDS_RIGHT_END_GUTTER_PX,
            }}
          />
        </div>
      </div>
    </div>
  );
}


function GateMiniPreview({ gate }: { gate: GateState }) {
  const W = 84, H = 56;
  const pad = 4;
  const gW = W - pad * 2;
  const gH = H - pad * 2;
  const tY = pad + ((0 - Math.max(-80, Math.min(0, gate.threshold))) / 80) * gH;
  const attackWidth = 8 + ((clamp(gate.attack, 3, 200) - 3) / (200 - 3)) * (gW * 0.32);
  const holdWidth = 6 + (clamp(gate.hold, 0, 530) / 530) * (gW * 0.36);
  const decayWidthByStep: Record<number, number> = { 2: gW * 0.07, 4: gW * 0.09, 6: gW * 0.12, 8: gW * 0.16, 16: gW * 0.24, 32: gW * 0.32 };
  const decayWidth = decayWidthByStep[snapGateDecay(gate.decay)] ?? gW * 0.09;

  const envStartX = pad + gW * 0.06;
  const attackEndX = clamp(envStartX + attackWidth, pad + gW * 0.14, pad + gW * 0.72);
  const holdEndX = clamp(attackEndX + holdWidth, attackEndX + gW * 0.05, pad + gW * 0.84);
  const decayEndX = clamp(holdEndX + decayWidth, holdEndX + gW * 0.05, pad + gW * 0.96);
  const envEndX = pad + gW;
  const envBottomY = pad + gH * 0.92;
  const envD = `M ${envStartX} ${envBottomY} L ${attackEndX} ${tY} L ${holdEndX} ${tY} L ${decayEndX} ${envBottomY} L ${envEndX} ${envBottomY}`;
  const fillD = `${envD} L ${envEndX} ${H} L ${envStartX} ${H} Z`;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" fill="none">
      <rect width={W} height={H} rx={4} fill="#020409" />
      <path d={fillD} fill="#22c55e" opacity={0.16} />
      <path d={envD} stroke="#f8fafc" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CompMiniPreview({ comp }: { comp: CompressorState }) {
  const W = 84, H = 56;
  const pad = 4;
  const gW = W - pad * 2;
  const gH = H - pad * 2;
  const dbMin = -60, dbMax = 0, dbRange = 60;
  const xDb = (db: number) => pad + ((db - dbMin) / dbRange) * gW;
  const yDb = (db: number) => pad + ((dbMax - db) / dbRange) * gH;
  const threshold = Math.max(-60, Math.min(0, comp.threshold));
  const ratio = comp.ratio >= 40 ? 40 : comp.ratio;
  const outputAtMax = threshold + (dbMax - threshold) / Math.max(1, ratio);
  const tX = xDb(threshold);
  const tY = yDb(threshold);
  const eX = xDb(dbMax);
  const eY = yDb(outputAtMax);
  const oX = xDb(dbMin);
  const oY = yDb(dbMin);
  const curvePts = `${oX},${oY} ${tX},${tY} ${eX},${eY}`;
  const fillPts = `${oX},${oY} ${tX},${tY} ${eX},${eY} ${eX},${pad + gH} ${oX},${pad + gH}`;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" fill="none">
      <rect width={W} height={H} rx={4} fill="#020409" />
      <polygon points={fillPts} fill="#fbbf24" opacity={0.13} />
      <polyline points={curvePts} stroke="#f8fafc" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EqMiniPreview({ eq }: { eq: EqState }) {
  const W = 84, H = 56;
  const minDb = -24, maxDb = 12;
  const yGain = (gain: number) =>
    ((maxDb - Math.max(minDb, Math.min(maxDb, gain))) / (maxDb - minDb)) * H;
  const minLog = Math.log10(20);
  const maxLog = Math.log10(20000);
  const pointCount = 36;
  const pts = Array.from({ length: pointCount }, (_, i) => {
    const r = i / (pointCount - 1);
    const freq = 10 ** (minLog + r * (maxLog - minLog));
    return `${(r * W).toFixed(1)},${yGain(eqMagnitudeDb(freq, eq)).toFixed(1)}`;
  }).join(" ");
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" fill="none">
      <rect width={W} height={H} rx={4} fill="#020409" />
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="#0ea5e9" opacity={0.15} />
      <polyline points={pts} stroke="#f8fafc" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const EQ_COLORS = {
  hpf: "var(--primitive-neutral-300)",
  lpf: "var(--primitive-neutral-300)",
  bands: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#38bdf8", "#a855f7", "#14b8a6"],
};
const CHART_THEME = {
  graphBackground: "#020409",
  graphPanel: "#030712",
  graphBorder: "#1f2937",
  gridMajor: "rgba(255,255,255,0.22)",
  gridMinor: "rgba(255,255,255,0.10)",
  gridZero: "rgba(248,250,252,0.72)",
  axisLabel: "#94a3b8",
  curveStroke: "#f8fafc",
  curveFill: "#e2e8f0",
  handleText: "#ffffff",
};
const PROCESSOR_GRAPH_RECT = {
  left: 48,
  top: 32,
  right: 48,
  bottom: 32,
};
const PROCESSOR_AXIS_LABEL_OFFSETS = {
  side: 14,
  bottom: 8,
};
const ZERO_DB_GRID_LINE_COLOR = "rgba(248,250,252,0.125)";
const ZERO_DB_GRID_LINE_WIDTH = "1.1";
const HANDLE_THEME = {
  threshold: "#d946ef",
  ratio: "#94a3b8",
  idleStroke: "#020617",
};
const GATE_THEME = {
  primary: "#22c55e",
  primarySoft: "#4ade80",
  fill: "#14532d",
};
const MODULE_ACCENTS: Record<ProcessorModule, { color: string; glow: string }> = {
  gate: { color: "#22c55e", glow: "rgba(34,197,94,0.35)" },
  comp: { color: "#a855f7", glow: "rgba(168,85,247,0.35)" },
  eq: { color: "#22d3ee", glow: "rgba(34,211,238,0.35)" },
  sends: { color: "#22d3ee", glow: "rgba(34,211,238,0.35)" },
  delay: { color: "#f59e0b", glow: "rgba(245,158,11,0.35)" },
  presets: { color: "#a78bfa", glow: "rgba(167,139,250,0.35)" },
};
const EQ_ACTIVE_MIN_FREQ = 20;
const EQ_ACTIVE_MAX_FREQ = 20000;
const EQ_DISPLAY_MIN_FREQ = 10;
const EQ_DISPLAY_MAX_FREQ = 24000;
type EqSelection = "hpf" | "lpf" | number | null;

function getEqBandColor(index: number) {
  return EQ_COLORS.bands[index] ?? `hsl(${(index * 47) % 360} 82% 56%)`;
}

function getEqNodeButtons(bandCount: number): { id: EqSelection; label: string; color: string }[] {
  const buttons: { id: EqSelection; label: string; color: string }[] = [
    { id: "hpf", label: "HPF", color: EQ_COLORS.hpf },
  ];

  for (let band = 1; band <= bandCount; band++) {
    buttons.push({
      id: band,
      label: String(band),
      color: getEqBandColor(band - 1),
    });
  }

  buttons.push({ id: "lpf", label: "LPF", color: EQ_COLORS.lpf });

  return buttons;
}

function getEqVariantLabel(bandCount: number) {
  if (bandCount === 7) return "SevenCurve EQ";
  if (bandCount === 4) return "QuadCurve EQ";

  return `${bandCount}-Band Curve EQ`;
}

const FILTER_TYPE_STEPS: FilterType[] = ["butterworth", "bessel", "linkwitz"];
const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  butterworth: "BUTTER",
  bessel: "BESSEL",
  linkwitz: "LINKWZ",
};
const FILTER_SLOPE_STEPS: FilterSlope[] = [12, 24];

function filterTypeToStepIndex(type: FilterType) {
  const index = FILTER_TYPE_STEPS.indexOf(type);
  return index >= 0 ? index + 1 : 1;
}

function filterTypeFromStepIndex(index: number): FilterType {
  const rounded = Math.round(index);
  return FILTER_TYPE_STEPS[clamp(rounded - 1, 0, FILTER_TYPE_STEPS.length - 1)];
}

function filterSlopeToStepIndex(slope: FilterSlope) {
  const index = FILTER_SLOPE_STEPS.indexOf(slope);
  return index >= 0 ? index + 1 : 1;
}

function filterSlopeFromStepIndex(index: number): FilterSlope {
  const rounded = Math.round(index);
  return FILTER_SLOPE_STEPS[clamp(rounded - 1, 0, FILTER_SLOPE_STEPS.length - 1)];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function freqToX(freq: number, width: number) {
  const min = Math.log10(EQ_DISPLAY_MIN_FREQ);
  const max = Math.log10(EQ_DISPLAY_MAX_FREQ);
  const value = Math.log10(clamp(freq, EQ_DISPLAY_MIN_FREQ, EQ_DISPLAY_MAX_FREQ));

  return ((value - min) / (max - min)) * width;
}

function logFreqToX(freq: number, width: number) {
  return freqToX(freq, width);
}

function xToDisplayFreq(x: number, width: number) {
  const min = Math.log10(EQ_DISPLAY_MIN_FREQ);
  const max = Math.log10(EQ_DISPLAY_MAX_FREQ);
  const ratio = clamp(x / width, 0, 1);

  return 10 ** (min + ratio * (max - min));
}

function snapEqFrequency(freq: number) {
  const clamped = clamp(freq, EQ_ACTIVE_MIN_FREQ, EQ_ACTIVE_MAX_FREQ);

  if (clamped >= 1000) {
    return Math.round(clamped / 50) * 50;
  }

  return Math.round(clamped);
}

function xToActiveFreq(x: number, width: number) {
  return snapEqFrequency(xToDisplayFreq(x, width));
}

function formatFreq(freq: number) {
  if (freq >= 1000) {
    const khz = freq / 1000;
    return `${khz.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}kHz`;
  }

  return `${Math.round(freq)}Hz`;
}

function formatEqAxisFreq(freq: number) {
  if (freq >= 1000) return `${Math.round(freq / 1000)}k`;

  return String(freq);
}

function logValueToPosition(value: number, min: number, max: number) {
  const safeMin = Math.max(min, 0.0001);
  const safeMax = Math.max(max, safeMin + 0.0001);
  const safeValue = clamp(value, safeMin, safeMax);
  return Math.log10(safeValue);
}

function logPositionToValue(position: number, min: number, max: number) {
  const safeMin = Math.max(min, 0.0001);
  const safeMax = Math.max(max, safeMin + 0.0001);
  const rawValue = 10 ** position;
  return clamp(rawValue, safeMin, safeMax);
}

function generateLogGridFrequencies() {
  const result: number[] = [];
  const decades = [10, 100, 1000, 10000];

  for (const decade of decades) {
    for (let multiplier = 2; multiplier <= 9; multiplier++) {
      const freq = decade * multiplier;

      if (freq >= EQ_ACTIVE_MIN_FREQ && freq <= EQ_ACTIVE_MAX_FREQ) {
        result.push(freq);
      }
    }
  }

  if (!result.includes(EQ_ACTIVE_MAX_FREQ)) result.push(EQ_ACTIVE_MAX_FREQ);

  return Array.from(new Set(result)).sort((a, b) => a - b);
}

function formatDb(value: number) {
  return `${value > 0 ? "+" : ""}${Number(value.toFixed(1))}dB`;
}

function formatMs(value: number) {
  return `${Number(value.toFixed(value % 1 === 0 ? 0 : 1))}ms`;
}

const COMP_RATIO_STEPS = [
  1,
  1.05,
  1.15,
  1.2,
  1.25,
  1.3,
  1.35,
  1.4,
  1.5,
  ...Array.from({ length: 19 }, (_, index) => index + 2),
  40,
];

function snapCompressorThreshold(db: number) {
  return clamp(Math.round(db * 2) / 2, -80, 0);
}

function snapCompressorRatio(ratio: number) {
  if (!Number.isFinite(ratio) || ratio >= 40) return 40;

  const clamped = clamp(ratio, 1, 40);

  return COMP_RATIO_STEPS.reduce((closest, option) =>
    Math.abs(option - clamped) < Math.abs(closest - clamped) ? option : closest
  );
}

function compressorRatioToStepIndex(ratio: number) {
  if (!Number.isFinite(ratio) || ratio >= 40) return COMP_RATIO_STEPS.length - 1;

  const snapped = snapCompressorRatio(ratio);
  if (!Number.isFinite(snapped)) return COMP_RATIO_STEPS.length - 1;

  const index = COMP_RATIO_STEPS.findIndex((option) => Math.abs(option - snapped) < 0.0001);
  return index >= 0 ? index : 0;
}

function compressorRatioFromStepIndex(index: number) {
  const rounded = Math.round(index);
  return COMP_RATIO_STEPS[clamp(rounded, 0, COMP_RATIO_STEPS.length - 1)];
}

function formatCompressorRatio(ratio: number) {
  if (!Number.isFinite(ratio) || ratio >= 40) return "∞";

  return `1:${Number(ratio.toFixed(2))}`;
}

const GATE_DECAY_STEPS = [2, 4, 6, 8, 16, 32] as const;

function snapGateDecay(value: number) {
  const rounded = Math.round(value);

  return GATE_DECAY_STEPS.reduce((closest, option) =>
    Math.abs(option - rounded) < Math.abs(closest - rounded) ? option : closest
  );
}

function gateDecayToStepIndex(value: number) {
  const snapped = snapGateDecay(value);
  const index = GATE_DECAY_STEPS.findIndex((option) => option === snapped);

  return index >= 0 ? index : 0;
}

function gateDecayFromStepIndex(index: number) {
  const rounded = Math.round(index);

  return GATE_DECAY_STEPS[clamp(rounded, 0, GATE_DECAY_STEPS.length - 1)];
}

const COMP_GR_SCALE_MARKERS = ["0", "-6", "-12", "-18", "-24", "-30"];
const COMP_GR_SEGMENTS = Array.from({ length: 15 }, (_, index) => (index + 1) * 2);

function CompressorMeterScale({
  markers,
  showClip,
  clipped = false,
}: {
  markers: string[];
  showClip: boolean;
  clipped?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        width: 21,
        height: "100%",
        color: "var(--fader-scale-text)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "1.2px",
        lineHeight: "12px",
        fontFamily: "Inter, system-ui, sans-serif",
        flexShrink: 0,
      }}
    >
      {showClip ? (
        <div
          style={{
            height: 20,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            lineHeight: "normal",
            letterSpacing: 0,
            marginBottom: 8,
            paddingTop: 1,
            color: clipped ? "var(--meter-clip)" : "var(--fader-scale-text)",
          }}
        >
          Clip
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {markers.map((marker) => (
          <div
            key={marker}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flexShrink: 0,
              fontWeight: 700,
              color: "inherit",
            }}
          >
            {marker}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompressorGainReductionMeterBar({
  meterDb,
  accentColor = MODULE_ACCENTS.comp.color,
  accentGlow = MODULE_ACCENTS.comp.glow,
}: {
  meterDb: number;
  accentColor?: string;
  accentGlow?: string;
}) {
  const normalizedDb = clamp(meterDb, 0, 30);
  const activeSegmentCount = COMP_GR_SEGMENTS.reduce((count, segmentDb) => {
    const activationThreshold = segmentDb >= 30 ? 29 : Math.max(1.5, segmentDb - 0.5);
    return normalizedDb >= activationThreshold ? count + 1 : count;
  }, 0);

  return (
    <div
      style={{
        display: "flex",
        width: 10,
        height: "100%",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 10,
          height: "100%",
          minHeight: 0,
          border: "1px solid var(--meter-border)",
          borderRadius: 4,
          backgroundColor: "var(--meter-background)",
          padding: 1,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          justifyContent: "flex-start",
          overflow: "hidden",
        }}
      >
        {COMP_GR_SEGMENTS.map((segmentDb, index) => {
          const isActive = index < activeSegmentCount;

          return (
            <div
              key={segmentDb}
              style={{
                width: "100%",
                flex: "1 1 auto",
                minHeight: 2,
                borderRadius: 1,
                opacity: isActive ? 0.95 : 0.24,
                backgroundColor: accentColor,
                boxShadow: isActive ? `0 0 4px 1px ${accentGlow}` : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}


function ControlButton({
  active,
  icon,
  label,
  accentColor,
  accentGlow,
  disabled,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  accentColor?: string;
  accentGlow?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: "100%",
        padding: "8px 6px 6px",
        borderRadius: 10,
        border: active ? `1px solid ${accentColor ?? "#22d3ee"}` : "1px solid #263746",
        background: active ? "linear-gradient(180deg, #0b1d2a 0%, #08111a 100%)" : "linear-gradient(180deg, #0b141f 0%, #070d14 100%)",
        color: active ? "#e2f7ff" : "#94a3b8",
        fontSize: 10.5,
        fontWeight: 950,
        lineHeight: 1,
        letterSpacing: "0.06em",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        boxShadow: active ? `0 0 14px ${accentGlow ?? "rgba(34,211,238,0.3)"}` : "inset 0 1px 0 rgba(255,255,255,0.03)",
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", height: 56, display: "grid", placeItems: "center", overflow: "hidden" }}>
        {icon}
      </div>
      {label}
    </button>
  );
}

function EditableKnob({
  label,
  value,
  min,
  max,
  step = 1,
  knobPixelsPerStep = 4,
  knobValue,
  knobMin,
  knobMax,
  knobValueStep,
  knobVelocityResponsive = true,
  knobDiscreteStepMode = false,
  knobSize = 44,
  displayValue,
  suffix,
  accentColor,
  glowColor,
  disabled = false,
  compact = false,
  allowTextEdit = true,
  textValue,
  textMin,
  textMax,
  onTextCommit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  knobPixelsPerStep?: number;
  knobValue?: number;
  knobMin?: number;
  knobMax?: number;
  knobValueStep?: number;
  knobVelocityResponsive?: boolean;
  knobDiscreteStepMode?: boolean;
  knobSize?: number;
  displayValue: string;
  suffix?: string;
  accentColor?: string;
  glowColor?: string;
  disabled?: boolean;
  compact?: boolean;
  allowTextEdit?: boolean;
  /** Human-readable value for the text input (defaults to `value`). Use when the knob internal scale differs from the human unit (e.g. knob in log-position, text in Hz). */
  textValue?: number;
  /** Clamp min for text input (defaults to `min`). */
  textMin?: number;
  /** Clamp max for text input (defaults to `max`). */
  textMax?: number;
  /** Called on text commit instead of `onChange`. Receives the clamped human value. */
  onTextCommit?: (value: number) => void;
  onChange: (value: number) => void;
}) {
  const effectiveTextValue = textValue ?? value;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(effectiveTextValue));

  useEffect(() => {
    if (!isEditing) setDraft(String(textValue ?? value));
  }, [isEditing, value, textValue]);

  function commit() {
    const parsed = Number(draft);
    const tMin = textMin ?? min;
    const tMax = textMax ?? max;
    const nextValue = Number.isFinite(parsed) ? clamp(parsed, tMin, tMax) : effectiveTextValue;
    setDraft(String(nextValue));
    setIsEditing(false);
    if (onTextCommit) {
      onTextCommit(nextValue);
    } else {
      onChange(nextValue);
    }
  }

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: compact ? 4 : 6, width: knobSize, minWidth: knobSize }}>
      <Knob
        label={label}
        value={knobValue ?? value}
        min={knobMin ?? min}
        max={knobMax ?? max}
        displayValue=""
        size={knobSize}
        pixelsPerStep={knobPixelsPerStep}
        valueStep={knobValueStep ?? step}
        velocityResponsive={knobVelocityResponsive}
        discreteStepMode={knobDiscreteStepMode}
        accentColor={accentColor}
        glowColor={glowColor}
        disabled={disabled}
        onChange={(nextKnobValue) => {
          if (knobValue === undefined) {
            onChange(nextKnobValue);
            return;
          }

          const normalizedValue = clamp(nextKnobValue, knobMin ?? min, knobMax ?? max);
          onChange(normalizedValue);
        }}
      />

      {allowTextEdit && isEditing ? (
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: suffix ? "1fr auto" : "1fr",
            alignItems: "center",
            borderRadius: 7,
            border: "1px solid #38bdf8",
            background: "#07111a",
            overflow: "hidden",
          }}
        >
          <input
            autoFocus
            value={draft}
            inputMode="decimal"
            step={step}
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setDraft(String(value));
                setIsEditing(false);
              }
            }}
            style={{
              width: "100%",
              minWidth: 0,
              padding: compact ? "4px 6px" : "6px 7px",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "#e5eef5",
              textAlign: "center",
              fontSize: compact ? 11 : 12,
              fontWeight: 900,
            }}
          />
          {suffix && (
            <span
              style={{
                paddingRight: compact ? 6 : 7,
                color: "#64748b",
                fontSize: compact ? 9 : 10,
                fontWeight: 900,
              }}
            >
              {suffix}
            </span>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            if (allowTextEdit) setIsEditing(true);
          }}
          style={{
            width: "100%",
            minHeight: compact ? 24 : 29,
            padding: compact ? "4px 6px" : "6px 7px",
            borderRadius: 7,
            border: "1px solid #263746",
            background: "#07111a",
            color: "#e5eef5",
            fontSize: compact ? 11 : 12,
            fontWeight: 900,
            whiteSpace: "nowrap",
            cursor: disabled ? "not-allowed" : allowTextEdit ? "text" : "default",
          }}
        >
          {displayValue}
        </button>
      )}
    </div>
  );
}

function ProcessorShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const hasTitle = title.trim().length > 0;

  return (
    <section
      style={{
        minHeight: 0,
        height: "100%",
        display: "grid",
        gridTemplateRows: hasTitle ? "auto 1fr" : "1fr",
        gap: hasTitle ? 8 : 0,
      }}
    >
      {hasTitle && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            paddingBottom: 6,
            borderBottom: "1px solid #1d2b37",
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 950, color: "#e5eef5", letterSpacing: "0.03em" }}>{title}</div>
          </div>
        </header>
      )}

      {children}
    </section>
  );
}

function ToggleSwitch({
  enabled,
  disabled = false,
  onChange,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      style={{
        position: "relative",
        width: 56,
        height: 22,
        padding: 0,
        border: "1.5px solid var(--border-default)",
        borderRadius: 999,
        background: enabled ? "var(--semantic-success-base)" : "var(--surface-control)",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        opacity: disabled ? 0.5 : 1,
        transition: "all 200ms ease-in-out",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: enabled ? "calc(100% - 20px)" : 1,
          width: 20,
          height: 20,
          borderRadius: 999,
          background: "var(--primitive-neutral-0)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          transition: "all 200ms ease-in-out",
          zIndex: 2,
        }}
      />

      <span
        style={{
          position: "absolute",
          left: 6,
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.4px",
          color: enabled ? "var(--primitive-neutral-0)" : "transparent",
          opacity: enabled ? 1 : 0,
          transition: "opacity 200ms ease-in-out",
          pointerEvents: "none",
        }}
      >
        ON
      </span>

      <span
        style={{
          position: "absolute",
          right: 6,
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.4px",
          color: enabled ? "transparent" : "var(--primitive-neutral-300)",
          opacity: enabled ? 0 : 1,
          transition: "opacity 200ms ease-in-out",
          pointerEvents: "none",
        }}
      >
        OFF
      </span>
    </button>
  );
}

function GateGraph({
  gate,
  disabled,
  onThresholdChange,
  onAttackChange,
}: {
  gate: GateState;
  disabled?: boolean;
  onThresholdChange: (value: number) => void;
  onAttackChange: (value: number) => void;
}) {
  const graphFrameRef = useRef<HTMLDivElement | null>(null);
  const [responsiveSize, setResponsiveSize] = useState({ width: 560, height: 270 });
  const gateDragRef = useRef<{
    svgRect: DOMRect | null;
    kind: "threshold" | "attack" | null;
    pendingClientX: number;
    pendingClientY: number;
    rafId: number | null;
  }>({ svgRect: null, kind: null, pendingClientX: 0, pendingClientY: 0, rafId: null });

  useEffect(() => {
    const node = graphFrameRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const nextWidth = Math.round(rect.width);
      const nextHeight = Math.round(rect.height);

      if (nextWidth > 0 && nextHeight > 0) {
        setResponsiveSize({ width: nextWidth, height: nextHeight });
      }
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);

      if (nextWidth > 0 && nextHeight > 0) {
        setResponsiveSize({ width: nextWidth, height: nextHeight });
      }
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      const ref = gateDragRef.current;
      if (ref.rafId !== null) { cancelAnimationFrame(ref.rafId); ref.rafId = null; }
    };
  }, []);

  const width = Math.max(360, responsiveSize.width);
  const height = Math.max(180, responsiveSize.height);
  const graphX = PROCESSOR_GRAPH_RECT.left;
  const graphY = PROCESSOR_GRAPH_RECT.top;
  const graphWidth = Math.max(220, width - PROCESSOR_GRAPH_RECT.left - PROCESSOR_GRAPH_RECT.right);
  const graphHeight = Math.max(120, height - PROCESSOR_GRAPH_RECT.top - PROCESSOR_GRAPH_RECT.bottom);
  const dbToY = (db: number) => graphY + ((0 - clamp(db, -80, 0)) / 80) * graphHeight;
  const thresholdY = dbToY(gate.threshold);
  const bottomY = graphY + graphHeight;
  const rightX = graphX + graphWidth;

  const attackWidth = 20 + ((clamp(gate.attack, 3, 200) - 3) / (200 - 3)) * 108;
  const holdWidth = 16 + (clamp(gate.hold, 0, 530) / 530) * 130;
  const snappedDecay = snapGateDecay(gate.decay);
  const decayWidthByStep: Record<number, number> = { 2: 14, 4: 22, 6: 34, 8: 48, 16: 82, 32: 118 };
  const decayWidth = decayWidthByStep[snappedDecay] ?? 22;

  const envelopeStartX = graphX + 20;
  const attackEndX = clamp(envelopeStartX + attackWidth, graphX + 32, rightX - 32);
  const holdEndX = clamp(attackEndX + holdWidth, attackEndX + 8, rightX - Math.max(16, decayWidth));
  const decayEndX = clamp(holdEndX + decayWidth, holdEndX + 8, rightX);
  const decayHandleX = attackEndX;
  const thresholdHandleX = holdEndX;
  const envelopePath = [
    `M ${graphX} ${bottomY}`,
    `L ${envelopeStartX} ${bottomY}`,
    `L ${attackEndX} ${thresholdY}`,
    `L ${holdEndX} ${thresholdY}`,
    `L ${decayEndX} ${bottomY}`,
    `L ${rightX} ${bottomY}`,
    `L ${graphX} ${bottomY}`,
    "Z",
  ].join(" ");

  const envelopeOutline = [
    `M ${envelopeStartX} ${bottomY}`,
    `L ${attackEndX} ${thresholdY}`,
    `L ${holdEndX} ${thresholdY}`,
    `L ${decayEndX} ${bottomY}`,
  ].join(" ");

  function updateThresholdFromRect(clientY: number) {
    const rect = gateDragRef.current.svgRect;
    if (!rect) return;
    const y = clamp((clientY - rect.top) * (height / rect.height) - graphY, 0, graphHeight);
    onThresholdChange(-Math.round((y / graphHeight) * 80));
  }

  function updateAttackFromRect(clientX: number) {
    const rect = gateDragRef.current.svgRect;
    if (!rect) return;
    const svgX = (clientX - rect.left) * (width / rect.width);
    const nextHandleX = clamp(svgX, envelopeStartX + 20, envelopeStartX + 128);
    const w = nextHandleX - envelopeStartX;
    onAttackChange(clamp(Math.round(3 + ((w - 20) / 108) * (200 - 3)), 3, 200));
  }

  function scheduleGateUpdate() {
    const ref = gateDragRef.current;
    if (ref.rafId !== null) return;
    ref.rafId = requestAnimationFrame(() => {
      ref.rafId = null;
      if (!ref.svgRect) return;
      if (ref.kind === "threshold") updateThresholdFromRect(ref.pendingClientY);
      else if (ref.kind === "attack") updateAttackFromRect(ref.pendingClientX);
    });
  }

  return (
    <div
      ref={graphFrameRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
      }}
    >
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        minHeight: 0,
        borderRadius: 10,
        background: "var(--surface-panel-raised)",
        border: `1px solid ${CHART_THEME.graphBorder}`,
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <defs>
        <filter id="gate-threshold-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="gate-decay-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x={graphX} y={graphY} width={graphWidth} height={graphHeight} fill="rgba(255,255,255,0.01)" />
      {[-10, -30, -50, -70].map((db) => (
        <line
          key={`gate-h-minor-${db}`}
          x1={graphX}
          x2={graphX + graphWidth}
          y1={dbToY(db)}
          y2={dbToY(db)}
          stroke={CHART_THEME.gridMinor}
          strokeWidth="0.9"
          strokeDasharray="4 4"
        />
      ))}
      {[0, -20, -40, -60, -80].map((db) => (
        <g key={`gate-h-major-${db}`}>
          <line
            x1={graphX}
            x2={graphX + graphWidth}
            y1={dbToY(db)}
            y2={dbToY(db)}
            stroke={db === 0 ? ZERO_DB_GRID_LINE_COLOR : CHART_THEME.gridMajor}
            strokeWidth={db === 0 ? ZERO_DB_GRID_LINE_WIDTH : "1"}
          />
          <text x={graphX - PROCESSOR_AXIS_LABEL_OFFSETS.side} y={dbToY(db) + 4} fill={CHART_THEME.axisLabel} fontSize="9" textAnchor="end" fontWeight="500">
            {db}
          </text>
          <text x={graphX + graphWidth + PROCESSOR_AXIS_LABEL_OFFSETS.side} y={dbToY(db) + 4} fill={CHART_THEME.axisLabel} fontSize="9" textAnchor="start" fontWeight="500">
            {db}
          </text>
        </g>
      ))}
      {Array.from({ length: 8 }, (_, index) => {
        const x = graphX + (graphWidth / 7) * index;
        const isEdge = index === 0 || index === 7;

        return (
        <line
          key={`gate-v-${index}`}
          x1={x}
          x2={x}
          y1={graphY}
          y2={graphY + graphHeight}
          stroke={isEdge ? CHART_THEME.gridMajor : CHART_THEME.gridMinor}
          strokeWidth={isEdge ? "1" : "0.9"}
          strokeDasharray={isEdge ? undefined : "4 4"}
        />
        );
      })}

      <path d={envelopePath} fill={GATE_THEME.primary} opacity={gate.enabled ? 0.16 : 0.06} />
      <path d={envelopeOutline} fill="none" stroke={CHART_THEME.curveStroke} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" opacity={gate.enabled ? 0.92 : 0.35} />

      <line
        x1={graphX}
        x2={graphX + graphWidth}
        y1={thresholdY}
        y2={thresholdY}
        stroke={GATE_THEME.primary}
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity={gate.enabled ? 0.9 : 0.35}
      />

      <g
        style={{ cursor: disabled ? "not-allowed" : "ew-resize" }}
        onPointerDown={(event) => {
          if (disabled) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          gateDragRef.current.svgRect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
          gateDragRef.current.kind = "attack";
          gateDragRef.current.pendingClientX = event.clientX;
          updateAttackFromRect(event.clientX);
        }}
        onPointerMove={(event) => {
          if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          event.preventDefault();
          event.stopPropagation();
          gateDragRef.current.kind = "attack";
          gateDragRef.current.pendingClientX = event.clientX;
          scheduleGateUpdate();
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          gateDragRef.current.svgRect = null;
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          gateDragRef.current.svgRect = null;
        }}
      >
        <circle cx={decayHandleX} cy={thresholdY} r={12} fill="none" stroke={HANDLE_THEME.ratio} strokeWidth="1.8" opacity={0.5} />
        <circle cx={decayHandleX} cy={thresholdY} r={10} fill={HANDLE_THEME.ratio} stroke={HANDLE_THEME.idleStroke} strokeWidth="1.6" opacity={gate.enabled ? 0.7 : 0.32} filter="url(#gate-decay-glow)" />
        <text x={decayHandleX} y={thresholdY} fill={CHART_THEME.handleText} fontSize="12" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
          D
        </text>
      </g>

      <g
        style={{ cursor: disabled ? "not-allowed" : "ns-resize" }}
        onPointerDown={(event) => {
          if (disabled) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          gateDragRef.current.svgRect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
          gateDragRef.current.kind = "threshold";
          gateDragRef.current.pendingClientY = event.clientY;
          updateThresholdFromRect(event.clientY);
        }}
        onPointerMove={(event) => {
          if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          event.preventDefault();
          event.stopPropagation();
          gateDragRef.current.kind = "threshold";
          gateDragRef.current.pendingClientY = event.clientY;
          scheduleGateUpdate();
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          gateDragRef.current.svgRect = null;
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          gateDragRef.current.svgRect = null;
        }}
      >
        <circle cx={thresholdHandleX} cy={thresholdY} r={17} fill="none" stroke={GATE_THEME.primarySoft} strokeWidth="2" opacity={gate.enabled ? 0.45 : 0.15} />
        <circle cx={thresholdHandleX} cy={thresholdY} r={12} fill={GATE_THEME.primary} stroke={gate.enabled ? "#f8fafc" : HANDLE_THEME.idleStroke} strokeWidth="2" opacity={gate.enabled ? 0.95 : 0.35} filter="url(#gate-threshold-glow)" />
        <text x={thresholdHandleX} y={thresholdY} fill={CHART_THEME.handleText} fontSize="12" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
          T
        </text>
      </g>
    </svg>
    </div>
  );
}

function CompressorGraph({
  comp,
  disabled,
  onChange,
}: {
  comp: CompressorState;
  disabled?: boolean;
  onChange: (patch: Partial<CompressorState>) => void;
}) {
  const graphFrameRef = useRef<HTMLDivElement | null>(null);
  const [responsiveSize, setResponsiveSize] = useState({ width: 560, height: 270 });
  const [selectedHandle, setSelectedHandle] = useState<"threshold" | "ratio" | null>(null);
  const compDragRef = useRef<{
    svgRect: DOMRect | null;
    kind: "threshold" | "ratio" | null;
    pendingClientX: number;
    pendingClientY: number;
    rafId: number | null;
  }>({ svgRect: null, kind: null, pendingClientX: 0, pendingClientY: 0, rafId: null });

  useEffect(() => {
    const node = graphFrameRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const nextWidth = Math.round(rect.width);
      const nextHeight = Math.round(rect.height);

      if (nextWidth > 0 && nextHeight > 0) {
        setResponsiveSize({ width: nextWidth, height: nextHeight });
      }
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);

      if (nextWidth > 0 && nextHeight > 0) {
        setResponsiveSize({ width: nextWidth, height: nextHeight });
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      const ref = compDragRef.current;
      if (ref.rafId !== null) { cancelAnimationFrame(ref.rafId); ref.rafId = null; }
    };
  }, []);

  const width = Math.max(360, responsiveSize.width);
  const height = Math.max(180, responsiveSize.height);
  const graphX = PROCESSOR_GRAPH_RECT.left;
  const graphY = PROCESSOR_GRAPH_RECT.top;
  const graphWidth = Math.max(220, width - PROCESSOR_GRAPH_RECT.left - PROCESSOR_GRAPH_RECT.right);
  const graphHeight = Math.max(120, height - PROCESSOR_GRAPH_RECT.top - PROCESSOR_GRAPH_RECT.bottom);
  const snappedThreshold = snapCompressorThreshold(comp.threshold);
  const snappedRatio = snapCompressorRatio(comp.ratio);
  const curveRatio = snappedRatio >= 40 ? Number.POSITIVE_INFINITY : snappedRatio;
  const horizontalMajorDb = [0, -20, -40, -60, -80];
  const horizontalMinorDb = [-10, -30, -50, -70];
  const verticalMajorDb = [-80, -60, -40, -20, 0];
  const verticalMinorDb = [-70, -50, -30, -10];
  const xForDb = (db: number) => graphX + ((db + 80) / 80) * graphWidth;
  const yForDb = (db: number) => graphY + ((0 - db) / 80) * graphHeight;
  const thresholdX = xForDb(snappedThreshold);
  const thresholdY = yForDb(snappedThreshold);
  const endY = yForDb(snappedThreshold + Math.abs(snappedThreshold) / Math.max(1, curveRatio));
  const isRatioSelected = selectedHandle === "ratio";
  const isThresholdSelected = selectedHandle === "threshold";
  const path = `M ${graphX} ${graphY + graphHeight} L ${thresholdX} ${thresholdY} L ${graphX + graphWidth} ${endY}`;
  const fillPath = `${path} L ${graphX + graphWidth} ${graphY + graphHeight} L ${graphX} ${graphY + graphHeight} Z`;

  function updateThresholdFromRect(clientX: number) {
    const rect = compDragRef.current.svgRect;
    if (!rect) return;
    const x = clamp((clientX - rect.left) * (width / rect.width) - graphX, 0, graphWidth);
    const threshold = snapCompressorThreshold((x / graphWidth) * 80 - 80);
    if (snappedRatio >= 40) { onChange({ threshold, ratio: 40 }); return; }
    onChange({ threshold });
  }

  function updateRatioFromRect(clientY: number) {
    const rect = compDragRef.current.svgRect;
    if (!rect) return;
    const y = clamp((clientY - rect.top) * (height / rect.height) - graphY, 0, graphHeight);
    const outDb = -Math.round((y / graphHeight) * 80);
    const inputDelta = Math.max(0.5, 0 - snappedThreshold);
    const outputDelta = Math.max(0.5, outDb - snappedThreshold);
    onChange({ ratio: snapCompressorRatio(inputDelta / outputDelta) });
  }

  function scheduleCompUpdate() {
    const ref = compDragRef.current;
    if (ref.rafId !== null) return;
    ref.rafId = requestAnimationFrame(() => {
      ref.rafId = null;
      if (!ref.svgRect) return;
      if (ref.kind === "threshold") updateThresholdFromRect(ref.pendingClientX);
      else if (ref.kind === "ratio") updateRatioFromRect(ref.pendingClientY);
    });
  }

  return (
    <div
      ref={graphFrameRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          minHeight: 0,
          borderRadius: 10,
          background: "var(--surface-panel-raised)",
          border: `1px solid ${CHART_THEME.graphBorder}`,
          touchAction: "none",
          userSelect: "none",
        }}
      >
      <defs>
        <filter id="comp-threshold-glow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="2.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="comp-ratio-glow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x={graphX} y={graphY} width={graphWidth} height={graphHeight} fill="rgba(255,255,255,0.01)" />
      {horizontalMinorDb.map((db) => (
        <line
          key={`comp-h-minor-${db}`}
          x1={graphX}
          x2={graphX + graphWidth}
          y1={yForDb(db)}
          y2={yForDb(db)}
          stroke={CHART_THEME.gridMinor}
          strokeWidth="0.9"
          strokeDasharray="4 4"
        />
      ))}
      {horizontalMajorDb.map((db) => (
        <g key={`comp-h-major-${db}`}>
          <line
            x1={graphX}
            x2={graphX + graphWidth}
            y1={yForDb(db)}
            y2={yForDb(db)}
            stroke={db === 0 ? ZERO_DB_GRID_LINE_COLOR : CHART_THEME.gridMajor}
            strokeWidth={db === 0 ? ZERO_DB_GRID_LINE_WIDTH : "1"}
          />
          <text x={graphX - PROCESSOR_AXIS_LABEL_OFFSETS.side} y={yForDb(db) + 4} fill={CHART_THEME.axisLabel} fontSize="9" textAnchor="end" fontWeight="500">
            {db}
          </text>
          <text x={graphX + graphWidth + PROCESSOR_AXIS_LABEL_OFFSETS.side} y={yForDb(db) + 4} fill={CHART_THEME.axisLabel} fontSize="9" textAnchor="start" fontWeight="500">
            {db}
          </text>
        </g>
      ))}
      {verticalMinorDb.map((db) => (
        <line
          key={`comp-v-minor-${db}`}
          x1={xForDb(db)}
          x2={xForDb(db)}
          y1={graphY}
          y2={graphY + graphHeight}
          stroke={CHART_THEME.gridMinor}
          strokeWidth="0.9"
          strokeDasharray="4 4"
        />
      ))}
      {verticalMajorDb.map((db) => (
        <g key={`comp-v-major-${db}`}>
          <line
            x1={xForDb(db)}
            x2={xForDb(db)}
            y1={graphY}
            y2={graphY + graphHeight}
            stroke={CHART_THEME.gridMajor}
            strokeWidth="1"
          />
          <text
            x={xForDb(db)}
            y={graphY + graphHeight + PROCESSOR_AXIS_LABEL_OFFSETS.bottom}
            fill={CHART_THEME.axisLabel}
            fontSize="9"
            textAnchor="middle"
            fontWeight="500"
            dominantBaseline="hanging"
          >
            {db}
          </text>
        </g>
      ))}
      <path d={fillPath} fill={HANDLE_THEME.threshold} opacity={comp.enabled ? 0.16 : 0.06} />
      <path d={path} fill="none" stroke={CHART_THEME.curveStroke} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" opacity={comp.enabled ? 0.92 : 0.35} />

      {/* R handle — controls Ratio (vertical, pinned to right edge) */}
      <g
        style={{ cursor: disabled ? "not-allowed" : "ns-resize" }}
        onPointerDown={(event) => {
          if (disabled) return;
          setSelectedHandle("ratio");
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          compDragRef.current.svgRect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
          compDragRef.current.kind = "ratio";
          compDragRef.current.pendingClientY = event.clientY;
          updateRatioFromRect(event.clientY);
        }}
        onPointerMove={(event) => {
          if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          event.preventDefault();
          event.stopPropagation();
          compDragRef.current.kind = "ratio";
          compDragRef.current.pendingClientY = event.clientY;
          scheduleCompUpdate();
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          compDragRef.current.svgRect = null;
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          compDragRef.current.svgRect = null;
        }}
      >
        <circle
          cx={graphX + graphWidth}
          cy={endY}
          r={isRatioSelected ? 18 : 12}
          fill="none"
          stroke={HANDLE_THEME.ratio}
          strokeWidth="1.8"
          opacity={isRatioSelected ? 0.68 : 0.5}
        />
        <circle
          cx={graphX + graphWidth}
          cy={endY}
          r={isRatioSelected ? 16 : 10}
          fill={HANDLE_THEME.ratio}
          stroke={isRatioSelected ? "#f8fafc" : HANDLE_THEME.idleStroke}
          strokeWidth="1.6"
          opacity={comp.enabled ? 0.95 : 0.32}
          filter="url(#comp-ratio-glow)"
        />
        <text x={graphX + graphWidth} y={endY} fill={CHART_THEME.handleText} fontSize="12" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
          R
        </text>
      </g>

      {/* T handle — controls Threshold (horizontal). Drawn last so overlap prioritizes Threshold drag. */}
      <g
        style={{ cursor: disabled ? "not-allowed" : "ew-resize" }}
        onPointerDown={(event) => {
          if (disabled) return;
          setSelectedHandle("threshold");
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          compDragRef.current.svgRect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
          compDragRef.current.kind = "threshold";
          compDragRef.current.pendingClientX = event.clientX;
          updateThresholdFromRect(event.clientX);
        }}
        onPointerMove={(event) => {
          if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          event.preventDefault();
          event.stopPropagation();
          compDragRef.current.kind = "threshold";
          compDragRef.current.pendingClientX = event.clientX;
          scheduleCompUpdate();
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          compDragRef.current.svgRect = null;
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          compDragRef.current.svgRect = null;
        }}
      >
        <circle
          cx={thresholdX}
          cy={thresholdY}
          r={isThresholdSelected ? 18 : 12}
          fill="none"
          stroke={HANDLE_THEME.threshold}
          strokeWidth="1.8"
          opacity={isThresholdSelected ? 0.68 : 0.5}
        />
        <circle
          cx={thresholdX}
          cy={thresholdY}
          r={isThresholdSelected ? 16 : 10}
          fill={HANDLE_THEME.threshold}
          stroke={isThresholdSelected ? "#f8fafc" : HANDLE_THEME.idleStroke}
          strokeWidth="1.6"
          opacity={comp.enabled ? 0.95 : 0.32}
          filter="url(#comp-threshold-glow)"
        />
        <text x={thresholdX} y={thresholdY} fill={CHART_THEME.handleText} fontSize="12" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
          T
        </text>
      </g>
    </svg>
    </div>
  );
}

function peakingEqMagnitudeDb(freq: number, band: EqBandState) {
  if (!band.enabled) return 0;
  if (Math.abs(band.gain) < 0.01) return 0;

  const sampleRate = 48000;
  const limitedFreq = clamp(freq, 20, sampleRate / 2 - 1);
  const limitedBandFreq = clamp(band.freq, 20, sampleRate / 2 - 1);
  const a = 10 ** (band.gain / 40);
  const w0 = (2 * Math.PI * limitedBandFreq) / sampleRate;
  const w = (2 * Math.PI * limitedFreq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * clamp(band.q, 0.6, 28.08));
  const cosW0 = Math.cos(w0);
  const b0 = 1 + alpha * a;
  const b1 = -2 * cosW0;
  const b2 = 1 - alpha * a;
  const a0 = 1 + alpha / a;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha / a;
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const numeratorReal = b0 + b1 * cosW + b2 * Math.cos(2 * w);
  const numeratorImag = -b1 * sinW - b2 * Math.sin(2 * w);
  const denominatorReal = a0 + a1 * cosW + a2 * Math.cos(2 * w);
  const denominatorImag = -a1 * sinW - a2 * Math.sin(2 * w);
  const numerator = Math.hypot(numeratorReal, numeratorImag);
  const denominator = Math.max(0.000001, Math.hypot(denominatorReal, denominatorImag));

  return 20 * Math.log10(numerator / denominator);
}

function filterMagnitudeDb(
  freq: number,
  cutoff: number,
  filter: "hpf" | "lpf",
  enabled: boolean,
  type: FilterType,
  slope: FilterSlope
) {
  if (!enabled || cutoff <= 0) return 0;

  const limitedCutoff = clamp(cutoff, 20, 20000);
  const order = slope / 6;
  const ratio =
    filter === "hpf"
      ? limitedCutoff / Math.max(freq, 1)
      : Math.max(freq, 1) / limitedCutoff;
  const shapedRatio = Math.max(0.000001, ratio);

  if (type === "linkwitz") {
    const magnitude = 1 / (1 + shapedRatio ** order);

    return Math.max(-80, 20 * Math.log10(Math.max(0.000001, magnitude)));
  }

  if (type === "bessel") {
    const effectiveOrder = Math.max(1, order * 0.72);
    const magnitude =
      1 / Math.sqrt(1 + shapedRatio ** (2 * effectiveOrder));

    return Math.max(-80, 20 * Math.log10(Math.max(0.000001, magnitude)));
  }

  const magnitude = 1 / Math.sqrt(1 + shapedRatio ** (2 * order));

  return Math.max(-80, 20 * Math.log10(Math.max(0.000001, magnitude)));
}

export function eqMagnitudeDb(freq: number, eq: EqState) {
  if (!eq.enabled) return 0;

  const bandGain = eq.bands.reduce(
    (sum, band) => sum + peakingEqMagnitudeDb(freq, band),
    0
  );
  const hpfGain = filterMagnitudeDb(
    freq,
    eq.hpfFreq,
    "hpf",
    eq.hpfEnabled,
    eq.hpfType,
    eq.hpfSlope
  );
  const lpfGain = filterMagnitudeDb(
    freq,
    eq.lpfFreq,
    "lpf",
    eq.lpfEnabled,
    eq.lpfType,
    eq.lpfSlope
  );

  return clamp(bandGain + hpfGain + lpfGain, -24, 18);
}

function EqGraph({
  eq,
  disabled,
  selected,
  onEqChange,
  onBandChange,
  onSelect,
}: {
  eq: EqState;
  disabled?: boolean;
  selected: EqSelection;
  onEqChange: (patch: Partial<EqState>) => void;
  onBandChange: (band: number, patch: Partial<EqBandState>) => void;
  onSelect: (selection: EqSelection) => void;
}) {
  const graphFrameRef = useRef<HTMLDivElement | null>(null);
  const [responsiveSize, setResponsiveSize] = useState({ width: 846, height: 236 });
  const eqDragRef = useRef<{
    svgRect: DOMRect | null;
    pendingX: number;
    pendingY: number;
    pendingBandIndex: number | null;
    pendingFilter: "hpf" | "lpf" | null;
    rafId: number | null;
  }>({ svgRect: null, pendingX: 0, pendingY: 0, pendingBandIndex: null, pendingFilter: null, rafId: null });

  useEffect(() => {
    const node = graphFrameRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const nextWidth = Math.round(rect.width);
      const nextHeight = Math.round(rect.height);

      if (nextWidth > 0 && nextHeight > 0) {
        setResponsiveSize({ width: nextWidth, height: nextHeight });
      }
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);

      if (nextWidth > 0 && nextHeight > 0) {
        setResponsiveSize({ width: nextWidth, height: nextHeight });
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      const ref = eqDragRef.current;
      if (ref.rafId !== null) {
        cancelAnimationFrame(ref.rafId);
        ref.rafId = null;
      }
    };
  }, []);

  const width = Math.max(360, responsiveSize.width);
  const height = Math.max(180, responsiveSize.height);
  const graphX = PROCESSOR_GRAPH_RECT.left;
  const graphY = PROCESSOR_GRAPH_RECT.top;
  const graphWidth = Math.max(220, width - PROCESSOR_GRAPH_RECT.left - PROCESSOR_GRAPH_RECT.right);
  const graphHeight = Math.max(120, height - PROCESSOR_GRAPH_RECT.top - PROCESSOR_GRAPH_RECT.bottom);
  const majorFreqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const gridFreqs = generateLogGridFrequencies();
  const horizontalMajorDb = [12, 6, 0, -6, -12];
  const horizontalMinorDb = [9, 3, -3, -9];
  const minGraphDb = -12;
  const maxGraphDb = 12;
  const yForGain = (gain: number) =>
    graphY +
    ((maxGraphDb - clamp(gain, minGraphDb, maxGraphDb)) /
      (maxGraphDb - minGraphDb)) *
      graphHeight;
  const yForGainLabel = (gain: number) => clamp(yForGain(gain) + 4, 12, height - 12);
  const gainForY = (y: number) =>
    maxGraphDb -
    (clamp(y, 0, graphHeight) / graphHeight) * (maxGraphDb - minGraphDb);
  const points = useMemo(() => {
    const _yForGain = (gain: number) =>
      graphY + ((maxGraphDb - clamp(gain, minGraphDb, maxGraphDb)) / (maxGraphDb - minGraphDb)) * graphHeight;
    return Array.from({ length: 160 }, (_, index) => {
      const freq = xToDisplayFreq((graphWidth / 159) * index, graphWidth);
      const gain = eqMagnitudeDb(freq, eq);
      return `${graphX + (graphWidth / 159) * index},${_yForGain(gain)}`;
    }).join(" ");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eq, graphX, graphY, graphWidth, graphHeight]);
  const zeroLineY = yForGain(0);
  const eqFillBaseY = Math.min(graphY + graphHeight, zeroLineY + 1.5);
  const bandOverlays = useMemo(() => {
    const _yForGain = (gain: number) =>
      graphY + ((maxGraphDb - clamp(gain, minGraphDb, maxGraphDb)) / (maxGraphDb - minGraphDb)) * graphHeight;
    const _zeroLineY = _yForGain(0);
    return eq.bands
      .map((band, index) => {
        if (!eq.enabled || !band.enabled || Math.abs(band.gain) < 0.05) return null;
        const overlayPoints = Array.from({ length: 120 }, (_, pointIndex) => {
          const x = (graphWidth / 119) * pointIndex;
          const freq = xToDisplayFreq(x, graphWidth);
          const gain = clamp(peakingEqMagnitudeDb(freq, band), -24, 18);
          return { x: graphX + x, y: _yForGain(gain) };
        });
        const polylinePoints = overlayPoints.map((point) => `${point.x},${point.y}`).join(" ");
        const fillPoints = [
          `${overlayPoints[0].x},${_zeroLineY}`,
          ...overlayPoints.map((point) => `${point.x},${point.y}`),
          `${overlayPoints[overlayPoints.length - 1].x},${_zeroLineY}`,
        ].join(" ");
        return {
          key: `band-overlay-${index}`,
          color: getEqBandColor(index),
          polylinePoints,
          fillPoints,
          fillOpacity: band.gain >= 0 ? 0.12 : 0.08,
          strokeOpacity: band.gain >= 0 ? 0.52 : 0.4,
        };
      })
      .filter((overlay): overlay is NonNullable<typeof overlay> => overlay !== null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eq, graphX, graphY, graphWidth, graphHeight]);

  function updateBandFromRect(bandIndex: number, clientX: number, clientY: number) {
    const rect = eqDragRef.current.svgRect;
    if (!rect) return;
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const x = clamp((clientX - rect.left) * scaleX - graphX, 0, graphWidth);
    const y = clamp((clientY - rect.top) * scaleY - graphY, 0, graphHeight);
    onBandChange(bandIndex + 1, {
      freq: xToActiveFreq(x, graphWidth),
      gain: Math.round(gainForY(y) * 10) / 10,
    });
  }

  function updateFilterFromRect(filter: "hpf" | "lpf", clientX: number, _clientY: number) {
    const rect = eqDragRef.current.svgRect;
    if (!rect) return;
    const scaleX = width / rect.width;
    const x = clamp((clientX - rect.left) * scaleX - graphX, 0, graphWidth);
    const freq = xToActiveFreq(x, graphWidth);
    if (filter === "hpf") {
      onEqChange({ hpfEnabled: true, hpfFreq: clamp(Math.min(freq, eq.lpfFreq - 10), EQ_ACTIVE_MIN_FREQ, EQ_ACTIVE_MAX_FREQ) });
    } else {
      onEqChange({ lpfEnabled: true, lpfFreq: clamp(Math.max(freq, eq.hpfFreq + 10), EQ_ACTIVE_MIN_FREQ, EQ_ACTIVE_MAX_FREQ) });
    }
  }

  function scheduleEqUpdate() {
    const ref = eqDragRef.current;
    if (ref.rafId !== null) return;
    ref.rafId = requestAnimationFrame(() => {
      ref.rafId = null;
      if (!ref.svgRect) return;
      if (ref.pendingBandIndex !== null) {
        updateBandFromRect(ref.pendingBandIndex, ref.pendingX, ref.pendingY);
      } else if (ref.pendingFilter !== null) {
        updateFilterFromRect(ref.pendingFilter, ref.pendingX, ref.pendingY);
      }
    });
  }

  return (
    <div
      ref={graphFrameRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          minHeight: 0,
          borderRadius: 4,
          background: "var(--surface-panel-raised)",
          border: `1px solid ${CHART_THEME.graphBorder}`,
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <defs>
          <linearGradient id="eq-fill-base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--alpha-cyan-40)" />
            <stop offset="100%" stopColor="var(--alpha-cyan-12)" />
          </linearGradient>
          <filter id="eq-handle-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(241,245,249,0.42)" floodOpacity="0.8" />
          </filter>
        </defs>

      <rect x={graphX} y={graphY} width={graphWidth} height={graphHeight} rx={4} fill="rgba(255,255,255,0.01)" />
      {horizontalMinorDb.map((gain) => (
        <line
          key={`minor-${gain}`}
          x1={graphX}
          x2={graphX + graphWidth}
          y1={yForGain(gain)}
          y2={yForGain(gain)}
          stroke={CHART_THEME.gridMinor}
          strokeWidth="1"
        />
      ))}
      {horizontalMajorDb.map((gain) => (
        <g key={gain}>
          {gain !== 0 && (
            <line
              x1={graphX}
              x2={graphX + graphWidth}
              y1={yForGain(gain)}
              y2={yForGain(gain)}
              stroke="rgba(52,83,108,0.42)"
              strokeWidth="1"
            />
          )}
          <text x={graphX - PROCESSOR_AXIS_LABEL_OFFSETS.side} y={yForGainLabel(gain)} fill={CHART_THEME.axisLabel} fontSize="9" textAnchor="end" fontWeight="500">
            {gain > 0 ? `+${gain}` : gain}
          </text>
          <text x={graphX + graphWidth + PROCESSOR_AXIS_LABEL_OFFSETS.side} y={yForGainLabel(gain)} fill={CHART_THEME.axisLabel} fontSize="9" textAnchor="start" fontWeight="500">
            {gain > 0 ? `+${gain}` : gain}
          </text>
        </g>
      ))}
      {gridFreqs
        .filter((freq) => !majorFreqs.includes(freq))
        .map((freq) => (
          <line
            key={`minor-${freq}`}
            x1={graphX + freqToX(freq, graphWidth)}
            x2={graphX + freqToX(freq, graphWidth)}
            y1={graphY}
            y2={graphY + graphHeight}
            stroke="rgba(44,64,88,0.22)"
            strokeWidth="1"
          />
        ))}
      {majorFreqs.map((freq) => (
        <g key={freq}>
          <line
            x1={graphX + freqToX(freq, graphWidth)}
            x2={graphX + freqToX(freq, graphWidth)}
            y1={graphY}
            y2={graphY + graphHeight}
            stroke="rgba(52,83,108,0.42)"
            strokeWidth="1"
          />
          <text
            x={graphX + freqToX(freq, graphWidth)}
            y={graphY + graphHeight + PROCESSOR_AXIS_LABEL_OFFSETS.bottom}
            fill={CHART_THEME.axisLabel}
            fontSize="9"
            textAnchor="middle"
            fontWeight="500"
            dominantBaseline="hanging"
          >
            {formatEqAxisFreq(freq)}
          </text>
        </g>
      ))}
      {bandOverlays.map((overlay) => (
        <g key={overlay.key}>
          <polyline
            points={overlay.fillPoints}
            fill={overlay.color}
            opacity={overlay.fillOpacity}
          />
          <polyline
            points={overlay.polylinePoints}
            fill="none"
            stroke={overlay.color}
            strokeWidth="0.95"
            opacity={overlay.strokeOpacity}
          />
        </g>
      ))}
      <polygon
        points={`${graphX},${eqFillBaseY} ${points} ${graphX + graphWidth},${eqFillBaseY}`}
        fill="var(--alpha-cyan-16)"
        opacity={eq.enabled ? 0.34 : 0.14}
      />
      <line
        x1={graphX}
        x2={graphX + graphWidth}
        y1={zeroLineY}
        y2={zeroLineY}
        stroke={ZERO_DB_GRID_LINE_COLOR}
        strokeWidth={ZERO_DB_GRID_LINE_WIDTH}
      />
      <polyline points={points} fill="none" stroke="var(--primitive-neutral-100)" strokeWidth="2.2" />
      {(["hpf", "lpf"] as const).map((filter) => {
        const enabled = filter === "hpf" ? eq.hpfEnabled : eq.lpfEnabled;
        const x = graphX + logFreqToX(filter === "hpf" ? eq.hpfFreq : eq.lpfFreq, graphWidth);
        const label = filter === "hpf" ? "H" : "L";
        const color = filter === "hpf" ? EQ_COLORS.hpf : EQ_COLORS.lpf;
        const isSelected = selected === filter;

        return (
          <g
            key={filter}
            onPointerDown={(event) => {
              if (disabled) return;
              event.preventDefault();
              event.stopPropagation();
              onSelect(filter);
              event.currentTarget.setPointerCapture(event.pointerId);
              eqDragRef.current.svgRect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
              eqDragRef.current.pendingFilter = filter;
              eqDragRef.current.pendingBandIndex = null;
              eqDragRef.current.pendingX = event.clientX;
              eqDragRef.current.pendingY = event.clientY;
              updateFilterFromRect(filter, event.clientX, event.clientY);
            }}
            onPointerMove={(event) => {
              if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
              event.preventDefault();
              event.stopPropagation();
              eqDragRef.current.pendingFilter = filter;
              eqDragRef.current.pendingX = event.clientX;
              eqDragRef.current.pendingY = event.clientY;
              scheduleEqUpdate();
            }}
            onPointerUp={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
              eqDragRef.current.svgRect = null;
            }}
            onPointerCancel={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
              eqDragRef.current.svgRect = null;
            }}
            style={{ cursor: disabled ? "not-allowed" : "ew-resize" }}
          >
            <line
              x1={x}
              x2={x}
              y1={graphY}
              y2={graphY + graphHeight}
              stroke={color}
              strokeWidth={isSelected ? 1.4 : 1}
              strokeDasharray="4 5"
              opacity={enabled ? 0.34 : 0.12}
            />
            <circle cx={x} cy={yForGain(0)} r={isSelected ? 18 : 12} fill="none" stroke={color} strokeWidth="1.8" opacity={isSelected ? 0.66 : 0.48} />
            <circle cx={x} cy={yForGain(0)} r={isSelected ? 16 : 10} fill={color} stroke={isSelected ? "#f8fafc" : "#0b1625"} strokeWidth="1.6" opacity={enabled ? 1 : 0.38} filter="url(#eq-handle-glow)" />
            <text x={x} y={yForGain(0)} fill="var(--text-inverse)" fontSize="12" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
              {label}
            </text>
          </g>
        );
      })}
      {eq.bands.map((band, index) => {
        const x = graphX + logFreqToX(band.freq, graphWidth);
        const y = yForGain(band.gain);
        const color = getEqBandColor(index);
        const isSelected = selected === index + 1;

        return (
          <g
            key={index}
            onPointerDown={(event) => {
              if (disabled) return;
              event.preventDefault();
              event.stopPropagation();
              onSelect(index + 1);
              event.currentTarget.setPointerCapture(event.pointerId);
              eqDragRef.current.svgRect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
              eqDragRef.current.pendingBandIndex = index;
              eqDragRef.current.pendingFilter = null;
              eqDragRef.current.pendingX = event.clientX;
              eqDragRef.current.pendingY = event.clientY;
              updateBandFromRect(index, event.clientX, event.clientY);
            }}
            onPointerMove={(event) => {
              if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
              event.preventDefault();
              event.stopPropagation();
              eqDragRef.current.pendingBandIndex = index;
              eqDragRef.current.pendingX = event.clientX;
              eqDragRef.current.pendingY = event.clientY;
              scheduleEqUpdate();
            }}
            onPointerUp={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
              eqDragRef.current.svgRect = null;
            }}
            onPointerCancel={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
              eqDragRef.current.svgRect = null;
            }}
            style={{ cursor: disabled ? "not-allowed" : "grab" }}
          >
            <circle cx={x} cy={y} r={isSelected ? 18 : 12} fill="none" stroke={color} strokeWidth="1.8" opacity={isSelected ? 0.68 : 0.5} />
            <circle cx={x} cy={y} r={isSelected ? 16 : 10} fill={color} stroke={isSelected ? "#f8fafc" : "#0b1625"} strokeWidth="1.6" opacity={eq.enabled && band.enabled ? 0.95 : 0.32} filter="url(#eq-handle-glow)" />
            <text x={x} y={y} fill="var(--text-inverse)" fontSize="12" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
              {index + 1}
            </text>
          </g>
        );
      })}
      </svg>
    </div>
  );
}

function GateEditor({
  gate,
  disabled,
  onChange,
  onReset,
  channelInputDb,
}: {
  gate: GateState;
  disabled?: boolean;
  onChange: (patch: Partial<GateState>) => void;
  onReset: () => void;
  channelInputDb?: number;
}) {
  const controllersDisabled = disabled || !gate.enabled;
  const metersDisabled = disabled || !gate.enabled;
  const gateMeterState = useGateMeters({
    inputDb: channelInputDb,
    thresholdDb: gate.threshold,
    attackMs: gate.attack,
    holdMs: gate.hold,
    decaySetting: gate.decay,
    enabled: gate.enabled,
  });
  const displayedGateGrDb = metersDisabled ? 0 : gateMeterState.visualGainReductionDb;
  const gateKnobPixelsPerStep = {
    threshold: 3,
    attack: 3,
    hold: 1.8,
    decay: 10,
  };

  return (
    <ProcessorShell title="">
      <div
        style={{
          minHeight: 0,
          height: "100%",
          display: "grid",
          gridTemplateRows: "minmax(0, 1fr) 216px",
          gap: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            minHeight: 0,
            display: "grid",
            gridTemplateRows: "44px minmax(0, 1fr)",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              borderRadius: 4,
              border: "none",
              background: "var(--surface-panel-raised)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ color: "var(--text-primary)", fontWeight: 700, letterSpacing: "1.2px", fontSize: 10 }}>GATE</div>
              <ToggleSwitch
                enabled={gate.enabled}
                disabled={disabled}
                onChange={(value) => onChange({ enabled: value })}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                disabled={disabled}
                onClick={onReset}
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid var(--button-default-border)",
                  background: "transparent",
                  color: "var(--button-default-text)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "1.2px",
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                RESET
              </button>
            </div>
          </div>

          <div
            style={{
              minHeight: 0,
              height: "100%",
              padding: 32,
              boxSizing: "border-box",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              alignItems: "stretch",
              gap: 12,
              borderRadius: 4,
              border: "none",
              background: "var(--surface-panel-raised)",
            }}
          >
            <GateGraph
              gate={gate}
              disabled={disabled}
              onThresholdChange={(threshold) => onChange({ threshold })}
              onAttackChange={(attack) => onChange({ attack })}
            />
            <div
              style={{
                minHeight: 0,
                height: "100%",
                display: "grid",
                gridTemplateColumns: "auto auto",
                columnGap: 8,
                alignItems: "stretch",
                justifyItems: "center",
                opacity: metersDisabled ? 0.45 : 1,
              }}
            >
              <div style={{ display: "grid", gridTemplateRows: "18px minmax(0, 1fr)", justifyItems: "center", minHeight: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", color: "var(--text-secondary)" }}>GR</div>
                <CompressorGainReductionMeterBar
                  meterDb={displayedGateGrDb}
                  accentColor={MODULE_ACCENTS.gate.color}
                  accentGlow={MODULE_ACCENTS.gate.glow}
                />
              </div>
              <div style={{ display: "grid", gridTemplateRows: "18px minmax(0, 1fr)", minHeight: 0 }}>
                <div />
                <CompressorMeterScale markers={COMP_GR_SCALE_MARKERS} showClip={false} />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            minHeight: 0,
            height: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 4,
            padding: "10px 12px",
            borderRadius: 4,
            border: "none",
            overflow: "visible",
            background: "var(--surface-panel-raised)",
            justifyItems: "center",
          }}
        >
          <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
            <EditableKnob
              label="THRESHOLD"
              value={Math.round(gate.threshold * 2)}
              min={-160}
              max={0}
              step={1}
              knobPixelsPerStep={gateKnobPixelsPerStep.threshold}
              knobSize={68}
              compact
              displayValue={gate.enabled ? formatDb(gate.threshold) : "—"}
              suffix="dB"
              disabled={controllersDisabled}
              accentColor={MODULE_ACCENTS.gate.color}
              glowColor={MODULE_ACCENTS.gate.glow}
              textValue={gate.threshold}
              textMin={-80}
              textMax={0}
              onTextCommit={(db) => onChange({ threshold: clamp(db, -80, 0) })}
              onChange={(thresholdHalfSteps) => onChange({ threshold: clamp(thresholdHalfSteps / 2, -80, 0) })}
            />
          </div>
          <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
            <EditableKnob
              label="ATTACK"
              value={Math.round(gate.attack)}
              min={3}
              max={200}
              knobPixelsPerStep={gateKnobPixelsPerStep.attack}
              knobSize={68}
              compact
              displayValue={gate.enabled ? formatMs(gate.attack) : "—"}
              suffix="ms"
              disabled={controllersDisabled}
              accentColor={MODULE_ACCENTS.gate.color}
              glowColor={MODULE_ACCENTS.gate.glow}
              onChange={(attack) => onChange({ attack })}
            />
          </div>
          <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
            <EditableKnob
              label="HOLD"
              value={Math.round(gate.hold)}
              min={0}
              max={530}
              knobPixelsPerStep={gateKnobPixelsPerStep.hold}
              knobSize={68}
              compact
              displayValue={gate.enabled ? formatMs(gate.hold) : "—"}
              suffix="ms"
              disabled={controllersDisabled}
              accentColor={MODULE_ACCENTS.gate.color}
              glowColor={MODULE_ACCENTS.gate.glow}
              onChange={(hold) => onChange({ hold })}
            />
          </div>
          <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
            <EditableKnob
              label="DECAY"
              value={gateDecayToStepIndex(gate.decay)}
              min={0}
              max={GATE_DECAY_STEPS.length - 1}
              step={1}
              knobPixelsPerStep={gateKnobPixelsPerStep.decay}
              knobVelocityResponsive={false}
              knobDiscreteStepMode={true}
              knobSize={68}
              compact
              displayValue={gate.enabled ? `x${snapGateDecay(gate.decay)}` : "—"}
              disabled={controllersDisabled}
              allowTextEdit={false}
              accentColor={MODULE_ACCENTS.gate.color}
              glowColor={MODULE_ACCENTS.gate.glow}
              onChange={(decayIndex) => onChange({ decay: gateDecayFromStepIndex(decayIndex) })}
            />
          </div>
        </div>
      </div>
    </ProcessorShell>
  );
}

function CompressorEditor({
  comp,
  disabled,
  onChange,
  onReset,
  channelInputDb,
  showMeters = true,
}: {
  comp: CompressorState;
  disabled?: boolean;
  onChange: (patch: Partial<CompressorState>) => void;
  onReset: () => void;
  channelInputDb?: number;
  // GR/OUT meters are only meaningful where the desk exposes real post-comp data
  // (channels). AUX/MASTER have no real GR/output, so hide those bars there.
  showMeters?: boolean;
}) {
  const controllersDisabled = disabled || !comp.enabled;
  const metersDisabled = disabled || !comp.enabled;
  const snappedThreshold = snapCompressorThreshold(comp.threshold);
  const snappedRatio = snapCompressorRatio(comp.ratio);
  const meterState = useCompressorMeters({
    inputDb: channelInputDb,
    thresholdDb: snappedThreshold,
    ratio: snappedRatio >= 40 ? Number.POSITIVE_INFINITY : snappedRatio,
    attackMs: comp.attack,
    releaseMs: comp.release,
    makeupDb: comp.gain,
    enabled: comp.enabled,
  });
  const displayedGrDb = metersDisabled ? 0 : meterState.visualGainReductionDb;
  const displayedOutDb = metersDisabled ? -75 : meterState.visualOutputDb;
  const outClipped = !metersDisabled && displayedOutDb >= 14;

  return (
    <ProcessorShell title="">
      <div
        style={{
          minHeight: 0,
          height: "100%",
          display: "grid",
          gridTemplateRows: "minmax(0, 1fr) 216px",
          gap: 4,
          overflow: "hidden",
        }}
      >
        {/* Graph section */}
        <div
          style={{
            minHeight: 0,
            display: "grid",
            gridTemplateRows: "44px minmax(0, 1fr)",
            gap: 4,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              borderRadius: 4,
              border: "none",
              background: "var(--surface-panel-raised)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ color: "var(--text-primary)", fontWeight: 700, letterSpacing: "1.2px", fontSize: 10 }}>COMPRESSOR</div>
              <ToggleSwitch
                enabled={comp.enabled}
                disabled={disabled}
                onChange={(value) => onChange({ enabled: value })}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                disabled={disabled}
                onClick={onReset}
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid var(--button-default-border)",
                  background: "transparent",
                  color: "var(--button-default-text)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "1.2px",
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                RESET
              </button>
            </div>
          </div>

          {/* Graph area */}
          <div
            style={{
              minHeight: 0,
              height: "100%",
              padding: 32,
              boxSizing: "border-box",
              display: "grid",
              gridTemplateColumns: showMeters ? "minmax(0, 1fr) auto" : "minmax(0, 1fr)",
              alignItems: "stretch",
              gap: 12,
              borderRadius: 4,
              border: "none",
              background: "var(--surface-panel-raised)",
            }}
          >
            <CompressorGraph comp={comp} disabled={disabled} onChange={onChange} />
            {showMeters && (
            <div
              style={{
                minHeight: 0,
                height: "100%",
                display: "grid",
                gridTemplateColumns: "auto auto auto auto",
                columnGap: 8,
                alignItems: "stretch",
                justifyItems: "center",
                opacity: metersDisabled ? 0.45 : 1,
              }}
            >
              <div style={{ display: "grid", gridTemplateRows: "18px minmax(0, 1fr)", justifyItems: "center", minHeight: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", color: "var(--text-secondary)" }}>GR</div>
                <CompressorGainReductionMeterBar meterDb={displayedGrDb} />
              </div>
              <div style={{ display: "grid", gridTemplateRows: "18px minmax(0, 1fr)", minHeight: 0 }}>
                <div />
                <CompressorMeterScale markers={COMP_GR_SCALE_MARKERS} showClip={false} />
              </div>
              <div style={{ display: "grid", gridTemplateRows: "18px minmax(0, 1fr)", justifyItems: "center", minHeight: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", color: "var(--text-secondary)" }}>OUT</div>
                <MeterBar meterDb={displayedOutDb} clipped={outClipped} />
              </div>
              <div style={{ display: "grid", gridTemplateRows: "18px minmax(0, 1fr)", minHeight: 0 }}>
                <div />
                <MeterScale clipped={outClipped} />
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Controllers area */}
        <div
          style={{
            minHeight: 0,
            height: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 4,
            padding: "10px 12px",
            borderRadius: 4,
            border: "none",
            overflow: "visible",
            background: "var(--surface-panel-raised)",
            justifyItems: "center",
          }}
        >
          <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
            <EditableKnob
              label="THRESHOLD"
              value={Math.round(snapCompressorThreshold(comp.threshold) * 2)}
              min={-160}
              max={0}
              step={1}
              knobSize={68}
              compact
              displayValue={comp.enabled ? formatDb(snapCompressorThreshold(comp.threshold)) : "—"}
              suffix="dB"
              disabled={controllersDisabled}
              accentColor={MODULE_ACCENTS.comp.color}
              glowColor={MODULE_ACCENTS.comp.glow}
              textValue={snapCompressorThreshold(comp.threshold)}
              textMin={-80}
              textMax={0}
              onTextCommit={(db) => {
                const threshold = snapCompressorThreshold(db);
                if (snapCompressorRatio(comp.ratio) >= 40) { onChange({ threshold, ratio: 40 }); return; }
                onChange({ threshold });
              }}
              onChange={(thresholdHalfSteps) => {
                const threshold = snapCompressorThreshold(thresholdHalfSteps / 2);

                if (snapCompressorRatio(comp.ratio) >= 40) {
                  onChange({ threshold, ratio: 40 });
                  return;
                }

                onChange({ threshold });
              }}
            />
          </div>
          <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
            <EditableKnob
              label="RATIO"
              value={compressorRatioToStepIndex(comp.ratio)}
              min={0}
              max={COMP_RATIO_STEPS.length - 1}
              step={1}
              knobPixelsPerStep={14}
              knobSize={68}
              compact
              displayValue={comp.enabled ? formatCompressorRatio(snapCompressorRatio(comp.ratio)) : "—"}
              disabled={controllersDisabled}
              allowTextEdit={false}
              accentColor={MODULE_ACCENTS.comp.color}
              glowColor={MODULE_ACCENTS.comp.glow}
              onChange={(ratioIndex) => onChange({ ratio: compressorRatioFromStepIndex(ratioIndex) })}
            />
          </div>
          <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
            <EditableKnob
              label="ATTACK"
              value={Math.round(comp.attack)}
              min={1}
              max={200}
              knobSize={68}
              compact
              displayValue={comp.enabled ? formatMs(comp.attack) : "—"}
              suffix="ms"
              disabled={controllersDisabled}
              accentColor={MODULE_ACCENTS.comp.color}
              glowColor={MODULE_ACCENTS.comp.glow}
              onChange={(attack) => onChange({ attack })}
            />
          </div>
          <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
            <EditableKnob
              label="RELEASE"
              value={Math.round(comp.release)}
              min={10}
              max={1000}
              knobValue={logValueToPosition(Math.round(comp.release), 10, 1000)}
              knobMin={logValueToPosition(10, 10, 1000)}
              knobMax={logValueToPosition(1000, 10, 1000)}
              knobPixelsPerStep={3}
              knobValueStep={0.02}
              knobSize={68}
              compact
              displayValue={comp.enabled ? formatMs(comp.release) : "—"}
              suffix="ms"
              disabled={controllersDisabled}
              accentColor={MODULE_ACCENTS.comp.color}
              glowColor={MODULE_ACCENTS.comp.glow}
              onTextCommit={(ms) => onChange({ release: clamp(Math.round(ms), 10, 1000) })}
              onChange={(releasePosition) =>
                onChange({ release: Math.round(logPositionToValue(releasePosition, 10, 1000)) })
              }
            />
          </div>
          <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
            <EditableKnob
              label="GAIN"
              value={Math.round(comp.gain)}
              min={0}
              max={20}
              knobSize={68}
              compact
              displayValue={comp.enabled ? formatDb(comp.gain) : "—"}
              suffix="dB"
              disabled={controllersDisabled}
              accentColor={MODULE_ACCENTS.comp.color}
              glowColor={MODULE_ACCENTS.comp.glow}
              onChange={(gain) => onChange({ gain })}
            />
          </div>
        </div>
      </div>
    </ProcessorShell>
  );
}

function EqEditor({
  eq,
  disabled,
  onChange,
  onBandChange,
  onReset,
}: {
  eq: EqState;
  disabled?: boolean;
  onChange: (patch: Partial<EqState>) => void;
  onBandChange: (band: number, patch: Partial<EqBandState>) => void;
  onReset: () => void;
}) {
  const [selectedBand, setSelectedBand] = useState(1);
  const [selectedNode, setSelectedNode] = useState<EqSelection>(null);
  const nodeButtons = useMemo(() => getEqNodeButtons(eq.bands.length), [eq.bands.length]);
  const eqVariantLabel = useMemo(() => getEqVariantLabel(eq.bands.length), [eq.bands.length]);

  useEffect(() => {
    if (eq.bands.length === 0) return;

    if (selectedBand > eq.bands.length) {
      setSelectedBand(eq.bands.length);
      setSelectedNode(eq.bands.length);
    }
  }, [eq.bands.length, selectedBand]);
  const band = eq.bands[selectedBand - 1];
  const selectorButtons = [
    ...nodeButtons.filter((node) => node.id === "hpf" || node.id === "lpf"),
    ...nodeButtons.filter((node) => typeof node.id === "number"),
  ];
  const selectedFilter =
    selectedNode === "hpf" ? "hpf" : selectedNode === "lpf" ? "lpf" : null;
  const selectedFilterColor =
    selectedFilter === "hpf"
      ? EQ_COLORS.hpf
      : selectedFilter === "lpf"
        ? EQ_COLORS.lpf
        : "#94a3b8";

  return (
    <ProcessorShell title="">
      <div
        style={{
          minHeight: 0,
          height: "100%",
          display: "grid",
          gridTemplateRows: "minmax(0, 1fr) 216px",
          gap: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            minHeight: 0,
            display: "grid",
            gridTemplateRows: "44px minmax(0, 1fr)",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              borderRadius: 4,
              border: "none",
              background: "var(--surface-panel-raised)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ color: "var(--text-primary)", fontWeight: 700, letterSpacing: "1.2px", fontSize: 10 }}>{eqVariantLabel}</div>
              <ToggleSwitch
                enabled={eq.enabled}
                disabled={disabled}
                onChange={(value) => onChange({ enabled: value })}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onReset();
                  setSelectedNode(null);
                }}
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid var(--button-default-border)",
                  background: "transparent",
                  color: "var(--button-default-text)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "1.2px",
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                RESET
              </button>
            </div>
          </div>

          <div
            style={{
              minHeight: 0,
              height: "100%",
              padding: 32,
              boxSizing: "border-box",
              display: "grid",
              alignContent: "stretch",
              borderRadius: 4,
              border: "none",
              background: "var(--surface-panel-raised)",
            }}
          >
            <EqGraph
              eq={eq}
              selected={selectedNode}
              disabled={disabled}
              onSelect={(selection) => {
                setSelectedNode(selection);
                if (typeof selection === "number") setSelectedBand(selection);
              }}
              onEqChange={onChange}
              onBandChange={onBandChange}
            />
          </div>
        </div>

        <div
          style={{
            minHeight: 0,
            height: "100%",
            display: "grid",
            gridTemplateColumns: "116px minmax(0, 1fr)",
            gap: 4,
            borderRadius: 4,
            border: "none",
            overflow: "visible",
            background: "transparent",
          }}
        >
          <div
            style={{
              padding: "16px 12px",
              borderLeft: `2px solid ${typeof selectedNode === 'number' ? getEqBandColor(selectedNode - 1) : selectedFilterColor}`,
              borderRadius: 4,
              border: "none",
              display: "grid",
              alignContent: "center",
              gap: 10,
              background: "var(--surface-panel)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, justifyItems: "center" }}>
              {selectorButtons.map((node) => (
                <button
                  key={String(node.id)}
                  type="button"
                  onClick={() => {
                    if (selectedNode === node.id) {
                      setSelectedNode(null);
                    } else {
                      setSelectedNode(node.id);
                      if (typeof node.id === "number") setSelectedBand(node.id);
                    }
                  }}
                  style={{
                    height: 22,
                    minWidth: 34,
                    borderRadius: 5,
                    border: `1px solid ${node.color}`,
                    background: selectedNode === node.id ? node.color : "transparent",
                    color: selectedNode === node.id ? "var(--text-inverse)" : node.color,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                    lineHeight: "12px",
                    letterSpacing: "1.2px",
                  }}
                >
                  {node.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ position: "relative", minHeight: 0, padding: "10px 12px", borderRadius: 4, border: "none", background: "var(--surface-panel-raised)" }}>
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 12,
                zIndex: 2,
              }}
            >
              {selectedNode === null ? (
                <div style={{ opacity: 0.5, pointerEvents: "none" }}>
                  <ToggleSwitch
                    enabled={false}
                    disabled={true}
                    onChange={() => {}}
                  />
                </div>
              ) : (
                <ToggleSwitch
                  enabled={
                    selectedFilter === "hpf"
                      ? eq.hpfEnabled
                      : selectedFilter === "lpf"
                        ? eq.lpfEnabled
                        : band.enabled
                  }
                  disabled={disabled}
                  onChange={(value) => {
                    if (selectedFilter === "hpf") {
                      onChange({ hpfEnabled: value });
                    } else if (selectedFilter === "lpf") {
                      onChange({ lpfEnabled: value });
                    } else {
                      onBandChange(selectedBand, { enabled: value });
                    }
                  }}
                />
              )}
            </div>

            {selectedFilter ? (
              <div style={{ height: "100%", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4 }}>
                <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
                <EditableKnob
                  label="FREQ"
                  value={snapEqFrequency(selectedFilter === "hpf" ? eq.hpfFreq : eq.lpfFreq)}
                  min={20}
                  max={20000}
                  knobValue={logValueToPosition(selectedFilter === "hpf" ? eq.hpfFreq : eq.lpfFreq, 20, 20000)}
                  knobMin={logValueToPosition(20, 20, 20000)}
                  knobMax={logValueToPosition(20000, 20, 20000)}
                  knobPixelsPerStep={3}
                  knobValueStep={0.02}
                  knobSize={68}
                  compact
                  displayValue={
                    selectedFilter === "hpf"
                      ? eq.hpfEnabled
                        ? formatFreq(eq.hpfFreq)
                        : "OFF"
                      : eq.lpfEnabled
                        ? formatFreq(eq.lpfFreq)
                        : "OFF"
                  }
                  suffix="Hz"
                  disabled={disabled}
                  accentColor="var(--semantic-danger-base)"
                  glowColor="var(--alpha-red-60)"
                  textValue={selectedFilter === "hpf" ? eq.hpfFreq : eq.lpfFreq}
                  textMin={20}
                  textMax={20000}
                  onTextCommit={(hz) =>
                    onChange(
                      selectedFilter === "hpf"
                        ? { hpfFreq: snapEqFrequency(Math.min(hz, eq.lpfFreq - 10)) }
                        : { lpfFreq: snapEqFrequency(Math.max(hz, eq.hpfFreq + 10)) }
                    )
                  }
                  onChange={(freqPosition) =>
                    onChange(
                      selectedFilter === "hpf"
                        ? {
                            hpfFreq: snapEqFrequency(
                              Math.min(logPositionToValue(freqPosition, 20, 20000), eq.lpfFreq - 10)
                            ),
                          }
                        : {
                            lpfFreq: snapEqFrequency(
                              Math.max(logPositionToValue(freqPosition, 20, 20000), eq.hpfFreq + 10)
                            ),
                          }
                    )
                  }
                />
                </div>
                <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
                <EditableKnob
                  label="TIPO"
                  value={filterTypeToStepIndex(selectedFilter === "hpf" ? eq.hpfType : eq.lpfType)}
                  min={1}
                  max={FILTER_TYPE_STEPS.length}
                  step={1}
                  knobPixelsPerStep={14}
                  knobVelocityResponsive={false}
                  knobDiscreteStepMode={true}
                  knobSize={68}
                  compact
                  displayValue={FILTER_TYPE_LABELS[selectedFilter === "hpf" ? eq.hpfType : eq.lpfType]}
                  disabled={disabled}
                  allowTextEdit={false}
                  accentColor="var(--semantic-danger-base)"
                  glowColor="var(--alpha-red-60)"
                  onChange={(index) => {
                    const type = filterTypeFromStepIndex(index);
                    onChange(selectedFilter === "hpf" ? { hpfType: type } : { lpfType: type });
                  }}
                />
                </div>
                <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
                <EditableKnob
                  label="SLOPE"
                  value={filterSlopeToStepIndex(selectedFilter === "hpf" ? eq.hpfSlope : eq.lpfSlope)}
                  min={1}
                  max={FILTER_SLOPE_STEPS.length}
                  step={1}
                  knobPixelsPerStep={16}
                  knobVelocityResponsive={false}
                  knobDiscreteStepMode={true}
                  knobSize={68}
                  compact
                  displayValue={`${selectedFilter === "hpf" ? eq.hpfSlope : eq.lpfSlope}dB/oct`}
                  disabled={disabled}
                  allowTextEdit={false}
                  accentColor="var(--semantic-danger-base)"
                  glowColor="var(--alpha-red-60)"
                  onChange={(index) => {
                    const slope = filterSlopeFromStepIndex(index);
                    onChange(selectedFilter === "hpf" ? { hpfSlope: slope } : { lpfSlope: slope });
                  }}
                />
                </div>
              </div>
            ) : (
              <div style={{ height: "100%", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4, opacity: selectedNode === null ? 0.52 : 1 }}>
                <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
                <EditableKnob
                  label="FREQ"
                  value={selectedNode === null ? 0 : snapEqFrequency(band.freq)}
                  min={20}
                  max={20000}
                  knobValue={selectedNode === null ? logValueToPosition(20, 20, 20000) : logValueToPosition(band.freq, 20, 20000)}
                  knobMin={logValueToPosition(20, 20, 20000)}
                  knobMax={logValueToPosition(20000, 20, 20000)}
                  knobPixelsPerStep={3}
                  knobValueStep={0.02}
                  knobSize={68}
                  compact
                  displayValue={selectedNode === null ? "—" : formatFreq(band.freq)}
                  suffix="Hz"
                  disabled={disabled || selectedNode === null}
                  accentColor="var(--semantic-danger-base)"
                  glowColor="var(--alpha-red-60)"
                  textValue={band.freq}
                  textMin={20}
                  textMax={20000}
                  onTextCommit={(hz) => onBandChange(selectedBand, { freq: snapEqFrequency(hz) })}
                  onChange={(freqPosition) =>
                    onBandChange(selectedBand, {
                      freq: snapEqFrequency(logPositionToValue(freqPosition, 20, 20000)),
                    })
                  }
                />
                </div>
                <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
                <EditableKnob
                  label="GAIN"
                  value={selectedNode === null ? -12 : Math.round(band.gain)}
                  min={-12}
                  max={12}
                  knobSize={68}
                  compact
                  displayValue={selectedNode === null ? "—" : formatDb(band.gain)}
                  suffix="dB"
                  disabled={disabled || selectedNode === null}
                  accentColor="var(--semantic-danger-base)"
                  glowColor="var(--alpha-red-60)"
                  onChange={(gain) => onBandChange(selectedBand, { gain })}
                />
                </div>
                <div style={{ display: "grid", justifyItems: "center", alignContent: "center", padding: "10px 10px 8px" }}>
                <EditableKnob
                  label="Q CURVE"
                  value={selectedNode === null ? 0 : Math.round(band.q * 10)}
                  min={6}
                  max={281}
                  step={1}
                  knobSize={68}
                  compact
                  displayValue={selectedNode === null ? "—" : Number(band.q.toFixed(2)).toString()}
                  disabled={disabled || selectedNode === null}
                  accentColor="var(--semantic-danger-base)"
                  glowColor="var(--alpha-red-60)"
                  textValue={band.q}
                  textMin={0.6}
                  textMax={28.1}
                  onTextCommit={(q) => onBandChange(selectedBand, { q: clamp(q, 0.6, 28.08) })}
                  onChange={(q) => onBandChange(selectedBand, { q: q / 10 })}
                />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProcessorShell>
  );
}

void GateMiniPreview;
void CompMiniPreview;
void EqMiniPreview;
void ControlButton;

export function ChannelProcessors({
  activeModule,
  state,
  disabled = false,
  hideComp = false,
  hideCompMeters = false,
  hideGate = false,
  hideSends = false,
  hideModuleTabs = false,
  moduleItems,
  customModuleContent,
  channelInputDb,
  sends,
  onModuleChange,
  onGateChange,
  onCompChange,
  onEqChange,
  onEqBandChange,
  onSendValueChange,
  onSendTapPointToggle,
  onResetGate,
  onResetComp,
  onResetEq,
}: ChannelProcessorsProps) {
  const defaultNavItems: Array<{ id: ProcessorModule; label: string }> = [
    { id: "eq", label: "EQ" },
    ...(!hideComp ? [{ id: "comp", label: "COMP" } as const] : []),
    ...(!hideGate ? [{ id: "gate", label: "GATE" } as const] : []),
    ...(!hideSends ? [{ id: "sends", label: "SENDS" } as const] : []),
  ];
  const navItems = moduleItems ?? defaultNavItems;
  const customActiveModuleContent = customModuleContent?.[activeModule];

  return (
    <div
      style={{
        minHeight: 0,
        height: "100%",
        display: "grid",
        gridTemplateRows: hideModuleTabs ? "minmax(0, 1fr)" : "32px minmax(0, 1fr)",
        gap: 0,
      }}
    >
      {!hideModuleTabs && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                onModuleChange(item.id);
              }}
              style={{
                height: 32,
                padding: "0 16px",
                borderRadius: 0,
                border: "none",
                borderBottom:
                  activeModule === item.id
                    ? "2px solid var(--border-focus)"
                    : "2px solid transparent",
                background: "transparent",
                color:
                  activeModule === item.id
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                fontSize: 10,
                lineHeight: "12px",
                fontWeight: 700,
                letterSpacing: "1.2px",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: 1,
                whiteSpace: "nowrap",
                width: "100%",
                justifySelf: "stretch",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          minWidth: 0,
          minHeight: 0,
          marginTop: hideModuleTabs ? 0 : 24,
          padding: 0,
          borderRadius: 0,
          border: "none",
          background: "transparent",
          overflow: activeModule === "sends" ? "visible" : "hidden",
        }}
      >
        {!customActiveModuleContent && activeModule === "gate" && (
          <GateEditor
            gate={state.gate}
            disabled={disabled}
            onChange={onGateChange}
            onReset={onResetGate}
            channelInputDb={channelInputDb}
          />
        )}

        {!customActiveModuleContent && activeModule === "comp" && (
          <CompressorEditor
            comp={state.comp}
            disabled={disabled}
            onChange={onCompChange}
            onReset={onResetComp}
            channelInputDb={channelInputDb}
            showMeters={!hideCompMeters}
          />
        )}

        {!customActiveModuleContent && activeModule === "eq" && (
          <EqEditor
            eq={state.eq}
            disabled={disabled}
            onChange={onEqChange}
            onBandChange={onEqBandChange}
            onReset={onResetEq}
          />
        )}

        {!customActiveModuleContent && activeModule === "sends" && sends && (
          <div
            style={{
              minHeight: 0,
              height: "100%",
              width: `calc(100% + ${SENDS_RIGHT_BLEED_PX}px)`,
              marginRight: `-${SENDS_RIGHT_BLEED_PX}px`,
            }}
          >
            <SendsEditor
              sends={sends}
              disabled={disabled}
              onSendValueChange={onSendValueChange}
              onSendTapPointToggle={onSendTapPointToggle}
            />
          </div>
        )}

        {customActiveModuleContent}
      </div>
    </div>
  );
}
