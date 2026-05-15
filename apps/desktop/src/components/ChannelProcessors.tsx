import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Knob } from "./Knob";

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

export type ProcessorModule = "gate" | "comp" | "eq";

type ChannelProcessorsProps = {
  activeModule: ProcessorModule;
  state: ProcessorState;
  disabled?: boolean;
  hideGate?: boolean;
  onModuleChange: (module: ProcessorModule) => void;
  onGateChange: (patch: Partial<GateState>) => void;
  onCompChange: (patch: Partial<CompressorState>) => void;
  onEqChange: (patch: Partial<EqState>) => void;
  onEqBandChange: (band: number, patch: Partial<EqBandState>) => void;
  onResetGate: () => void;
  onResetComp: () => void;
  onResetEq: () => void;
};


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
  gridAccent: "rgba(56,189,248,0.45)",
  axisLabel: "#94a3b8",
  curveStroke: "#f8fafc",
  curveFill: "#e2e8f0",
  handleText: "#ffffff",
};
const HANDLE_THEME = {
  threshold: "#fbbf24",
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
  comp: { color: "#f59e0b", glow: "rgba(245,158,11,0.35)" },
  eq: { color: "#22d3ee", glow: "rgba(34,211,238,0.35)" },
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

function snapGateDecay(value: number) {
  const allowed = [2, 4, 6, 8, 16, 32];
  const rounded = Math.round(value);

  return allowed.reduce((closest, option) =>
    Math.abs(option - rounded) < Math.abs(closest - rounded) ? option : closest
  );
}

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;

  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };

  return point.matrixTransform(matrix.inverse());
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
  knobPixelsPerStep = 6,
  knobSize = 44,
  displayValue,
  suffix,
  accentColor,
  glowColor,
  disabled = false,
  compact = false,
  allowTextEdit = true,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  knobPixelsPerStep?: number;
  knobSize?: number;
  displayValue: string;
  suffix?: string;
  accentColor?: string;
  glowColor?: string;
  disabled?: boolean;
  compact?: boolean;
  allowTextEdit?: boolean;
  onChange: (value: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!isEditing) setDraft(String(value));
  }, [isEditing, value]);

  function commit() {
    const parsed = Number(draft);
    const nextValue = Number.isFinite(parsed) ? clamp(parsed, min, max) : value;
    setDraft(String(nextValue));
    setIsEditing(false);
    onChange(nextValue);
  }

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: compact ? 4 : 6, width: knobSize, minWidth: knobSize }}>
      <Knob
        label={label}
        value={value}
        min={min}
        max={max}
        displayValue=""
        size={knobSize}
        pixelsPerStep={knobPixelsPerStep}
        accentColor={accentColor}
        glowColor={glowColor}
        disabled={disabled}
        onChange={onChange}
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

