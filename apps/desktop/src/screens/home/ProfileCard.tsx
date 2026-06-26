import { useState } from "react";
import { ChevronRight, LogOut } from "lucide-react";
import { Avatar } from "../../design-system/components";

type ProfileCardProps = {
  userName?: string;
  userEmail?: string;
  isFounder?: boolean | null;
  onLogout?: () => void;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Card de perfil no rodapé da sidebar. Figma `ProfileCard` → `.app-profile-card`. */
export function ProfileCard({ userName = "", userEmail = "", isFounder, onLogout }: ProfileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = getInitials(userName);
  const role = isFounder ? "Membro Fundador" : userEmail || "Minha conta";

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
      <button type="button" className="app-profile-card" onClick={() => setMenuOpen((v) => !v)}>
        <Avatar initials={initials} />
        <span className="app-profile-card__info">
          <span className="app-profile-card__name">{userName || "Minha Conta"}</span>
          <span className={`app-profile-card__role${isFounder ? " app-profile-card__role--founder" : ""}`}>
            {role}
          </span>
        </span>
        <span className="app-profile-card__chevron"><ChevronRight size={16} /></span>
      </button>
    </>
  );
}
