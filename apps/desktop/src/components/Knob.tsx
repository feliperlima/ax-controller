import { useId, useRef } from "react";

type KnobProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  displayValue: string;
  variant?: "gain" | "pan";
  size?: number;
  pixelsPerStep?: number;
  accentColor?: string;
  glowColor?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

const MIN_DEG = -135;
const MAX_DEG = 135;
const TOTAL_DEG = 270;

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polarToXY(cx, cy, r, startDeg);
  const end = polarToXY(cx, cy, r, endDeg);
  const spanDeg = ((endDeg - startDeg) + 360) % 360;
  const largeArc = spanDeg > 180 ? 1 : 0;
  const sweep = 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

export function Knob({
  label,
  value,
  min,
  max,
  displayValue,
  variant = "gain",
  size = 44,
  pixelsPerStep = 6,
  accentColor,
  glowColor,
  disabled = false,
  onChange,
}: KnobProps) {
  const id = useId();
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startValue: number;
    previousUserSelect: string;
  } | null>(null);

  const normalized = (value - min) / (max - min);
  const angleDeg = MIN_DEG + normalized * TOTAL_DEG;

  const cx = size / 2;
  const cy = size / 2;
  const bodyR = size / 2 - 5;
  const arcR = bodyR + 3.5;
  const strokeW = 3;

  const bgArcPath = describeArc(cx, cy, arcR, MIN_DEG, MAX_DEG);

  let activeArcPath = "";
  const arcColor = accentColor ?? "var(--knob-arc-active)";
  const knobGlowColor = glowColor ?? accentColor ?? "#38bdf8";

  if (variant === "gain") {
    if (angleDeg > MIN_DEG) {
      activeArcPath = describeArc(cx, cy, arcR, MIN_DEG, angleDeg);
    }
  } else {
    const centerDeg = 0;
    if (angleDeg < centerDeg - 1) {
      activeArcPath = describeArc(cx, cy, arcR, angleDeg, centerDeg);
    } else if (angleDeg > centerDeg + 1) {
      activeArcPath = describeArc(cx, cy, arcR, centerDeg, angleDeg);
    }
  }

  const indicatorStart = polarToXY(cx, cy, bodyR * 0.1, angleDeg);
  const indicatorEnd = polarToXY(cx, cy, bodyR * 0.58, angleDeg);

  function clampValue(nextValue: number) {
    return Math.max(min, Math.min(max, nextValue));
  }

  function updateFromPointer(clientY: number) {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaY = drag.startY - clientY;
    const steps = Math.trunc(deltaY / pixelsPerStep);
    const nextValue = clampValue(drag.startValue + steps);
    if (nextValue !== value) onChange(nextValue);
  }

  function finishDrag() {
    const drag = dragRef.current;
    if (!drag) return;
    document.body.style.userSelect = drag.previousUserSelect;
    dragRef.current = null;
  }

  return (
    <div
      style={{
        textAlign: "center",
        opacity: disabled ? 0.5 : 1,
        display: "grid",
        gridTemplateRows: "12px auto 12px",
        alignItems: "center",
        justifyItems: "center",
        rowGap: "8px",
        width: size,
        minWidth: size,
        height: size + 40,
        boxSizing: "border-box",
        padding: "4px 0",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: "var(--knob-label)",
          opacity: 0.9,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "1.2px",
        }}
      >
        {label}
      </div>

      <svg
        width={size}
        height={size}
        style={{
          display: "block",
          cursor: disabled ? "not-allowed" : "ns-resize",
          touchAction: "none",
          userSelect: "none",
          overflow: "visible",
        }}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          dragRef.current = {
            pointerId: e.pointerId,
            startY: e.clientY,
            startValue: value,
            previousUserSelect: document.body.style.userSelect,
          };
          document.body.style.userSelect = "none";
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragRef.current?.pointerId !== e.pointerId) return;
          updateFromPointer(e.clientY);
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragRef.current?.pointerId === e.pointerId) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
          finishDrag();
        }}
        onPointerCancel={(e) => {
          e.preventDefault();
          e.stopPropagation();
          finishDrag();
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowUp") {
            e.preventDefault();
            e.stopPropagation();
            onChange(clampValue(value + 1));
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            e.stopPropagation();
            onChange(clampValue(value - 1));
          }
        }}
      >
        <defs>
          <radialGradient id={`kg-${id}`} cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="var(--knob-body-light)" />
            <stop offset="42%" stopColor="var(--knob-body-mid)" />
            <stop offset="100%" stopColor="var(--knob-body-dark)" />
          </radialGradient>
          <filter id={`kglow-${id}`} x="-120%" y="-120%" width="340%" height="340%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={knobGlowColor} floodOpacity="0.45" />
          </filter>
        </defs>

        <path
          d={bgArcPath}
          fill="none"
          stroke="var(--knob-arc-base)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {activeArcPath && (
          <path
            d={activeArcPath}
            fill="none"
            stroke={arcColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            filter={`url(#kglow-${id})`}
          />
        )}

        <circle cx={cx} cy={cy} r={bodyR} fill={`url(#kg-${id})`} stroke="var(--knob-border)" strokeWidth={1} />

        <circle cx={cx} cy={cy - 1} r={bodyR - 1.5} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.8} />

        <line
          x1={indicatorStart.x}
          y1={indicatorStart.y}
          x2={indicatorEnd.x}
          y2={indicatorEnd.y}
          stroke="var(--knob-indicator)"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </svg>

      <div
        style={{
          fontSize: "10px",
          color: "var(--knob-value)",
          fontWeight: 700,
          lineHeight: "12px",
          letterSpacing: "1.2px",
        }}
      >
        {displayValue}
      </div>
    </div>
  );
}
