import { useEffect, useMemo, useRef, useState } from "react";

type UseGateMetersArgs = {
  inputDb?: number;
  thresholdDb: number;
  attackMs: number;
  holdMs: number;
  decaySetting: number;
  enabled: boolean;
};

type GateMetersResult = {
  inputDb: number;
  targetGainReductionDb: number;
  gainReductionDb: number;
  visualGainReductionDb: number;
};

const IDLE_INPUT_DB = -75;
const MAX_GAIN_REDUCTION_DB = 30;
const METER_SMOOTHING_INTERVAL_MS = 33;

// Gate decay on this mixer is stepped (2,4,6,8,16,32). We map it to close-time constants.
const GATE_DECAY_CLOSE_MS: Record<number, number> = {
  2: 70,
  4: 100,
  6: 140,
  8: 190,
  16: 320,
  32: 520,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function decaySettingToCloseMs(decaySetting: number) {
  const options = [2, 4, 6, 8, 16, 32] as const;
  const rounded = Math.round(decaySetting);
  const nearest = options.reduce((closest, option) =>
    Math.abs(option - rounded) < Math.abs(closest - rounded) ? option : closest
  );

  return GATE_DECAY_CLOSE_MS[nearest];
}

/**
 * Gate GR is estimated from gate envelope + threshold because DUONN does not expose
 * a dedicated gate gain-reduction meter parameter in this project mapping.
 */
export function useGateMeters({
  inputDb,
  thresholdDb,
  attackMs,
  holdMs,
  decaySetting,
  enabled,
}: UseGateMetersArgs): GateMetersResult {
  const [gainReductionDb, setGainReductionDb] = useState(0);
  const [targetGainReductionDb, setTargetGainReductionDb] = useState(0);
  const latestStateRef = useRef({
    inputDb,
    thresholdDb,
    attackMs,
    holdMs,
    decaySetting,
    enabled,
  });
  const belowThresholdSinceRef = useRef<number | null>(null);

  useEffect(() => {
    latestStateRef.current = {
      inputDb,
      thresholdDb,
      attackMs,
      holdMs,
      decaySetting,
      enabled,
    };
  }, [inputDb, thresholdDb, attackMs, holdMs, decaySetting, enabled]);

  useEffect(() => {
    let lastTickAt = performance.now();

    const timerId = window.setInterval(() => {
      const now = performance.now();
      const deltaMs = clamp(now - lastTickAt, 1, 150);
      lastTickAt = now;

      const current = latestStateRef.current;
      const safeInputDb = Number.isFinite(current.inputDb) ? (current.inputDb as number) : IDLE_INPUT_DB;
      const safeThreshold = Number.isFinite(current.thresholdDb) ? current.thresholdDb : -40;
      const safeAttack = clamp(Number.isFinite(current.attackMs) ? current.attackMs : 15, 3, 500);
      const safeHold = clamp(Number.isFinite(current.holdMs) ? current.holdMs : 120, 0, 1000);
      const closeMs = decaySettingToCloseMs(current.decaySetting);

      let target = 0;

      if (!current.enabled) {
        belowThresholdSinceRef.current = null;
        target = 0;
      } else if (safeInputDb >= safeThreshold) {
        belowThresholdSinceRef.current = null;
        target = 0;
      } else {
        if (belowThresholdSinceRef.current === null) {
          belowThresholdSinceRef.current = now;
        }

        const elapsedBelowThreshold = now - belowThresholdSinceRef.current;
        target = elapsedBelowThreshold >= safeHold ? MAX_GAIN_REDUCTION_DB : 0;
      }

      setTargetGainReductionDb(target);

      setGainReductionDb((previous) => {
        const timeMs = target > previous ? closeMs : safeAttack;
        const coeff = 1 - Math.exp(-deltaMs / Math.max(1, timeMs));
        const next = previous + (target - previous) * coeff;

        if (target === 0 && next < 0.1) return 0;
        return clamp(next, 0, MAX_GAIN_REDUCTION_DB);
      });
    }, METER_SMOOTHING_INTERVAL_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const normalizedInputDb = Number.isFinite(inputDb) ? (inputDb as number) : IDLE_INPUT_DB;
  const visualGainReductionDb = useMemo(
    () => clamp(gainReductionDb, 0, MAX_GAIN_REDUCTION_DB),
    [gainReductionDb]
  );

  return {
    inputDb: normalizedInputDb,
    targetGainReductionDb,
    gainReductionDb,
    visualGainReductionDb,
  };
}
