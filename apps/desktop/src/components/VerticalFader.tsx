import { useEffect, useRef, useState } from "react";

type VerticalFaderProps = {
  value: number;
  height: number | string;
  width: number;
  disabled?: boolean;
  snapPoints?: number[];
  snapThreshold?: number;
  zeroMarkerValue?: number;
  showZeroMarker?: boolean;
  layoutWidth?: number;
  thumbVariant?: "default" | "master";
  thumbIndicatorColor?: string;
  dragFromThumbOnly?: boolean;
  onChange: (value: number) => void;
};

export function VerticalFader({
  value,
  height,
  width,
  disabled = false,
  snapPoints,
  snapThreshold = 1.6,
  zeroMarkerValue = 90,
  showZeroMarker = true,
  layoutWidth,
  thumbVariant = "default",
  thumbIndicatorColor,
  dragFromThumbOnly = false,
  onChange,
}: VerticalFaderProps) {
  const faderRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  const isDraggingRef = useRef(false);
  const pendingValueRef = useRef(value);
  const lastEmittedValueRef = useRef(value);
  const frameRef = useRef<number | null>(null);
  const [displayValue, setDisplayValue] = useState(value);
  const THUMB_WIDTH = 32;
  const THUMB_HEIGHT = 50;
  const THUMB_HALF = THUMB_HEIGHT / 2;
  const TRACK_PADDING_Y = 16;
  const ZERO_MARKER_WIDTH = 8;
  const ZERO_MARKER_GAP = 2;
  const MARKER_OVERHANG_PER_SIDE = ZERO_MARKER_GAP + ZERO_MARKER_WIDTH;
  const TOTAL_WIDTH = width + MARKER_OVERHANG_PER_SIDE * 2;
  const renderedWidth = layoutWidth ?? TOTAL_WIDTH;
  const ZERO_MARKER_OUTSIDE_OFFSET = width / 2 + ZERO_MARKER_GAP;
  const zeroMarkerTop = `calc(${THUMB_HALF}px + ${(100 - zeroMarkerValue) / 100} * (100% - ${THUMB_HEIGHT}px))`;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isDraggingRef.current) return;

    pendingValueRef.current = value;
    lastEmittedValueRef.current = value;
    setDisplayValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  function clamp(nextValue: number) {
    return Math.max(0, Math.min(100, nextValue));
  }

  function applySnap(nextValue: number) {
    if (!snapPoints || snapPoints.length === 0) {
      return nextValue;
    }

    let closest = nextValue;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const snapPoint of snapPoints) {
      const distance = Math.abs(nextValue - snapPoint);
      if (distance < minDistance) {
        minDistance = distance;
        closest = snapPoint;
      }
    }

    if (minDistance <= snapThreshold) {
      return closest;
    }

    return nextValue;
  }

  function emitChange(nextValue: number, force = false) {
    if (!force && Math.abs(nextValue - lastEmittedValueRef.current) < 0.05) {
      return;
    }

    lastEmittedValueRef.current = nextValue;
    onChangeRef.current(nextValue);
  }

  function scheduleChange(nextValue: number) {
    pendingValueRef.current = nextValue;

    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      emitChange(pendingValueRef.current);
    });
  }

  function finishDrag() {
    isDraggingRef.current = false;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    emitChange(pendingValueRef.current, true);
  }

  function updateFromClientY(clientY: number) {
    const element = faderRef.current;
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const travelHeight = rect.height - THUMB_HEIGHT;
    const distanceFromBottom = rect.bottom - clientY;
    const rawValue = clamp(((distanceFromBottom - THUMB_HALF) / travelHeight) * 100);
    const snappedValue = applySnap(rawValue);
    const nextValue = clamp(snappedValue);

    setDisplayValue(nextValue);
    scheduleChange(nextValue);

    return nextValue;
  }

  return (
    <div
      ref={faderRef}
      role="slider"
      data-thumb-only-drag={dragFromThumbOnly ? "true" : "false"}
      data-drag-scroll-priority={dragFromThumbOnly ? undefined : "control"}
      tabIndex={disabled ? -1 : 0}
      aria-label="Fader"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={displayValue}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        if (dragFromThumbOnly) {
          const target = event.target;
          const thumbElement = thumbRef.current;

          if (!thumbElement || !(target instanceof Node) || !thumbElement.contains(target)) {
            return;
          }
        }

        event.preventDefault();
        event.stopPropagation();
        if (disabled) return;
        isDraggingRef.current = true;
        pendingValueRef.current = displayValue;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromClientY(event.clientY);
      }}
      onPointerMove={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) {
          return;
        }
        updateFromClientY(event.clientY);
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        finishDrag();
      }}
      onPointerCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        finishDrag();
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          const nextValue = clamp(displayValue + 1);
          setDisplayValue(nextValue);
          emitChange(nextValue, true);
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          const nextValue = clamp(displayValue - 1);
          setDisplayValue(nextValue);
          emitChange(nextValue, true);
        }
      }}
      style={{
        position: "relative",
        width: renderedWidth,
        height,
        cursor: disabled ? "not-allowed" : dragFromThumbOnly ? "default" : "ns-resize",
        opacity: disabled ? 0.55 : 1,
        touchAction: "none",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width,
          backgroundColor: "var(--fader-track)",
          borderRadius: "4px",
          padding: `${TRACK_PADDING_Y}px 8px`,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 6,
            height: "100%",
            backgroundColor: "var(--meter-background)",
            borderBottomLeftRadius: "4px",
            borderBottomRightRadius: "4px",
            display: "flex",
            justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: 2.5,
              height: "100%",
              backgroundColor: "var(--fader-rail)",
            }}
          />
          <div
            style={{
              width: 2.5,
              height: "100%",
              backgroundColor: "var(--fader-rail)",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              transform: "translateX(-50%)",
              width: 6,
              height: `${displayValue}%`,
              borderBottomLeftRadius: "4px",
              borderBottomRightRadius: "4px",
              borderTopLeftRadius: "0px",
              borderTopRightRadius: "0px",
              background:
                thumbVariant === "master"
                  ? "#991b1b"
                  : "var(--fader-rail-active)",
              boxShadow: "0 0 12px rgba(56,189,248,0.45)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {showZeroMarker && (
        <>
          <div
            style={{
              position: "absolute",
              left: `calc(50% - ${ZERO_MARKER_OUTSIDE_OFFSET + ZERO_MARKER_WIDTH}px)`,
              top: zeroMarkerTop,
              width: ZERO_MARKER_WIDTH,
              height: 1,
              backgroundColor: "var(--fader-thumb-line)",
              boxShadow: "0 0 2px rgba(241,245,249,0.7)",
              pointerEvents: "none",
              zIndex: 9,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `calc(50% + ${ZERO_MARKER_OUTSIDE_OFFSET}px)`,
              top: zeroMarkerTop,
              width: ZERO_MARKER_WIDTH,
              height: 1,
              backgroundColor: "var(--fader-thumb-line)",
              boxShadow: "0 0 2px rgba(241,245,249,0.7)",
              pointerEvents: "none",
              zIndex: 9,
            }}
          />
        </>
      )}

      <div
        ref={thumbRef}
        data-drag-scroll-priority="thumb"
        style={{
          position: "absolute",
          left: "50%",
          transform: "translate(-50%, -50%)",
          top: `calc(${THUMB_HALF}px + ${(100 - displayValue) / 100} * (100% - ${THUMB_HEIGHT}px))`,
          width: THUMB_WIDTH,
          height: THUMB_HEIGHT,
          borderRadius: "4px",
          border: "1px solid var(--fader-thumb-border)",
          background:
            thumbVariant === "master"
              ? "linear-gradient(180deg, #945b5b 0%, #290f0f 100%)"
              : "linear-gradient(180deg, var(--fader-thumb-top) 0%, var(--fader-thumb-mid) 45%, #1b1f25 100%)",
          boxShadow: "0px 8px 12px rgba(0,0,0,0.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          cursor: disabled ? "not-allowed" : "ns-resize",
        }}
      >
        <div
          style={{
            width: 17,
            height: 2,
            borderRadius: "999px",
            backgroundColor: thumbIndicatorColor
              ? thumbIndicatorColor
              : "var(--fader-thumb-line)",
            boxShadow: "0 0 4px rgba(255,255,255,0.4)",
          }}
        />
      </div>
    </div>
  );
}
