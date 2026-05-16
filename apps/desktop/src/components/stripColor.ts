export function stripColorFromId(
  colorId: number,
  fallbackColorId: number,
  fallbackCssColor: string
) {
  const raw = Math.round(colorId);

  if (raw === 0 && fallbackColorId === 0) {
    return fallbackCssColor;
  }

  const effective =
    raw === 0
      ? Math.max(1, Math.min(12, Math.round(fallbackColorId)))
      : Math.max(1, Math.min(12, raw));

  return `var(--channel-${String(effective).padStart(2, "0")}, ${fallbackCssColor})`;
}