import type { ReactNode } from "react";

type TileColor = "cyan" | "purple" | "green";

type IconTileProps = {
  children: ReactNode;
  color?: TileColor;
  className?: string;
};

/** Container de ícone 40px (ícone 20px). Mapeia `IconContainer` do Figma → `.ax-icon-tile`. */
export function IconTile({ children, color = "cyan", className }: IconTileProps) {
  const classes = ["ax-icon-tile", `ax-icon-tile--${color}`];
  if (className) classes.push(className);
  return (
    <span className={classes.join(" ")} aria-hidden="true">
      {children}
    </span>
  );
}
