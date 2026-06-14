import { useEffect, useLayoutEffect, useRef } from "react";

type MeterScaleProps = {
  clipped?: boolean;
};

type MeterBarProps = {
  meterDb: number;
  peakDb?: number;
  clipped: boolean;
};

const MIN_DB = -30;
const MAX_DB = 14;
const BODY_MAX_DB = 12;

// Gradient breakpoints (body range: MIN_DB=-30 to BODY_MAX_DB=12, total=42dB)
const BODY_RANGE = BODY_MAX_DB - MIN_DB;
const YELLOW_START_PCT = (((0 - MIN_DB) / BODY_RANGE) * 100).toFixed(2);
const ORANGE_START_PCT = (((10 - MIN_DB) / BODY_RANGE) * 100).toFixed(2);
const BODY_GRADIENT = `linear-gradient(to top, var(--meter-green) 0%, var(--meter-green) ${YELLOW_START_PCT}%, var(--meter-yellow) ${YELLOW_START_PCT}%, var(--meter-yellow) ${ORANGE_START_PCT}%, var(--meter-orange) ${ORANGE_START_PCT}%, var(--meter-orange) 100%)`;

type MeterScaleMarker = {
  label: string;
  db: number;
};

const METER_SCALE_MARKERS: MeterScaleMarker[] = [
  { label: "+12", db: 12 },
  { label: "+6", db: 6 },
  { label: "0", db: 0 },
  { label: "-6", db: -6 },
  { label: "-12", db: -12 },
  { label: "-18", db: -18 },
  { label: "-24", db: -24 },
  { label: "-30", db: -30 },
];

function dbToBodyPositionPercent(db: number): number {
  const clamped = Math.max(MIN_DB, Math.min(BODY_MAX_DB, db));
  return ((clamped - MIN_DB) / (BODY_MAX_DB - MIN_DB)) * 100;
}

function getMeterActiveColor(db: number) {
  if (db >= 14) return "var(--meter-red)";
  if (db >= 10) return "var(--meter-orange)";
  if (db > 0) return "var(--meter-yellow)";
  return "var(--meter-green)";
}

export function MeterScale({ clipped = false }: MeterScaleProps) {
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
      <div
        style={{
          display: "flex",
          flex: "1 1 auto",
          minHeight: 0,
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {METER_SCALE_MARKERS.map((marker) => (
          <div
            key={marker.label}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flexShrink: 0,
              fontWeight: 700,
              color: "inherit",
            }}
          >
            {marker.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MeterBar({ meterDb, peakDb, clipped }: MeterBarProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  // Refs track target (from props) and current display level without triggering re-renders
  const targetDbRef = useRef(meterDb);
  const displayDbRef = useRef(meterDb);

  // Sync target on every render (no re-render cost)
  targetDbRef.current = meterDb;

  // Set initial clip-path synchronously before first paint
  useLayoutEffect(() => {
    if (fillRef.current) {
      const level = dbToBodyPositionPercent(meterDb);
      fillRef.current.style.clipPath = `inset(${(100 - level).toFixed(1)}% 0 0 0)`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 60fps animation loop: interpolates display toward target
  useEffect(() => {
    function tick() {
      const target = targetDbRef.current;
      const current = displayDbRef.current;
      const delta = target - current;

      if (Math.abs(delta) > 0.05 && fillRef.current) {
        // Fast attack (0.9 ≈ 1 frame to 90%) — instantly shows peaks.
        // Slow release (0.05 ≈ 1.5s full fall) — prevents visible dips
        // during brief word-to-word pauses and eliminates the bounce-back glitch.
        const coeff = delta > 0 ? 0.9 : 0.05;
        // Clamp to MIN_DB so display never drifts below the visual floor.
        // Without this, resuming speech from long silence causes a sudden
        // jump from 0% (floor) to ~40%+ because the interpolation starts
        // from an accumulated sub-floor value (e.g., -75dB internally).
        const next = Math.max(MIN_DB, current + delta * coeff);
        displayDbRef.current = next;

        const level = dbToBodyPositionPercent(next);
        fillRef.current.style.clipPath = `inset(${(100 - level).toFixed(1)}% 0 0 0)`;
      }

      rafId = requestAnimationFrame(tick);
    }

    let rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Peak indicator (React-managed — updates less frequently than meter level)
  const hasPeak = typeof peakDb === "number";
  const normalizedPeak = hasPeak
    ? Math.max(MIN_DB, Math.min(MAX_DB, peakDb as number))
    : null;
  const peakInClip = normalizedPeak !== null && normalizedPeak >= MAX_DB;
  const peakBodyTopPercent =
    normalizedPeak === null || peakInClip
      ? null
      : 100 - dbToBodyPositionPercent(Math.min(BODY_MAX_DB, normalizedPeak));
  const peakColor =
    normalizedPeak === null
      ? "var(--meter-peak-marker)"
      : getMeterActiveColor(normalizedPeak);

  const isClipActive = meterDb >= MAX_DB || clipped;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        width: 10,
        height: "100%",
        flexShrink: 0,
      }}
    >
      {/* Clip indicator — React-managed opacity */}
      <div
        style={{
          width: 10,
          height: 20,
          flexShrink: 0,
          border: "1px solid var(--meter-border)",
          borderRadius: 4,
          backgroundColor: "var(--meter-background)",
          padding: 2,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 16,
            borderRadius: 2,
            opacity: isClipActive ? 0.95 : 0.24,
            backgroundColor: "var(--meter-red)",
          }}
        >
          {peakInClip && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "50%",
                height: 2,
                transform: "translateY(-1px)",
                backgroundColor: peakColor,
                zIndex: 2,
              }}
            />
          )}
        </div>
      </div>

      {/* Meter body — single gradient element, clip-path animated by rAF */}
      <div
        style={{
          position: "relative",
          width: 10,
          flex: "1 1 auto",
          minHeight: 0,
          border: "1px solid var(--meter-border)",
          borderRadius: 4,
          backgroundColor: "var(--meter-background)",
          padding: 2,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* clipPath is NOT in JSX style — set imperatively by rAF and useLayoutEffect */}
        <div
          ref={fillRef}
          style={{
            position: "absolute",
            left: 2,
            right: 2,
            bottom: 2,
            top: 2,
            borderRadius: 2,
            background: BODY_GRADIENT,
          }}
        />

        {/* Peak indicator — React-managed */}
        {peakBodyTopPercent !== null && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${peakBodyTopPercent}%`,
              height: 2,
              transform: "translateY(-1px)",
              backgroundColor: peakColor,
              zIndex: 3,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}
