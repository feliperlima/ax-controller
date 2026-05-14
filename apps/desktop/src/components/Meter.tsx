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
// 22 segmentos de +12 dB a -30 dB, passo de 2 dB
const METER_BODY_SEGMENTS = Array.from(
  { length: ((BODY_MAX_DB - MIN_DB) / 2) + 1 },
  (_, index) => BODY_MAX_DB - index * 2
);

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
            opacity: meterDb >= MAX_DB || clipped ? 0.95 : 0.24,
            backgroundColor: "var(--meter-red)",
            boxShadow:
              meterDb >= MAX_DB || clipped
                ? "0 0 4px 1px rgba(239,68,68,0.45)"
                : "none",
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
                boxShadow: `0 0 8px ${peakColor}, 0 0 1px rgba(241,245,249,0.95)`,
                zIndex: 2,
              }}
            />
          )}
        </div>
      </div>

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
          display: "flex",
          flexDirection: "column",
          gap: 3,
          justifyContent: "flex-end",
          overflow: "hidden",
        }}
      >
        {METER_BODY_SEGMENTS.map((segmentDb) => {
          const isActive = meterDb >= segmentDb && meterDb >= MIN_DB;
          const color = getMeterActiveColor(segmentDb);

          return (
            <div
              key={segmentDb}
              style={{
                width: "100%",
                minHeight: 2,
                flex: "1 1 auto",
                borderRadius: 2,
                opacity: isActive ? 0.95 : 0.24,
                backgroundColor: color,
                boxShadow: isActive ? `0 0 4px 1px ${color}66` : "none",
              }}
            />
          );
        })}

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
              boxShadow: `0 0 8px ${peakColor}, 0 0 1px rgba(241,245,249,0.95)`,
              zIndex: 3,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}

