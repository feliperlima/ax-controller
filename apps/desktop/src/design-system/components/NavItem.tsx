import type { ReactNode } from "react";

type NavItemProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

/** Item de menu da sidebar. Mapeia `MenuItem` do Figma → `.ax-nav-item`. */
export function NavItem({ icon, label, active, onClick }: NavItemProps) {
  const classes = ["ax-nav-item"];
  if (active) classes.push("ax-nav-item--active");
  return (
    <button
      type="button"
      className={classes.join(" ")}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <span className="ax-nav-item__icon">{icon}</span>
      <span className="ax-nav-item__label">{label}</span>
    </button>
  );
}
