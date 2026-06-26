type AvatarProps = {
  /** Iniciais já calculadas (ex.: "FL"). */
  initials: string;
  className?: string;
};

/** Avatar circular com iniciais. Mapeia `Avatar` do Figma → `.ax-avatar`. */
export function Avatar({ initials, className }: AvatarProps) {
  const classes = ["ax-avatar"];
  if (className) classes.push(className);
  return <span className={classes.join(" ")} aria-hidden="true">{initials}</span>;
}
