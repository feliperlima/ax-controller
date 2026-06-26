import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost";
type Accent = "purple" | "green";

type ButtonProps = {
  children: ReactNode;
  variant?: Variant;
  /** Tom de acento (só no ghost): IEM = purple, Demo = green. */
  accent?: Accent;
  /** Ocupa 100% da largura. */
  block?: boolean;
  icon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/** Botão do design-system. Mapeia `Button`/`GhostButton` do Figma → `.ax-button`. */
export function Button({
  children,
  variant = "ghost",
  accent,
  block,
  icon,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = ["ax-button", `ax-button--${variant}`];
  if (variant === "ghost" && accent) classes.push(`ax-button--accent-${accent}`);
  if (block) classes.push("ax-button--block");
  if (className) classes.push(className);
  return (
    <button type={type} className={classes.join(" ")} {...rest}>
      {icon && <span className="ax-button__icon">{icon}</span>}
      {children}
    </button>
  );
}
