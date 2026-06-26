import { useRef, type ReactNode, type PointerEvent } from "react";

type GlowColor = "connect" | "iem" | "demo" | "slate" | "amber";

type CardProps = {
  children: ReactNode;
  /** Elipse decorativa difusa (AmbientGlow) no canto do card. */
  glow?: GlowColor;
  selected?: boolean;
  /** Glow segue o cursor (parallax). Default: ligado quando há glow. */
  interactive?: boolean;
  className?: string;
};

/** Card base do design-system. Mapeia o componente `Card` do Figma → `.ax-card`. */
export function Card({ children, glow, selected, interactive, className }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const cursorGlow = interactive ?? glow != null;

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!cursorGlow || e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--gx", `${(nx * 56).toFixed(1)}px`);
    el.style.setProperty("--gy", `${(ny * 56).toFixed(1)}px`);
  };
  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--gx", "0px");
    el.style.setProperty("--gy", "0px");
  };

  const classes = ["ax-card"];
  if (selected) classes.push("ax-card--selected");
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      onPointerMove={cursorGlow ? handleMove : undefined}
      onPointerLeave={cursorGlow ? handleLeave : undefined}
    >
      {glow && <span className={`ax-card__glow ax-card__glow--${glow}`} aria-hidden="true" />}
      {children}
    </div>
  );
}
