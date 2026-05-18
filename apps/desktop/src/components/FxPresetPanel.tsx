import { useEffect, useMemo, useRef, useState } from "react";
import { Knob } from "./Knob";
import type {
  FxPresetId,
  FxPresetConfig,
} from "../protocol/duonn/fxPresets";
import {
  getFxPresetConfig,
  getAllFxPresets,
  formatFxPresetControlValue,
} from "../protocol/duonn/fxPresets";

interface FxPresetCardProps {
  preset: FxPresetConfig;
  isActive: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function FxPresetCard({ preset, isActive, disabled = false, onClick }: FxPresetCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateRows: "1fr",
        alignContent: "center",
        justifyContent: "stretch",
        padding: "12px 12px 10px",
        minHeight: 88,
        borderRadius: 10,
        border: isActive
          ? "2px solid var(--semantic-success-base)"
          : "1px solid var(--border-default)",
        background: isActive ? "var(--surface-card-active)" : "var(--surface-card)",
        boxShadow: isActive ? "0 0 0 1px var(--semantic-success-border), var(--button-phase-glow)" : "none",
        color: "var(--text-primary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "border-color 120ms, background 120ms, box-shadow 120ms",
        minWidth: 0,
        overflow: "hidden",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isActive) {
          (e.currentTarget as HTMLElement).style.background = "var(--surface-card-hover)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(255,255,255,0.02) inset";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isActive) {
          (e.currentTarget as HTMLElement).style.background = "var(--surface-card)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 8, width: "100%" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.01em", color: isActive ? "var(--semantic-success-base)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {preset.id}. {preset.name}
        </div>
      </div>
    </button>
  );
}

interface FxPresetGridProps {
  activePresetId: FxPresetId | null;
  disabled?: boolean;
  onPresetSelect: (presetId: FxPresetId) => void;
}

export function FxPresetGrid({
  activePresetId,
  disabled = false,
  onPresetSelect,
}: FxPresetGridProps) {
  const presets = useMemo(() => getAllFxPresets(), []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gridAutoRows: "minmax(88px, 1fr)",
        gap: 8,
        alignContent: "start",
        overflow: "auto",
        paddingRight: 2,
      }}
    >
      {presets.map((preset) => (
        <FxPresetCard
          key={preset.id}
          preset={preset}
          isActive={activePresetId === preset.id}
          disabled={disabled}
          onClick={() => onPresetSelect(preset.id)}
        />
      ))}
    </div>
  );
}

interface FxPresetControlPanelProps {
  presetId: FxPresetId | null;
  controlAValue: number;
  controlBValue: number;
  disabled?: boolean;
  onControlAChange: (value: number) => void;
  onControlBChange: (value: number) => void;
}