function ModuleHeaderActions({
  enabled,
  disabled,
  accentColor,
  accentGlow,
  onLabel,
  offLabel,
  onToggle,
  onReset,
}: {
  enabled: boolean;
  disabled?: boolean;
  accentColor: string;
  accentGlow: string;
  onLabel: string;
  offLabel: string;
  onToggle: () => void;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        display: "flex",
        gap: 6,
        zIndex: 4,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        style={{
          minWidth: 76,
          padding: "5px 10px",
          borderRadius: 999,
          border: enabled ? `1px solid ${accentColor}` : "1px solid #334155",
          background: enabled ? "#0b1f17" : "#111827",
          color: enabled ? "#f8fafc" : "#cbd5e1",
          fontWeight: 950,
          fontSize: 11,
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: enabled ? `0 0 10px ${accentGlow}` : "none",
        }}
      >
        {enabled ? onLabel : offLabel}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={onReset}
        style={{
          minWidth: 64,
          padding: "5px 10px",
          borderRadius: 999,
          border: "1px solid #334155",
          background: "linear-gradient(180deg, #111b27 0%, #0d1621 100%)",
          color: "#e5eef5",
          fontWeight: 950,
          fontSize: 11,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        RESET
      </button>
    </div>
  );
}

function GateGraph({
  gate,
  disabled,
  onThresholdChange,
}: {
  gate: GateState;
  disabled?: boolean;
  onThresholdChange: (value: number) => void;
}) {
  const width = 560;
  const height = 270;
  const graphX = 42;
  const graphY = 18;
  const graphWidth = 486;
  const graphHeight = 210;
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

  function updateFromEvent(clientX: number, clientY: number, svg: SVGSVGElement) {
    const point = getSvgPoint(svg, clientX, clientY);
    const y = clamp(point.y - graphY, 0, graphHeight);
    const db = -Math.round((y / graphHeight) * 80);

    onThresholdChange(db);
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        borderRadius: 10,
        background: CHART_THEME.graphBackground,
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
      </defs>

      <rect x={graphX} y={graphY} width={graphWidth} height={graphHeight} fill={CHART_THEME.graphPanel} />
      {Array.from({ length: 9 }, (_, index) => (
        <g key={index}>
          <line
            x1={graphX}
            x2={graphX + graphWidth}
            y1={graphY + (graphHeight / 8) * index}
            y2={graphY + (graphHeight / 8) * index}
            stroke={index % 2 === 0 ? CHART_THEME.gridMajor : CHART_THEME.gridMinor}
            strokeWidth={index % 2 === 0 ? "1" : "0.9"}
            strokeDasharray={index % 2 === 0 ? undefined : "4 4"}
          />
          <text x={graphX - 14} y={graphY + (graphHeight / 8) * index + 4} fill={CHART_THEME.axisLabel} fontSize="9" textAnchor="end" fontWeight="500">
            {-index * 10}
          </text>
        </g>
      ))}
      {Array.from({ length: 8 }, (_, index) => (
        <line
          key={index}
          x1={graphX + (graphWidth / 7) * index}
          x2={graphX + (graphWidth / 7) * index}
          y1={graphY}
          y2={graphY + graphHeight}
          stroke={index % 2 === 0 ? CHART_THEME.gridMajor : CHART_THEME.gridMinor}
          strokeWidth={index % 2 === 0 ? "1" : "0.9"}
          strokeDasharray={index % 2 === 0 ? undefined : "4 4"}
        />
      ))}

      <path d={envelopePath} fill={GATE_THEME.fill} opacity={gate.enabled ? 0.28 : 0.1} />
      <path d={envelopeOutline} fill="none" stroke={GATE_THEME.primarySoft} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity={gate.enabled ? 0.9 : 0.3} />

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
        style={{ cursor: disabled ? "not-allowed" : "ns-resize" }}
        onPointerDown={(event) => {
          if (disabled) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromEvent(event.clientX, event.clientY, event.currentTarget.ownerSVGElement as SVGSVGElement);
        }}
        onPointerMove={(event) => {
          if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          event.preventDefault();
          event.stopPropagation();
          updateFromEvent(event.clientX, event.clientY, event.currentTarget.ownerSVGElement as SVGSVGElement);
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
      >
        <circle cx={graphX + 18} cy={thresholdY} r={17} fill="none" stroke={GATE_THEME.primarySoft} strokeWidth="2" opacity={gate.enabled ? 0.45 : 0.15} />
        <circle cx={graphX + 18} cy={thresholdY} r={12} fill={GATE_THEME.primary} stroke={gate.enabled ? "#f8fafc" : HANDLE_THEME.idleStroke} strokeWidth="2" opacity={gate.enabled ? 0.95 : 0.35} filter="url(#gate-threshold-glow)" />
        <text x={graphX + 18} y={thresholdY} fill={CHART_THEME.handleText} fontSize="12" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
          T
        </text>
      </g>
    </svg>
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
  const width = 560;
  const height = 270;
  const graphX = 42;
  const graphY = 18;
  const graphWidth = 486;
  const graphHeight = 210;
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
  const path = `M ${graphX} ${graphY + graphHeight} L ${thresholdX} ${thresholdY} L ${graphX + graphWidth} ${endY}`;

  function updateThresholdFromEvent(clientX: number, svg: SVGSVGElement) {
    const point = getSvgPoint(svg, clientX, 0);
    const x = clamp(point.x - graphX, 0, graphWidth);
    const threshold = snapCompressorThreshold((x / graphWidth) * 80 - 80);

    if (snappedRatio >= 40) {
      onChange({ threshold, ratio: 40 });
      return;
    }

    onChange({ threshold });
  }

  function updateRatioFromEvent(clientY: number, svg: SVGSVGElement) {
    const point = getSvgPoint(svg, 0, clientY);
    const y = clamp(point.y - graphY, 0, graphHeight);
    const outDb = -Math.round((y / graphHeight) * 80);
    const inputDelta = Math.max(0.5, 0 - snappedThreshold);
    const outputDelta = Math.max(0.5, outDb - snappedThreshold);
    const rawRatio = inputDelta / outputDelta;
    const ratio = snapCompressorRatio(rawRatio);
    onChange({ ratio });
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        borderRadius: 10,
        background: CHART_THEME.graphBackground,
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
      <rect x={graphX} y={graphY} width={graphWidth} height={graphHeight} fill={CHART_THEME.graphPanel} />
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
            stroke={db === 0 ? CHART_THEME.gridAccent : CHART_THEME.gridMajor}
            strokeWidth="1"
          />
          <text x={graphX - 14} y={yForDb(db) + 4} fill={CHART_THEME.axisLabel} fontSize="9" textAnchor="end" fontWeight="500">
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
          <text x={xForDb(db)} y={graphY + graphHeight + 22} fill={CHART_THEME.axisLabel} fontSize="9" textAnchor="middle" fontWeight="500">
            {db}
          </text>
        </g>
      ))}
      <path d={`${path} L ${graphX + graphWidth} ${graphY + graphHeight} Z`} fill="#b45309" opacity={comp.enabled ? 0.14 : 0.05} />
      <path d={path} fill="none" stroke={CHART_THEME.curveStroke} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" opacity={comp.enabled ? 0.92 : 0.35} />

      {/* T handle — controls Threshold (horizontal) */}
      <g
        style={{ cursor: disabled ? "not-allowed" : "ew-resize" }}
        onPointerDown={(event) => {
          if (disabled) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          updateThresholdFromEvent(event.clientX, event.currentTarget.ownerSVGElement as SVGSVGElement);
        }}
        onPointerMove={(event) => {
          if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          event.preventDefault();
          event.stopPropagation();
          updateThresholdFromEvent(event.clientX, event.currentTarget.ownerSVGElement as SVGSVGElement);
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
      >
        <circle cx={thresholdX} cy={thresholdY} r={17} fill="none" stroke={HANDLE_THEME.threshold} strokeWidth="2" opacity={comp.enabled ? 0.45 : 0.18} />
        <circle cx={thresholdX} cy={thresholdY} r={12} fill={HANDLE_THEME.threshold} stroke={comp.enabled ? "#f8fafc" : HANDLE_THEME.idleStroke} strokeWidth="2" opacity={comp.enabled ? 0.95 : 0.4} filter="url(#comp-threshold-glow)" />
        <text x={thresholdX} y={thresholdY} fill={CHART_THEME.handleText} fontSize="12" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
          T
        </text>
      </g>

      {/* R handle — controls Ratio (vertical, pinned to right edge) */}
      <g
        style={{ cursor: disabled ? "not-allowed" : "ns-resize" }}
        onPointerDown={(event) => {
          if (disabled) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          updateRatioFromEvent(event.clientY, event.currentTarget.ownerSVGElement as SVGSVGElement);
        }}
        onPointerMove={(event) => {
          if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          event.preventDefault();
          event.stopPropagation();
          updateRatioFromEvent(event.clientY, event.currentTarget.ownerSVGElement as SVGSVGElement);
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
      >
        <circle cx={graphX + graphWidth} cy={endY} r={17} fill="none" stroke={HANDLE_THEME.ratio} strokeWidth="2" opacity={comp.enabled ? 0.42 : 0.16} />
        <circle cx={graphX + graphWidth} cy={endY} r={12} fill={HANDLE_THEME.ratio} stroke={comp.enabled ? "#f8fafc" : HANDLE_THEME.idleStroke} strokeWidth="2" opacity={comp.enabled ? 0.9 : 0.38} filter="url(#comp-ratio-glow)" />
        <text x={graphX + graphWidth} y={endY} fill={CHART_THEME.handleText} fontSize="12" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
          R
        </text>
      </g>
    </svg>
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

  const width = Math.max(360, responsiveSize.width);
  const height = Math.max(180, responsiveSize.height);
  const graphX = 48;
  const graphY = 32;
  const graphWidth = Math.max(220, width - graphX * 2);
  const graphHeight = height - 64;
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
  const points = Array.from({ length: 160 }, (_, index) => {
    const freq = xToDisplayFreq((graphWidth / 159) * index, graphWidth);
    const gain = eqMagnitudeDb(freq, eq);

    return `${graphX + (graphWidth / 159) * index},${yForGain(gain)}`;
  }).join(" ");
  const zeroLineY = yForGain(0);
  const bandOverlays = eq.bands
    .map((band, index) => {
      if (!eq.enabled || !band.enabled || Math.abs(band.gain) < 0.05) {
        return null;
      }

      const overlayPoints = Array.from({ length: 120 }, (_, pointIndex) => {
        const x = (graphWidth / 119) * pointIndex;
        const freq = xToDisplayFreq(x, graphWidth);
        const gain = clamp(peakingEqMagnitudeDb(freq, band), -24, 18);

        return {
          x: graphX + x,
          y: yForGain(gain),
        };
      });

      const polylinePoints = overlayPoints.map((point) => `${point.x},${point.y}`).join(" ");
      const fillPoints = [
        `${overlayPoints[0].x},${zeroLineY}`,
        ...overlayPoints.map((point) => `${point.x},${point.y}`),
        `${overlayPoints[overlayPoints.length - 1].x},${zeroLineY}`,
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

  function updateBandFromEvent(bandIndex: number, clientX: number, clientY: number, svg: SVGSVGElement) {
    const point = getSvgPoint(svg, clientX, clientY);
    const x = clamp(point.x - graphX, 0, graphWidth);
    const y = clamp(point.y - graphY, 0, graphHeight);

    onBandChange(bandIndex + 1, {
      freq: xToActiveFreq(x, graphWidth),
      gain: Math.round(gainForY(y) * 10) / 10,
    });
  }

  function updateFilterFromEvent(
    filter: "hpf" | "lpf",
    clientX: number,
    clientY: number,
    svg: SVGSVGElement
  ) {
    const point = getSvgPoint(svg, clientX, clientY);
    const x = clamp(point.x - graphX, 0, graphWidth);
    const freq = xToActiveFreq(x, graphWidth);

    if (filter === "hpf") {
      onEqChange({
        hpfEnabled: true,
        hpfFreq: clamp(Math.min(freq, eq.lpfFreq - 10), EQ_ACTIVE_MIN_FREQ, EQ_ACTIVE_MAX_FREQ),
      });
    } else {
      onEqChange({
        lpfEnabled: true,
        lpfFreq: clamp(Math.max(freq, eq.hpfFreq + 10), EQ_ACTIVE_MIN_FREQ, EQ_ACTIVE_MAX_FREQ),
      });
    }
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
      <rect
        x={graphX}
        y={zeroLineY}
        width={graphWidth}
        height={graphY + graphHeight - zeroLineY}
        fill="url(#eq-fill-base)"
        opacity={eq.enabled ? 0.88 : 0.34}
      />
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
          <line
            x1={graphX}
            x2={graphX + graphWidth}
            y1={yForGain(gain)}
            y2={yForGain(gain)}
            stroke={gain === 0 ? "rgba(241,245,249,0.82)" : "rgba(52,83,108,0.42)"}
            strokeWidth={gain === 0 ? "1.5" : "1"}
          />
          <text x={graphX - 8} y={yForGainLabel(gain)} fill={CHART_THEME.axisLabel} fontSize="12" textAnchor="end" fontWeight="600">
            {gain > 0 ? `+${gain}` : gain}
          </text>
          <text x={graphX + graphWidth + 8} y={yForGainLabel(gain)} fill={CHART_THEME.axisLabel} fontSize="12" textAnchor="start" fontWeight="600">
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
            y={graphY + graphHeight + 6}
            fill={CHART_THEME.axisLabel}
            fontSize="12"
            textAnchor="middle"
            fontWeight="600"
            dominantBaseline="hanging"
          >
            {formatEqAxisFreq(freq)}
          </text>
        </g>
      ))}
      <polygon
        points={`${points} ${graphX + graphWidth},${graphY + graphHeight} ${graphX},${graphY + graphHeight}`}
        fill="var(--alpha-cyan-16)"
        opacity={eq.enabled ? 0.34 : 0.14}
      />
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
              updateFilterFromEvent(filter, event.clientX, event.clientY, event.currentTarget.ownerSVGElement as SVGSVGElement);
            }}
            onPointerMove={(event) => {
              if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
              event.preventDefault();
              event.stopPropagation();
              updateFilterFromEvent(filter, event.clientX, event.clientY, event.currentTarget.ownerSVGElement as SVGSVGElement);
            }}
            onPointerUp={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
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
              updateBandFromEvent(index, event.clientX, event.clientY, event.currentTarget.ownerSVGElement as SVGSVGElement);
            }}
            onPointerMove={(event) => {
              if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
              event.preventDefault();
              event.stopPropagation();
              updateBandFromEvent(index, event.clientX, event.clientY, event.currentTarget.ownerSVGElement as SVGSVGElement);
            }}
            onPointerUp={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
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
}: {
  gate: GateState;
  disabled?: boolean;
  onChange: (patch: Partial<GateState>) => void;
  onReset: () => void;
}) {
  return (
    <ProcessorShell
      title="Gate"
    >
      <div style={{ minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: 10 }}>
        <div style={{ position: "relative", minHeight: 0 }}>
          <ModuleHeaderActions
            enabled={gate.enabled}
            disabled={disabled}
            accentColor={MODULE_ACCENTS.gate.color}
            accentGlow={MODULE_ACCENTS.gate.glow}
            onLabel="GATE ON"
            offLabel="GATE OFF"
            onToggle={() => onChange({ enabled: !gate.enabled })}
            onReset={onReset}
          />
          <GateGraph gate={gate} disabled={disabled} onThresholdChange={(threshold) => onChange({ threshold })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }}>
          <EditableKnob label="Threshold" value={gate.threshold} min={-80} max={0} displayValue={formatDb(gate.threshold)} suffix="dB" disabled={disabled} onChange={(threshold) => onChange({ threshold })} />
          <EditableKnob label="Attack" value={Math.round(gate.attack)} min={3} max={200} displayValue={formatMs(gate.attack)} suffix="ms" disabled={disabled} onChange={(attack) => onChange({ attack })} />
          <EditableKnob
            label="Decay"
            value={snapGateDecay(gate.decay)}
            min={2}
            max={32}
            step={1}
            displayValue={`x${snapGateDecay(gate.decay)}`}
            disabled={disabled}
            onChange={(decay) => onChange({ decay: snapGateDecay(decay) })}
          />
          <EditableKnob label="Hold" value={Math.round(gate.hold)} min={0} max={530} displayValue={formatMs(gate.hold)} suffix="ms" disabled={disabled} onChange={(hold) => onChange({ hold })} />
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
}: {
  comp: CompressorState;
  disabled?: boolean;
  onChange: (patch: Partial<CompressorState>) => void;
  onReset: () => void;
}) {
  return (
    <ProcessorShell
      title="Compressor"
    >
      <div style={{ minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: 10 }}>
        <div style={{ position: "relative", minHeight: 0 }}>
          <ModuleHeaderActions
            enabled={comp.enabled}
            disabled={disabled}
            accentColor={MODULE_ACCENTS.comp.color}
            accentGlow={MODULE_ACCENTS.comp.glow}
            onLabel="COMP ON"
            offLabel="COMP OFF"
            onToggle={() => onChange({ enabled: !comp.enabled })}
            onReset={onReset}
          />
          <CompressorGraph comp={comp} disabled={disabled} onChange={onChange} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }}>
          <EditableKnob
            label="Threshold"
            value={Math.round(snapCompressorThreshold(comp.threshold) * 2)}
            min={-160}
            max={0}
            step={1}
            displayValue={formatDb(snapCompressorThreshold(comp.threshold))}
            suffix="dB"
            disabled={disabled}
            onChange={(thresholdHalfSteps) => {
              const threshold = snapCompressorThreshold(thresholdHalfSteps / 2);

              if (snapCompressorRatio(comp.ratio) >= 40) {
                onChange({ threshold, ratio: 40 });
                return;
              }

              onChange({ threshold });
            }}
          />
          <EditableKnob
            label="Ratio"
            value={compressorRatioToStepIndex(comp.ratio)}
            min={0}
            max={COMP_RATIO_STEPS.length - 1}
            step={1}
            displayValue={formatCompressorRatio(snapCompressorRatio(comp.ratio))}
            disabled={disabled}
            onChange={(ratioIndex) => onChange({ ratio: compressorRatioFromStepIndex(ratioIndex) })}
          />
          <EditableKnob label="Attack" value={Math.round(comp.attack)} min={1} max={200} displayValue={formatMs(comp.attack)} suffix="ms" disabled={disabled} onChange={(attack) => onChange({ attack })} />
          <EditableKnob label="Release" value={Math.round(comp.release)} min={10} max={1000} displayValue={formatMs(comp.release)} suffix="ms" disabled={disabled} onChange={(release) => onChange({ release })} />
          <EditableKnob label="Gain" value={Math.round(comp.gain)} min={0} max={20} displayValue={formatDb(comp.gain)} suffix="dB" disabled={disabled} onChange={(gain) => onChange({ gain })} />
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
                  knobPixelsPerStep={0.5}
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
                  onChange={(freq) =>
                    onChange(
                      selectedFilter === "hpf"
                        ? { hpfFreq: snapEqFrequency(Math.min(freq, eq.lpfFreq - 10)) }
                        : { lpfFreq: snapEqFrequency(Math.max(freq, eq.hpfFreq + 10)) }
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
                  knobPixelsPerStep={24}
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
                  knobPixelsPerStep={30}
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
                  knobPixelsPerStep={0.5}
                  knobSize={68}
                  compact
                  displayValue={selectedNode === null ? "—" : formatFreq(band.freq)}
                  suffix="Hz"
                  disabled={disabled || selectedNode === null}
                  accentColor="var(--semantic-danger-base)"
                  glowColor="var(--alpha-red-60)"
                  onChange={(freq) => onBandChange(selectedBand, { freq: snapEqFrequency(freq) })}
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
  hideGate = false,
  onModuleChange,
  onGateChange,
  onCompChange,
  onEqChange,
  onEqBandChange,
  onResetGate,
  onResetComp,
  onResetEq,
}: ChannelProcessorsProps) {
  const navItems: Array<
    | { id: ProcessorModule; label: string; disabled?: false }
    | { id: "fx-sends" | "aux-sends"; label: string; disabled: true }
  > = [
    { id: "eq", label: "EQ" },
    { id: "comp", label: "COMP" },
    ...(!hideGate ? [{ id: "gate", label: "GATE" } as const] : []),
    { id: "fx-sends", label: "FX SENDS", disabled: true },
    { id: "aux-sends", label: "AUX SENDS", disabled: true },
  ];

  return (
    <div
      style={{
        minHeight: 0,
        height: "100%",
        display: "grid",
        gridTemplateRows: "32px minmax(0, 1fr)",
        gap: 0,
      }}
    >
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
            disabled={disabled || item.disabled}
            onClick={() => {
              if (item.disabled) return;
              onModuleChange(item.id);
            }}
            style={{
              height: 32,
              padding: "0 16px",
              borderRadius: 0,
              border: "none",
              borderBottom:
                !item.disabled && activeModule === item.id
                  ? "2px solid var(--border-focus)"
                  : "2px solid transparent",
              background: "transparent",
              color:
                item.disabled
                  ? "var(--text-tertiary)"
                  : !item.disabled && activeModule === item.id
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
              fontSize: 10,
              lineHeight: "12px",
              fontWeight: 700,
              letterSpacing: "1.2px",
              cursor: disabled || item.disabled ? "not-allowed" : "pointer",
              opacity: item.disabled ? 0.6 : 1,
              whiteSpace: "nowrap",
              width: "100%",
              justifySelf: "stretch",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        style={{
          minWidth: 0,
          minHeight: 0,
          marginTop: 24,
          padding: 0,
          borderRadius: 0,
          border: "none",
          background: "transparent",
          overflow: "hidden",
        }}
      >
        {activeModule === "gate" && (
          <GateEditor
            gate={state.gate}
            disabled={disabled}
            onChange={onGateChange}
            onReset={onResetGate}
          />
        )}

        {activeModule === "comp" && (
          <CompressorEditor
            comp={state.comp}
            disabled={disabled}
            onChange={onCompChange}
            onReset={onResetComp}
          />
        )}

        {activeModule === "eq" && (
          <EqEditor
            eq={state.eq}
            disabled={disabled}
            onChange={onEqChange}
            onBandChange={onEqBandChange}
            onReset={onResetEq}
          />
        )}
      </div>
    </div>
  );
}
