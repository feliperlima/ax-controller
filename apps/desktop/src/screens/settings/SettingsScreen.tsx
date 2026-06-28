import { User, Monitor, ChevronRight, AlertTriangle } from "lucide-react";
import { PlanCard, type PlanCardState } from "./PlanCard";
import "./settings.css";

export type SettingsDevice = {
  deviceId: string;
  deviceName: string;
  devicePlatform: string;
  active: boolean;
  isCurrent: boolean;
  lastSeenLabel?: string;
};

type SettingsScreenProps = {
  userName?: string;
  userEmail?: string;

  // Plano & Licença
  planState: PlanCardState;
  trialUsed?: boolean;
  trialDaysLeft?: number;
  trialDaysTotal?: number;
  priceLabel?: string;
  proRenewalLabel?: string;
  isOnline?: boolean;
  onUpgrade?: () => void;
  onStartTrial?: () => void;
  onSubscribePro?: () => void;
  onManageSubscription?: () => void;

  // Dispositivos
  devices: SettingsDevice[];
  deviceLimit: number;
  deviceActionBusy?: boolean;
  onRemoveDevice?: (deviceId: string) => void;
  onReactivateDevice?: (deviceId: string) => void;

  // Suporte
  onContactSupport?: () => void;
  onOpenCommunity?: () => void;

  // Sobre
  version: string;
  platformLabel?: string;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
};

export function SettingsScreen({
  userName = "",
  userEmail = "",
  planState,
  trialUsed,
  trialDaysLeft,
  trialDaysTotal = 7,
  priceLabel,
  proRenewalLabel,
  isOnline = true,
  onUpgrade,
  onStartTrial,
  onSubscribePro,
  onManageSubscription,
  devices,
  deviceLimit,
  deviceActionBusy = false,
  onRemoveDevice,
  onReactivateDevice,
  onContactSupport,
  onOpenCommunity,
  version,
  platformLabel,
  onOpenTerms,
  onOpenPrivacy,
}: SettingsScreenProps) {
  const activeDeviceCount = devices.filter((d) => d.active).length;

  return (
    <div className="settings-screen">
      <div className="settings-screen__container">
        <header className="settings-screen__header">
          <h1 className="settings-screen__title">Configurações</h1>
          <p className="settings-screen__subtitle">Gerencie sua conta, planos e dispositivos.</p>
        </header>

        {/* ── Conta ──────────────────────────────────────────────── */}
        <section className="settings-section">
          <div className="settings-section__head"><span className="settings-section__label">Conta</span></div>
          <div className="settings-card">
            <div className="settings-row">
              <span className="settings-row__icon"><User size={18} /></span>
              <div className="settings-row__body">
                <span className="settings-row__title">{userName || "Minha conta"}</span>
                {userEmail && <span className="settings-row__sub">{userEmail}</span>}
              </div>
            </div>
          </div>
        </section>

        {/* ── Plano & Licença ────────────────────────────────────── */}
        <section className="settings-section settings-section--plan">
          <div className="settings-section__head"><span className="settings-section__label">Plano &amp; Licença</span></div>
          <PlanCard
            state={planState}
            trialUsed={trialUsed}
            trialDaysLeft={trialDaysLeft}
            trialDaysTotal={trialDaysTotal}
            priceLabel={priceLabel}
            proRenewalLabel={proRenewalLabel}
            disabled={!isOnline}
            onUpgrade={onUpgrade}
            onStartTrial={onStartTrial}
            onSubscribePro={onSubscribePro}
            onManageSubscription={onManageSubscription}
          />
          {!isOnline && (
            <div className="settings-banner">
              <AlertTriangle size={14} />
              Requer conexão com a internet para gerenciar licenças e realizar pagamentos.
            </div>
          )}
        </section>

        {/* ── Dispositivos ───────────────────────────────────────── */}
        <section className="settings-section">
          <div className="settings-section__head">
            <span className="settings-section__label">Dispositivos</span>
            <span className="settings-section__meta">{activeDeviceCount} de {deviceLimit}</span>
          </div>
          <div className="settings-card">
            {devices.length === 0 && (
              <div className="settings-row">
                <div className="settings-row__body"><span className="settings-row__sub">Nenhum dispositivo vinculado.</span></div>
              </div>
            )}
            {devices.map((d) => (
              <div className="settings-row" key={d.deviceId}>
                <span className="settings-row__icon"><Monitor size={18} /></span>
                <div className="settings-row__body">
                  <span className="settings-row__titleline">
                    <span className="settings-row__title">{d.deviceName}</span>
                    {d.isCurrent && <span className="settings-row__tag">este aparelho</span>}
                  </span>
                  <span className="settings-row__sub">{d.lastSeenLabel ?? d.devicePlatform}</span>
                </div>
                {!d.isCurrent && d.active && onRemoveDevice && (
                  <button type="button" className="settings-row__remove" disabled={deviceActionBusy} onClick={() => onRemoveDevice(d.deviceId)}>
                    Remover
                  </button>
                )}
                {!d.active && onReactivateDevice && (
                  <button type="button" className="settings-row__remove" disabled={deviceActionBusy} onClick={() => onReactivateDevice(d.deviceId)} style={{ color: "#22c55e" }}>
                    Reativar
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Suporte ────────────────────────────────────────────── */}
        <section className="settings-section">
          <div className="settings-section__head"><span className="settings-section__label">Suporte</span></div>
          <div className="settings-card">
            <button type="button" className="settings-row" onClick={onContactSupport}>
              <div className="settings-row__body">
                <span className="settings-row__title">Falar com suporte</span>
                <span className="settings-row__sub">Abra um chamado com nossa equipe técnica.</span>
              </div>
              <span className="settings-row__chevron"><ChevronRight size={16} /></span>
            </button>
            <button type="button" className="settings-row" onClick={onOpenCommunity}>
              <div className="settings-row__body">
                <span className="settings-row__title">Comunidade no WhatsApp</span>
                <span className="settings-row__sub">Troque experiências com outros usuários do AX Control.</span>
              </div>
              <span className="settings-row__chevron"><ChevronRight size={16} /></span>
            </button>
          </div>
        </section>

        {/* ── Sobre ──────────────────────────────────────────────── */}
        <section className="settings-section">
          <div className="settings-section__head"><span className="settings-section__label">Sobre</span></div>
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-row__body"><span className="settings-row__title">Versão</span></div>
              <span className="settings-row__value">{version}{platformLabel ? ` · ${platformLabel}` : ""}</span>
            </div>
            <button type="button" className="settings-row" onClick={onOpenTerms}>
              <div className="settings-row__body"><span className="settings-row__title">Termos de uso</span></div>
              <span className="settings-row__chevron"><ChevronRight size={16} /></span>
            </button>
            <button type="button" className="settings-row" onClick={onOpenPrivacy}>
              <div className="settings-row__body"><span className="settings-row__title">Política de privacidade</span></div>
              <span className="settings-row__chevron"><ChevronRight size={16} /></span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
