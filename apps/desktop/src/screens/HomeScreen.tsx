import { useState, type ReactNode } from "react";
import type { LicenseFormalState } from "../lib/licenseState";
import type { BootstrapMessage, BootstrapVersionInfo } from "../services/bootstrapService";
import { useFeatureFlag } from "../services/featureFlags";
import { AppSidebar } from "./home/AppSidebar";
import { HomeDashboard } from "./home/HomeDashboard";
import type { MixerConnectStatus } from "./home/cards/MixerConnectCard";
import "./home/home.css";

// ── Remote banners (mensagens de módulo, overlay no topo) ─────────────────────

type BannerSeverity = "info" | "warning" | "error" | "critical";

const BANNER_COLORS: Record<BannerSeverity, string> = {
  info:     "var(--color-cyan, #00c8e0)",
  warning:  "#f5a623",
  error:    "#e05252",
  critical: "#c0392b",
};

function RemoteBanners({
  messages,
  onDismiss,
}: {
  messages: BootstrapMessage[];
  onDismiss: (key: string) => void;
}) {
  const banners = messages.filter((m) => m.channel === "banner");
  if (banners.length === 0) return null;
  return (
    <div className="hs-banners">
      {banners.map((msg) => (
        <div
          key={msg.key}
          className="hs-banner"
          style={{ borderLeftColor: BANNER_COLORS[msg.severity] ?? BANNER_COLORS.info }}
        >
          {msg.title && <span className="hs-banner__title">{msg.title}</span>}
          <span className="hs-banner__text">{msg.body}</span>
          {msg.cta_label && msg.cta_url && (
            <a className="hs-banner__cta" href={msg.cta_url} target="_blank" rel="noopener noreferrer">
              {msg.cta_label}
            </a>
          )}
          <button className="hs-banner__dismiss" onClick={() => onDismiss(msg.key)} aria-label="Fechar">✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Upsell de licença (cards de trial/plano na sidebar) ───────────────────────

function renderUpsell({
  licenseFormalState,
  licenseTrialExpiryAt,
  deviceTrialUsed,
  onUpgrade,
  onStartTrial,
  onNavLicense,
}: {
  licenseFormalState: LicenseFormalState;
  licenseTrialExpiryAt: string | null;
  deviceTrialUsed: boolean;
  onUpgrade?: () => void;
  onStartTrial?: () => void;
  onNavLicense?: () => void;
}): ReactNode {
  if (licenseFormalState === "TRIAL_ACTIVE") {
    const daysRemaining = licenseTrialExpiryAt
      ? Math.max(0, Math.ceil((Date.parse(licenseTrialExpiryAt) - Date.now()) / 86_400_000))
      : 7;
    const isUrgent = daysRemaining <= 2;
    return (
      <div className="hs-upgrade-card">
        <div className="hs-upgrade-card__icon" aria-hidden="true">✦</div>
        <div className="hs-upgrade-card__text">
          <p className="hs-upgrade-card__title">
            {isUrgent
              ? `Seu teste termina em ${daysRemaining} dia${daysRemaining === 1 ? "" : "s"}`
              : "Você está testando o AX Control+"}
          </p>
          <p className="hs-upgrade-card__desc">
            {isUrgent
              ? "Ative o AX Control+ para continuar usando todos os recursos sem interrupção."
              : `Aproveite o controle completo da mesa por mais ${daysRemaining} dias.`}
          </p>
        </div>
        <button type="button" className="hs-upgrade-card__btn" onClick={isUrgent ? onUpgrade : onNavLicense}>
          {isUrgent ? "Manter acesso" : "Explorar recursos"}
        </button>
      </div>
    );
  }

  if (licenseFormalState === "LICENSE_NOT_FOUND" && !deviceTrialUsed) {
    return (
      <div className="hs-upgrade-card">
        <div className="hs-upgrade-card__icon" aria-hidden="true">✦</div>
        <div className="hs-upgrade-card__text">
          <p className="hs-upgrade-card__title">Experimente o AX Control+</p>
          <p className="hs-upgrade-card__desc">Teste o controle completo da mesa por 7 dias, sem compromisso.</p>
        </div>
        <button type="button" className="hs-upgrade-card__btn" onClick={onStartTrial ?? onNavLicense}>
          Iniciar teste grátis
        </button>
      </div>
    );
  }

  if (licenseFormalState === "LICENSE_NOT_FOUND" && deviceTrialUsed) {
    return (
      <div className="hs-upgrade-card">
        <div className="hs-upgrade-card__icon" aria-hidden="true">✦</div>
        <div className="hs-upgrade-card__text">
          <p className="hs-upgrade-card__title">Tenha o AX Control+</p>
          <p className="hs-upgrade-card__desc">Este dispositivo já usou o teste grátis. Ative o Plus para o controle completo — ou siga no plano grátis.</p>
        </div>
        <button type="button" className="hs-upgrade-card__btn" onClick={onUpgrade ?? onNavLicense}>
          Ativar Plus
        </button>
      </div>
    );
  }

  if (licenseFormalState === "TRIAL_EXPIRED") {
    return (
      <div className="hs-upgrade-card">
        <div className="hs-upgrade-card__icon" aria-hidden="true">✦</div>
        <div className="hs-upgrade-card__text">
          <p className="hs-upgrade-card__title">Seu teste terminou</p>
          <p className="hs-upgrade-card__desc">Ative o AX Control+ para voltar ao controle completo da mesa.</p>
        </div>
        <button type="button" className="hs-upgrade-card__btn" onClick={onUpgrade ?? onNavLicense}>
          Ativar Plus
        </button>
      </div>
    );
  }

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export type HomeNavView = "home" | "connect" | "license" | "devices" | "settings";

type HomeScreenProps = {
  version: string;
  licenseFormalState: LicenseFormalState;
  licenseTrialExpiryAt: string | null;
  hasActivatedOnce: boolean;
  isFounder?: boolean | null;
  userName?: string;
  userEmail?: string;
  activeNav?: HomeNavView;
  mainContent?: ReactNode;
  messages?: BootstrapMessage[];
  versionInfo?: BootstrapVersionInfo | null;
  onConnectMixer: () => void;
  /** Estado/dados do card principal de mesa (descoberta real). */
  connectStatus?: MixerConnectStatus;
  connectMixerName?: string;
  connectMixerIp?: string;
  connectMixerChannels?: number;
  /** Ação do card de mesa (conectar / buscar novamente / reconectar), por estado. */
  onConnectCardAction?: () => void;
  onNavHome?: () => void;
  onNavLicense?: () => void;
  onNavDevices?: () => void;
  onNavSettings?: () => void;
  onDemo?: () => void;
  onLogout?: () => void;
  onUpgrade?: () => void;
  onStartTrial?: () => void;
  onIemInterest?: () => void;
  /** When true, this device already used a trial — show "buy/keep free" instead of the trial offer. */
  deviceTrialUsed?: boolean;
  /** Instala a atualização baixada (App confirma se houver mesa conectada → reinicia). */
  onRequestInstallUpdate?: () => void;
};

export function HomeScreen({
  licenseFormalState,
  licenseTrialExpiryAt,
  isFounder = null,
  userName = "",
  userEmail = "",
  activeNav = "home",
  mainContent,
  messages = [],
  versionInfo = null,
  onConnectMixer,
  connectStatus,
  connectMixerName,
  connectMixerIp,
  connectMixerChannels,
  onConnectCardAction,
  onNavHome,
  onNavLicense,
  onNavDevices,
  onNavSettings,
  onDemo,
  onLogout,
  onUpgrade,
  onStartTrial,
  onIemInterest,
  deviceTrialUsed = false,
  onRequestInstallUpdate,
}: HomeScreenProps) {
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
  const firstName = userName.trim().split(/\s+/)[0] ?? "";
  const showIem = useFeatureFlag("feature_iem_banner");
  const visibleMessages = messages.filter((m) => !dismissedBanners.has(m.key));

  const upsell = renderUpsell({
    licenseFormalState,
    licenseTrialExpiryAt,
    deviceTrialUsed,
    onUpgrade,
    onStartTrial,
    onNavLicense,
  });

  return (
    <div className="home-shell">
      <div className="titlebar-drag" />

      <AppSidebar
        activeNav={activeNav}
        onNavHome={onNavHome}
        onConnectMixer={onConnectMixer}
        onDemo={onDemo}
        onNavLicense={onNavLicense}
        onNavDevices={onNavDevices}
        onNavSettings={onNavSettings}
        showIem={showIem}
        onIemInterest={onIemInterest}
        upsell={upsell}
        userName={userName}
        userEmail={userEmail}
        isFounder={isFounder}
        onLogout={onLogout}
      />

      <RemoteBanners
        messages={visibleMessages}
        onDismiss={(key) => setDismissedBanners((prev) => new Set([...prev, key]))}
      />

      <main className="app-main">
        <div className="app-main__inner">
          {activeNav !== "home" && mainContent ? (
            mainContent
          ) : (
            <HomeDashboard
              firstName={firstName}
              showIem={showIem}
              connectStatus={connectStatus}
              mixerName={connectMixerName}
              mixerIp={connectMixerIp}
              mixerChannels={connectMixerChannels}
              onConnectCardAction={onConnectCardAction ?? onConnectMixer}
              onDemo={onDemo}
              onIemInterest={onIemInterest}
              versionInfo={versionInfo}
              onRequestInstallUpdate={onRequestInstallUpdate}
            />
          )}
        </div>
      </main>
    </div>
  );
}