export function FxPresetControlPanel({
  presetId,
  controlAValue,
  controlBValue,
  disabled = false,
  onControlAChange,
  onControlBChange,
}: FxPresetControlPanelProps) {
  const lastTapRef = useRef<number>(0);
  const tapTimesRef = useRef<number[]>([]);
  const [editingA, setEditingA] = useState<string | null>(null);
  const [editingB, setEditingB] = useState<string | null>(null);

  useEffect(() => {
    lastTapRef.current = 0;
    tapTimesRef.current = [];
    setEditingA(null);
    setEditingB(null);
  }, [presetId]);

  if (!presetId) {
    return (
      <div
        style={{
          minHeight: 0,
          height: "100%",
          borderRadius: 4,
          background: "var(--surface-panel-raised)",
          display: "grid",
          alignContent: "center",
          justifyItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
          Selecione um preset acima para ver seus controles
        </div>
      </div>
    );
  }

  const preset = getFxPresetConfig(presetId);
  const [controlAConfig, controlBConfig] = preset.controls;
  const isDelay = preset.category === "echo_delay";

  function commitA(draft: string) {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) { setEditingA(null); return; }
    const raw = controlAConfig.rawFromDisplay
      ? controlAConfig.rawFromDisplay(parsed)
      : Math.round(parsed);
    const clamped = Math.max(controlAConfig.rawMin, Math.min(controlAConfig.rawMax, raw));
    setEditingA(null);
    onControlAChange(clamped);
  }

  function commitB(draft: string) {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) { setEditingB(null); return; }
    const raw = controlBConfig.rawFromDisplay
      ? controlBConfig.rawFromDisplay(parsed)
      : Math.round(parsed);
    const clamped = Math.max(controlBConfig.rawMin, Math.min(controlBConfig.rawMax, raw));
    setEditingB(null);
    onControlBChange(clamped);
  }

  function handleTapTempo() {
    const now = Date.now();
    const taps = [...tapTimesRef.current, now].slice(-4);
    tapTimesRef.current = taps;
    lastTapRef.current = now;

    if (taps.length < 2) {
      setTapBpm(null);
      return;
    }

    const intervals = taps.slice(1).map((tapTime, index) => tapTime - taps[index]);
    const averageInterval = intervals.reduce((total, interval) => total + interval, 0) / intervals.length;
    const delayMs = Math.max(controlAConfig.rawMin, Math.round(averageInterval));

    onControlAChange(delayMs);
  }

  return (
    <div
      style={{
        minHeight: 0,
        height: "100%",
        borderRadius: 4,
        background: "var(--surface-panel-raised)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 40,
        padding: "24px 20px",
        overflow: "visible",
      }}
    >
      {/* Control A Knob */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
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
            whiteSpace: "nowrap",
          }}
        >
          {controlAConfig.label}
        </div>
        <Knob
          label=""
          value={Math.min(controlAValue, controlAConfig.rawMax)}
          min={controlAConfig.rawMin}
          max={controlAConfig.rawMax}
          displayValue=""
          size={68}
          variant="gain"
          accentColor="var(--semantic-success-base)"
          railColor="rgba(255, 255, 255, 0.15)"
          disabled={disabled}
          onChange={onControlAChange}
        />
        {editingA !== null ? (
          <div
            style={{
              width: 68,
              display: "grid",
              gridTemplateColumns: controlAConfig.unit ? "1fr auto" : "1fr",
              alignItems: "center",
              borderRadius: 7,
              border: "1px solid #38bdf8",
              background: "#07111a",
              overflow: "hidden",
            }}
          >
            <input
              autoFocus
              value={editingA}
              inputMode="decimal"
              onChange={(e) => setEditingA(e.target.value)}
              onBlur={() => commitA(editingA)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditingA(null);
              }}
              style={{
                width: "100%",
                minWidth: 0,
                padding: "6px 7px",
                border: "none",
                outline: "none",
                background: "transparent",
                color: "#e5eef5",
                textAlign: "center",
                fontSize: 12,
                fontWeight: 900,
              }}
            />
            {controlAConfig.unit && (
              <span style={{ paddingRight: 7, color: "#64748b", fontSize: 10, fontWeight: 900 }}>
                {controlAConfig.unit}
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              const displayVal = controlAConfig.displayFromRaw
                ? controlAConfig.displayFromRaw(controlAValue)
                : controlAValue;
              setEditingA(String(displayVal));
            }}
            style={{
              width: 68,
              minHeight: 29,
              padding: "6px 7px",
              borderRadius: 7,
              border: "1px solid #263746",
              background: "#07111a",
              color: "#e5eef5",
              fontSize: 12,
              fontWeight: 900,
              textAlign: "center",
              whiteSpace: "nowrap",
              cursor: disabled ? "not-allowed" : "text",
            }}
          >
            {formatFxPresetControlValue(controlAConfig, controlAValue)}{controlAConfig.unit ? ` ${controlAConfig.unit}` : ""}
          </button>
        )}
      </div>

      {/* Control B Knob */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
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
            whiteSpace: "nowrap",
          }}
        >
          {controlBConfig.label}
        </div>
        <Knob
          label=""
          value={controlBValue}
          min={controlBConfig.rawMin}
          max={controlBConfig.rawMax}
          displayValue=""
          size={68}
          variant="gain"
          accentColor="var(--semantic-success-base)"
          railColor="rgba(255, 255, 255, 0.15)"
          disabled={disabled}
          onChange={onControlBChange}
        />
        {editingB !== null ? (
          <div
            style={{
              width: 68,
              display: "grid",
              gridTemplateColumns: controlBConfig.unit ? "1fr auto" : "1fr",
              alignItems: "center",
              borderRadius: 7,
              border: "1px solid #38bdf8",
              background: "#07111a",
              overflow: "hidden",
            }}
          >
            <input
              autoFocus
              value={editingB}
              inputMode="decimal"
              onChange={(e) => setEditingB(e.target.value)}
              onBlur={() => commitB(editingB)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditingB(null);
              }}
              style={{
                width: "100%",
                minWidth: 0,
                padding: "6px 7px",
                border: "none",
                outline: "none",
                background: "transparent",
                color: "#e5eef5",
                textAlign: "center",
                fontSize: 12,
                fontWeight: 900,
              }}
            />
            {controlBConfig.unit && (
              <span style={{ paddingRight: 7, color: "#64748b", fontSize: 10, fontWeight: 900 }}>
                {controlBConfig.unit}
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              const displayVal = controlBConfig.displayFromRaw
                ? controlBConfig.displayFromRaw(controlBValue)
                : controlBValue;
              setEditingB(String(displayVal));
            }}
            style={{
              width: 68,
              minHeight: 29,
              padding: "6px 7px",
              borderRadius: 7,
              border: "1px solid #263746",
              background: "#07111a",
              color: "#e5eef5",
              fontSize: 12,
              fontWeight: 900,
              textAlign: "center",
              whiteSpace: "nowrap",
              cursor: disabled ? "not-allowed" : "text",
            }}
          >
            {formatFxPresetControlValue(controlBConfig, controlBValue)}{controlBConfig.unit ? ` ${controlBConfig.unit}` : ""}
          </button>
        )}
      </div>

      {/* TAP TEMPO para presets de delay */}
      {isDelay && (
        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
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
              whiteSpace: "nowrap",
            }}
          >
            TAP TEMPO
          </div>
          <button
            type="button"
            disabled={disabled}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!disabled) handleTapTempo();
            }}
            style={{
              width: 68,
              height: 68,
              borderRadius: 8,
              border: "1px solid #ca8a04",
              background: "linear-gradient(160deg, #2a1f00 0%, #1a1200 100%)",
              color: "#fbbf24",
              display: "grid",
              alignContent: "center",
              justifyItems: "center",
              cursor: disabled ? "not-allowed" : "pointer",
              touchAction: "none",
              userSelect: "none",
              transition: "filter 80ms, transform 80ms",
              fontSize: 13,
              fontWeight: 900,
            }}
            onPointerEnter={(e) => {
              if (!disabled) (e.currentTarget as HTMLElement).style.filter = "brightness(1.25)";
            }}
            onPointerLeave={(e) => {
              (e.currentTarget as HTMLElement).style.filter = "none";
              (e.currentTarget as HTMLElement).style.transform = "none";
            }}
            onPointerDownCapture={(e) => {
              if (!disabled) (e.currentTarget as HTMLElement).style.transform = "translateY(1px)";
            }}
            onPointerUpCapture={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "none";
            }}
          >
            TAP
          </button>
        </div>
      )}
    </div>
  );
}
