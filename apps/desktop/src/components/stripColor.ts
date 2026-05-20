export function stripColorFromId(
  colorId: number,
  fallbackColorId: number,
  fallbackCssColor: string
) {
  const raw = Math.round(colorId);

  const effective =
    raw === 0
      ? Math.max(1, Math.min(12, Math.round(fallbackColorId)))
      : Math.max(1, Math.min(12, raw));

  return `var(--channel-${String(effective).padStart(2, "0")}, ${fallbackCssColor})`;
}

export type StripColorScope = "channel" | "aux" | "fx" | "master";

const STRIP_COLOR_FALLBACK_ID: Record<StripColorScope, number> = {
  channel: 0,
  aux: 8,
  fx: 7,
  master: 10,
};

const STRIP_COLOR_FALLBACK_CSS: Record<StripColorScope, string> = {
  channel: "#7b7b7b",
  aux: "var(--brand-primary)",
  fx: "var(--module-fx-primary)",
  master: "var(--module-master-primary)",
};

export function resolveStripColorIdForScope(colorId: number | undefined, scope: StripColorScope) {
  const normalized = Math.max(0, Math.min(12, Math.round(colorId ?? 0)));
  if (normalized !== 0) return normalized;
  return STRIP_COLOR_FALLBACK_ID[scope];
}

export function stripColorForScope(colorId: number | undefined, scope: StripColorScope) {
  const effective = resolveStripColorIdForScope(colorId, scope);
  if (effective === 0) {
    return STRIP_COLOR_FALLBACK_CSS[scope];
  }

  return `var(--channel-${String(effective).padStart(2, "0")}, ${STRIP_COLOR_FALLBACK_CSS[scope]})`;
}