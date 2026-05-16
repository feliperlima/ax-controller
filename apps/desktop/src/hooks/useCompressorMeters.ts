import { useEffect, useMemo, useRef, useState } from "react";

type UseCompressorMetersArgs = {
	inputDb?: number;
	thresholdDb: number;
	ratio: number;
	attackMs: number;
	releaseMs: number;
	makeupDb: number;
	enabled: boolean;
};

type CompressorMetersResult = {
	inputDb: number;
	targetGainReductionDb: number;
	gainReductionDb: number;
	outputDb: number;
	visualGainReductionDb: number;
	visualOutputDb: number;
	grNormalized: number;
	outNormalized: number;
};

const IDLE_INPUT_DB = -75;
const MAX_GAIN_REDUCTION_DB = 30;
const METER_SMOOTHING_INTERVAL_MS = 50;
const GAIN_REDUCTION_ZERO_SNAP_DB = 0.75;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function normalizeGainReduction(grDb: number) {
	return clamp(grDb / MAX_GAIN_REDUCTION_DB, 0, 1);
}

function normalizeOutput(outDb: number) {
	const min = -30;
	const max = 14;
	return clamp((outDb - min) / (max - min), 0, 1);
}

export function calculateTargetGainReductionDb(
	inputDb: number,
	thresholdDb: number,
	ratio: number,
	enabled: boolean
) {
	if (!enabled) return 0;
	if (!Number.isFinite(inputDb)) return 0;
	if (!Number.isFinite(thresholdDb)) return 0;
	if (inputDb <= thresholdDb) return 0;

	const aboveThreshold = inputDb - thresholdDb;

	if (ratio === Infinity) {
		return Math.max(0, aboveThreshold);
	}

	const safeRatio = Math.max(1, ratio);

	return Math.max(0, aboveThreshold * (1 - 1 / safeRatio));
}

export function smoothGainReductionDb(
	currentGR: number,
	targetGR: number,
	attackMs: number,
	releaseMs: number,
	deltaMs: number
) {
	const safeCurrent = Number.isFinite(currentGR) ? currentGR : 0;
	const safeTarget = Number.isFinite(targetGR) ? targetGR : 0;
	const safeAttack = clamp(Number.isFinite(attackMs) ? attackMs : 10, 1, 1000);
	const safeRelease = clamp(Number.isFinite(releaseMs) ? releaseMs : 300, 1, 5000);
	const safeDelta = clamp(Number.isFinite(deltaMs) ? deltaMs : 16.67, 1, 100);
	const timeMs = safeTarget > safeCurrent ? safeAttack : safeRelease;
	const coeff = 1 - Math.exp(-safeDelta / Math.max(1, timeMs));
	const nextGR = safeCurrent + (safeTarget - safeCurrent) * coeff;

	if (safeTarget <= GAIN_REDUCTION_ZERO_SNAP_DB && nextGR <= GAIN_REDUCTION_ZERO_SNAP_DB) {
		return 0;
	}

	return Math.max(0, nextGR);
}

export function calculateCompressorOutDb(
	inputDb: number,
	gainReductionDb: number,
	makeupDb: number,
	enabled: boolean
) {
	if (!Number.isFinite(inputDb)) return IDLE_INPUT_DB;
	if (!enabled) return inputDb;

	const safeGR = Number.isFinite(gainReductionDb) ? Math.max(0, gainReductionDb) : 0;
	const safeMakeup = Number.isFinite(makeupDb) ? makeupDb : 0;

	return inputDb - safeGR + safeMakeup;
}

/**
 * GR and OUT are calculated meters. Tests with the DUONN Axios 16 did not expose dedicated protocol parameters for compressor gain reduction or per-channel post-compressor output. Input meter is read from real channel meter params 2-9; GR and OUT are derived from the compressor model using threshold, ratio, attack, release, makeup and enabled state. Makeup affects OUT only, never GR.
 */
export function useCompressorMeters({
	inputDb,
	thresholdDb,
	ratio,
	attackMs,
	releaseMs,
	makeupDb,
	enabled,
}: UseCompressorMetersArgs): CompressorMetersResult {
	const [gainReductionDb, setGainReductionDb] = useState(0);
	const [targetGainReductionDb, setTargetGainReductionDb] = useState(0);
	const latestStateRef = useRef({
		inputDb,
		thresholdDb,
		ratio,
		attackMs,
		releaseMs,
		makeupDb,
		enabled,
	});

	useEffect(() => {
		latestStateRef.current = {
			inputDb,
			thresholdDb,
			ratio,
			attackMs,
			releaseMs,
			makeupDb,
			enabled,
		};
	}, [inputDb, thresholdDb, ratio, attackMs, releaseMs, makeupDb, enabled]);

	useEffect(() => {
		let lastTickAt = performance.now();

		const timerId = window.setInterval(() => {
			const now = performance.now();
			const deltaMs = Math.max(1, now - lastTickAt);
			lastTickAt = now;

			const current = latestStateRef.current;
			const normalizedRatio =
				!Number.isFinite(current.ratio) || current.ratio >= 40
					? Number.POSITIVE_INFINITY
					: current.ratio;
			const targetGR = Math.min(
				MAX_GAIN_REDUCTION_DB,
				calculateTargetGainReductionDb(
					Number.isFinite(current.inputDb) ? (current.inputDb as number) : IDLE_INPUT_DB,
					current.thresholdDb,
					normalizedRatio,
					current.enabled
				)
			);
			setTargetGainReductionDb(targetGR);

			setGainReductionDb((previousGR) => {
				const nextGR = smoothGainReductionDb(
					previousGR,
					targetGR,
					current.attackMs,
					current.releaseMs,
					deltaMs
				);

				return Math.abs(nextGR - previousGR) < 0.01 ? previousGR : nextGR;
			});
		}, METER_SMOOTHING_INTERVAL_MS);

		return () => {
			window.clearInterval(timerId);
		};
	}, []);

	const normalizedInputDb = Number.isFinite(inputDb) ? (inputDb as number) : IDLE_INPUT_DB;
	const outputDb = useMemo(
		() => calculateCompressorOutDb(normalizedInputDb, gainReductionDb, makeupDb, enabled),
		[enabled, gainReductionDb, makeupDb, normalizedInputDb]
	);
	const visualGainReductionDb = clamp(gainReductionDb, 0, MAX_GAIN_REDUCTION_DB);
	const visualOutputDb = Math.min(14, outputDb);

	return {
		inputDb: normalizedInputDb,
		targetGainReductionDb,
		gainReductionDb,
		outputDb,
		visualGainReductionDb,
		visualOutputDb,
		grNormalized: normalizeGainReduction(visualGainReductionDb),
		outNormalized: normalizeOutput(visualOutputDb),
	};
}
