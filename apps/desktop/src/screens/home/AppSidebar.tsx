import type { ReactNode } from "react";
import { Home, Wifi, Sparkles, Headphones, Shield, Monitor, Settings } from "lucide-react";
import { NavItem, SectionLabel } from "../../design-system/components";
import { ProfileCard } from "./ProfileCard";
import axControlBrand from "../../assets/AX-control-Brand-vert.svg";
import type { HomeNavView } from "../HomeScreen";

const ICON = 18;

type AppSidebarProps = {
  activeNav: HomeNavView;
  onNavHome?: () => void;
  onConnectMixer: () => void;
  onDemo?: () => void;
  onNavLicense?: () => void;
  onNavDevices?: () => void;
  onNavSettings?: () => void;
  showIem?: boolean;
  onIemInterest?: () => void;
  /** Slot opcional de upsell (cards de trial/licença), renderizado acima do perfil. */
  upsell?: ReactNode;
  userName?: string;
  userEmail?: string;
  isFounder?: boolean | null;
  onLogout?: () => void;
};

/** Sidebar do app. Figma `SideBar` → `.app-sidebar` (header / nav / footer). */
export function AppSidebar({
  activeNav,
  onNavHome,
  onConnectMixer,
  onDemo,
  onNavLicense,
  onNavDevices,
  onNavSettings,
  showIem,
  onIemInterest,
  upsell,
  userName,
  userEmail,
  isFounder,
  onLogout,
}: AppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__header">
        <img src={axControlBrand} alt="AX Control" className="app-sidebar__logo" />
      </div>

      <nav className="app-sidebar__nav">
        <div className="app-sidebar__section">
          <SectionLabel className="app-sidebar__section-label">Principal</SectionLabel>
          <div className="app-sidebar__menu">
            <NavItem icon={<Home size={ICON} />} label="Início" active={activeNav === "home"} onClick={activeNav !== "home" ? onNavHome : undefined} />
            <NavItem icon={<Wifi size={ICON} />} label="Buscar mesas" active={activeNav === "connect"} onClick={activeNav !== "connect" ? onConnectMixer : undefined} />
            {onDemo && <NavItem icon={<Sparkles size={ICON} />} label="Demonstração" onClick={onDemo} />}
            {showIem && <NavItem icon={<Headphones size={ICON} />} label="Monitor pessoal" onClick={onIemInterest} />}
          </div>
        </div>

        <div className="app-sidebar__section">
          <SectionLabel className="app-sidebar__section-label">Conta</SectionLabel>
          <div className="app-sidebar__menu">
            <NavItem icon={<Shield size={ICON} />} label="Licença" active={activeNav === "license"} onClick={activeNav !== "license" ? onNavLicense : undefined} />
            <NavItem icon={<Monitor size={ICON} />} label="Dispositivos" active={activeNav === "devices"} onClick={activeNav !== "devices" ? onNavDevices : undefined} />
            <NavItem icon={<Settings size={ICON} />} label="Configurações" active={activeNav === "settings"} onClick={activeNav !== "settings" ? onNavSettings : undefined} />
          </div>
        </div>
      </nav>

      <div className="app-sidebar__footer">
        {upsell}
        <ProfileCard userName={userName} userEmail={userEmail} isFounder={isFounder} onLogout={onLogout} />
      </div>
    </aside>
  );
}
