import { useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Home, Wifi, Sparkles, Headphones, Settings } from "lucide-react";
import { NavItem, SectionLabel } from "../../design-system/components";
import { ProfileCard, type ProfilePlan } from "./ProfileCard";
import axControlBrand from "../../assets/AX-control-Brand-vert.svg";
import type { HomeNavView } from "../HomeScreen";

const ICON = 18;
const SIDEBAR_MIN = 256;
const SIDEBAR_MAX = 320;

type AppSidebarProps = {
  activeNav: HomeNavView;
  onNavHome?: () => void;
  onConnectMixer: () => void;
  onDemo?: () => void;
  onNavSettings?: () => void;
  showIem?: boolean;
  onIemInterest?: () => void;
  /** Slot opcional de upsell (cards de trial/licença), renderizado acima do perfil. */
  upsell?: ReactNode;
  userName?: string;
  plan?: ProfilePlan;
  onLogout?: () => void;
};

/** Sidebar do app. Figma `SideBar` → `.app-sidebar` (header / nav / footer). */
export function AppSidebar({
  activeNav,
  onNavHome,
  onConnectMixer,
  onDemo,
  onNavSettings,
  showIem,
  onIemInterest,
  upsell,
  userName,
  plan,
  onLogout,
}: AppSidebarProps) {
  // Sidebar redimensionável: abre sempre no default/mínimo (256), arrasta até 320. Não persiste.
  const [width, setWidth] = useState(SIDEBAR_MIN);
  const resizing = useRef<{ x: number; w: number } | null>(null);

  function startResize(e: ReactMouseEvent) {
    e.preventDefault();
    resizing.current = { x: e.clientX, w: width };
    const move = (ev: MouseEvent) => {
      const r = resizing.current;
      if (!r) return;
      setWidth(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, r.w + (ev.clientX - r.x))));
    };
    const up = () => {
      resizing.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <aside className="app-sidebar" style={{ width }}>
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
            <NavItem icon={<Settings size={ICON} />} label="Configurações" active={activeNav === "settings" || activeNav === "license" || activeNav === "devices"} onClick={activeNav !== "settings" ? onNavSettings : undefined} />
          </div>
        </div>
      </nav>

      <div className="app-sidebar__footer">
        {upsell}
        <ProfileCard userName={userName} plan={plan} onLogout={onLogout} />
      </div>
      <div className="app-sidebar__resize" onMouseDown={startResize} aria-hidden="true" />
    </aside>
  );
}
