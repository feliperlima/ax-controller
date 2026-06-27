import { useState } from "react";
import { ChevronRight, LogOut } from "lucide-react";
import { Avatar } from "../../design-system/components";

/** Plano efetivo exibido no card. "pro" já existe p/ a v1.5.0 (hoje não é derivado). */
export type ProfilePlan = "free" | "plus" | "pro" | "trial";

type ProfileCardProps = {
  userName?: string;
  plan?: ProfilePlan;
  onLogout?: () => void;
};

const PLAN_LABEL: Record<ProfilePlan, string> = {
  free: "Free",
  plus: "AX Control Plus",
  pro: "AX Control Pro",
  trial: "Trial",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Card de perfil no rodapé da sidebar. Figma `ProfileCard` (node 265:436) → `.app-profile-card`.
 *  Mostra o PLANO (avatar + badge coloridos por nível). O status Fundador vive no chip do header. */
export function ProfileCard({ userName = "", plan = "free", onLogout }: ProfileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = getInitials(userName);

  return (
    <>
      {menuOpen && onLogout && (
        <div className="app-profile-menu">
          <button
            type="button"
            className="app-profile-menu__item app-profile-menu__item--danger"
            onClick={() => { setMenuOpen(false); onLogout(); }}
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      )}
      <button type="button" className="app-profile-card" data-plan={plan} onClick={() => setMenuOpen((v) => !v)}>
        <Avatar initials={initials} className="app-profile-card__avatar" />
        <span className="app-profile-card__info">
          <span className="app-profile-card__name">{userName || "Minha Conta"}</span>
          <span className="app-profile-card__plan-badge">
            <span className="app-profile-card__plan-dot" aria-hidden="true" />
            {PLAN_LABEL[plan]}
          </span>
        </span>
        <span className="app-profile-card__chevron"><ChevronRight size={16} /></span>
      </button>
    </>
  );
}
