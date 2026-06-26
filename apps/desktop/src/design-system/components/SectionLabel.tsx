import type { ReactNode } from "react";

type SectionLabelProps = {
  children: ReactNode;
  className?: string;
};

/** Rótulo de seção da sidebar (PRINCIPAL, CONTA). Mapeia `SectionLabel` → `.ax-section-label`. */
export function SectionLabel({ children, className }: SectionLabelProps) {
  const classes = ["ax-section-label"];
  if (className) classes.push(className);
  return <span className={classes.join(" ")}>{children}</span>;
}
