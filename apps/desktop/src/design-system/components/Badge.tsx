import type { ReactNode } from "react";

type Variant = "success" | "accent" | "warning";

type BadgeProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

/** Pill de status. Mapeia `Badge` do Figma → `.ax-badge` (ENCONTRADA, NOVO…). */
export function Badge({ children, variant = "accent", className }: BadgeProps) {
  const classes = ["ax-badge", `ax-badge--${variant}`];
  if (className) classes.push(className);
  return <span className={classes.join(" ")}>{children}</span>;
}
