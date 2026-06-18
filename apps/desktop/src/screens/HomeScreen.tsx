import { useState, type ReactNode } from "react";
import axControlBrand from "../assets/AX-control-Brand-vert.svg";
import type { LicenseFormalState } from "../lib/licenseState";

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconRadio({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2" />
      <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M7.76 7.76a6 6 0 0 0 0 8.49" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
    </svg>
  );
}

function IconPlayCircle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconTablet() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconStar({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--primitive-amber-500)" }}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconHeadphones({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function IconBell({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconLogOut({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

type LicenseBadgeInfo = {
  type: "trial" | "plus" | "free";
  label: string;
  sublabel: string;
};

function resolveBadge(state: LicenseFormalState, trialExpiryAt: string | null): LicenseBadgeInfo {
  if (state === "PURCHASED_ACTIVE" || state === "PURCHASED_REVALIDATION_DUE") {
    return { type: "plus", label: "Licença Plus", sublabel: "Vitalício" };
  }
  if (state === "TRIAL_ACTIVE") {
    const days = trialExpiryAt
      ? Math.max(0, Math.ceil((Date.parse(trialExpiryAt) - Date.now()) / 86_400_000))
      : 7;
    const sublabel =
      days === 0 ? "Expirando hoje" : days === 1 ? "1 dia restante" : `${days} dias restantes`;
    return { type: "trial", label: "Licença Trial", sublabel };
  }
  return { type: "free", label: "Licença Free", sublabel: "Acesso limitado" };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LicenseBadgeTag({ badge }: { badge: LicenseBadgeInfo }) {
  return (
    <div className={`hs-license-badge hs-license-badge--${badge.type}`}>
      <span className="hs-license-badge__dot" />
      <span className="hs-license-badge__label">{badge.label}</span>
      <span className="hs-license-badge__chip">{badge.sublabel}</span>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`hs-nav-item${active ? " hs-nav-item--active" : ""}`}
      onClick={onClick}
    >
      <span className="hs-nav-item__icon">{icon}</span>
      <span className="hs-nav-item__label">{label}</span>
    </button>
  );
}

type CardVariant = "cyan" | "green" | "purple";

function ActionCard({
  variant,
  icon,
  title,
  description,
  buttonLabel,
  buttonIcon,
  badge,
  onClick,
}: {
  variant: CardVariant;
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  buttonIcon?: React.ReactNode;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`hs-action-card hs-action-card--${variant}`}>
      <div className="hs-action-card__top">
        <div className="hs-action-card__icon-pill">{icon}</div>
        {badge && <span className="hs-action-card__badge">{badge}</span>}
      </div>
      <div className="hs-action-card__body">
        <p className="hs-action-card__title">{title}</p>
        <p className="hs-action-card__desc">{description}</p>
      </div>
      <button
        type="button"
        className="hs-action-card__btn"
        onClick={onClick}
        disabled={!onClick}
      >
        {buttonIcon && <span className="hs-action-card__btn-icon">{buttonIcon}</span>}
        {buttonLabel}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export type HomeNavView = "home" | "connect" | "license" | "devices" | "settings";

type HomeScreenProps = {
  version: string;
  licenseFormalState: LicenseFormalState;
  licenseTrialExpiryAt: string | null;
  hasActivatedOnce: boolean;
  userName?: string;
  userEmail?: string;
  activeNav?: HomeNavView;
  mainContent?: ReactNode;
  onConnectMixer: () => void;
  onNavHome?: () => void;
  onNavLicense?: () => void;
  onNavDevices?: () => void;
  onNavSettings?: () => void;
  onDemo?: () => void;
  onLogout?: () => void;
};

export function HomeScreen({
  licenseFormalState,
  licenseTrialExpiryAt,
  userName = "",
  userEmail = "",
  activeNav = "home",
  mainContent,
  onConnectMixer,
  onNavHome,
  onNavLicense,
  onNavDevices,
  onNavSettings,
  onDemo,
  onLogout,
}: HomeScreenProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const badge = resolveBadge(licenseFormalState, licenseTrialExpiryAt);
  const isPurchased =
    licenseFormalState === "PURCHASED_ACTIVE" ||
    licenseFormalState === "PURCHASED_REVALIDATION_DUE";
  const initials = getInitials(userName);
  const firstName = userName.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="hs-root">
      {/* ── Sidebar ── */}
      <aside className="hs-sidebar">
        <div className="hs-sidebar__brand">
          <img src={axControlBrand} alt="AX Control" className="hs-sidebar__logo" />
        </div>

        <nav className="hs-sidebar__nav">
          <NavItem icon={<IconHome />} label="Início" active={activeNav === "home"} onClick={activeNav !== "home" ? onNavHome : undefined} />
          <NavItem icon={<IconRadio />} label="Conecte uma mesa" active={activeNav === "connect"} onClick={activeNav !== "connect" ? onConnectMixer : undefined} />
          {onDemo && (
            <NavItem icon={<IconPlayCircle />} label="Modo Demonstração" onClick={onDemo} />
          )}

          <div className="hs-nav-section-label">CONTA</div>

          <NavItem icon={<IconShield />} label="Licença" active={activeNav === "license"} onClick={activeNav !== "license" ? onNavLicense : undefined} />
          <NavItem icon={<IconTablet />} label="Meus dispositivos" active={activeNav === "devices"} onClick={activeNav !== "devices" ? onNavDevices : undefined} />
          <NavItem icon={<IconSettings />} label="Configurações" active={activeNav === "settings"} onClick={activeNav !== "settings" ? onNavSettings : undefined} />
        </nav>

        {!isPurchased && (
          <div className="hs-upgrade-card">
            <IconStar size={32} />
            <div className="hs-upgrade-card__text">
              <p className="hs-upgrade-card__title">
                Desbloqueie<br />todo o potencial!
              </p>
              <p className="hs-upgrade-card__desc">
                Usuários AX Control+ têm acesso a todos os recursos avançados.
              </p>
            </div>
            <button type="button" className="hs-upgrade-card__btn" onClick={onNavLicense}>
              Adquirir o Plus
            </button>
          </div>
        )}

        <div className="hs-profile-wrap">
          <button
            type="button"
            className="hs-profile"
            onClick={() => setProfileMenuOpen((v) => !v)}
          >
            <span className="hs-profile__avatar">
              {initials || "?"}
            </span>
            <span className="hs-profile__info">
              <span className="hs-profile__name">{userName || "Minha Conta"}</span>
              {userEmail && <span className="hs-profile__email">{userEmail}</span>}
            </span>
            <span className="hs-profile__chevron">
              <IconChevronRight />
            </span>
          </button>
          {profileMenuOpen && (
            <div className="hs-profile-menu">
              {onLogout && (
                <button
                  type="button"
                  className="hs-profile-menu__item hs-profile-menu__item--danger"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    onLogout();
                  }}
                >
                  <IconLogOut />
                  Sair
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="hs-content">
        {activeNav !== "home" && mainContent ? (
          mainContent
        ) : (
          <>
            <div className="hs-content__header">
              <h1 className="hs-content__title">
                {firstName ? `Bem-vindo, ${firstName}` : "Bem-vindo"}
              </h1>
              <LicenseBadgeTag badge={badge} />
            </div>

            <div className="hs-cards">
              <ActionCard
                variant="cyan"
                icon={<IconRadio size={24} />}
                title="Conecte uma mesa"
                description="Busque sua AXIOS 16, 24 ou 32 na rede e comece a controlar."
                buttonLabel="Buscar uma mesa"
                onClick={onConnectMixer}
              />
              <ActionCard
                variant="green"
                icon={<IconPlayCircle size={24} />}
                title="Modo Demonstração"
                description="Explore todos os recursos do app sem precisar de uma mesa."
                buttonLabel="Ver demonstração"
                onClick={onDemo}
              />
              <ActionCard
                variant="purple"
                icon={<IconHeadphones size={24} />}
                title="Monitor Pessoal (IEM)"
                description="Cada músico no controle da sua própria mix de fone de ouvido."
                buttonLabel="Avise-me"
                buttonIcon={<IconBell size={16} />}
                badge="Em breve"
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
