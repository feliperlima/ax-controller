import type { LicenseFormalState } from "../lib/licenseState";
import { useFeatureFlag } from "../services/featureFlags";

type LicenseValidationMessage = { kind: "idle" | "success" | "error"; text: string };

type LicensePanelProps = {
  licenseFormalState: LicenseFormalState;
  licenseTrialExpiryAt: string | null;
  licenseNextRevalidationAt: string | null;
  licenseRevalidationHint: string;
  installationId: string;
  onCopyInstallationId: () => void;
  licenseKeyInput: string;
  onLicenseKeyInputChange: (value: string) => void;
  onValidateLicense: () => void;
  licenseValidationBusy: boolean;
  licenseValidationMessage: LicenseValidationMessage;
  upgradePriceLabel: string;
  isOnline: boolean;
  onStartPixPayment: () => void;
  onContactForUpgrade: () => void;
  onStartTrial: () => void;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function resolvePlanLabel(state: LicenseFormalState): string {
  switch (state) {
    case "TRIAL_ACTIVE":
    case "TRIAL_EXPIRED":
      return "Período de teste";
    case "PURCHASED_ACTIVE":
    case "PURCHASED_REVALIDATION_DUE":
    case "PURCHASED_REVALIDATION_EXPIRED":
      return "AX Control Plus";
    case "LICENSE_SUSPENDED": return "Licença suspensa";
    case "LICENSE_REVOKED":   return "Licença revogada";
    case "LICENSE_BLOCKED":   return "Licença bloqueada";
    case "LICENSE_NOT_FOUND": return "Sem licença";
    default: return "Verificando...";
  }
}

function resolveStatusLabel(state: LicenseFormalState): { text: string; ok: boolean } {
  switch (state) {
    case "TRIAL_ACTIVE":
    case "PURCHASED_ACTIVE":
      return { text: "Ativa", ok: true };
    case "PURCHASED_REVALIDATION_DUE":
      return { text: "Revalidação pendente", ok: true };
    case "TRIAL_EXPIRED":
      return { text: "Expirado", ok: false };
    case "PURCHASED_REVALIDATION_EXPIRED":
      return { text: "Revalidação expirada", ok: false };
    case "LICENSE_SUSPENDED":
      return { text: "Suspensa", ok: false };
    case "LICENSE_REVOKED":
      return { text: "Revogada", ok: false };
    case "LICENSE_BLOCKED":
      return { text: "Bloqueada", ok: false };
    case "LICENSE_NOT_FOUND":
      return { text: "Não encontrada", ok: false };
    default:
      return { text: "Verificando...", ok: true };
  }
}

export function LicensePanel({
  licenseFormalState,
  licenseTrialExpiryAt,
  licenseNextRevalidationAt,
  licenseRevalidationHint,
  installationId,
  onCopyInstallationId,
  licenseKeyInput,
  onLicenseKeyInputChange,
  onValidateLicense,
  licenseValidationBusy,
  licenseValidationMessage,
  upgradePriceLabel,
  isOnline,
  onStartPixPayment,
  onContactForUpgrade,
  onStartTrial,
}: LicensePanelProps) {
  const pixEnabled = useFeatureFlag("pix_payment_enabled");
  const plan = resolvePlanLabel(licenseFormalState);
  const status = resolveStatusLabel(licenseFormalState);
  const isTrial = licenseFormalState === "TRIAL_ACTIVE" || licenseFormalState === "TRIAL_EXPIRED";
  const isFullLicense = !isTrial && licenseFormalState !== "LICENSE_NOT_FOUND";
  const canStartTrial = licenseFormalState === "LICENSE_NOT_FOUND";
  const expiryDate = isTrial ? licenseTrialExpiryAt : licenseNextRevalidationAt;
  const expiryLabel = isTrial ? "Validade do teste" : "Próxima revalidação";

  return (
    <div className="home-panel">
      <div className="home-panel__header">
        <h1 className="home-panel__title">Licença</h1>
        <p className="home-panel__subtitle">Gerencie sua licença e plano de acesso.</p>
      </div>

      <div className="home-panel__body">
        <div className="startup-card home-panel__card">
          <div className="home-panel__row">
            <span className="home-panel__label">Plano</span>
            <span className="home-panel__value">{plan}</span>
          </div>
          <div className="home-panel__row">
            <span className="home-panel__label">Status</span>
            <span className={`home-panel__status ${status.ok ? "home-panel__status--ok" : "home-panel__status--error"}`}>
              <span className="home-panel__status-dot" />
              {status.text}
            </span>
          </div>
          {expiryDate && (
            <div className="home-panel__row">
              <span className="home-panel__label">{expiryLabel}</span>
              <span className="home-panel__value">{formatDate(expiryDate)}</span>
            </div>
          )}
          {licenseRevalidationHint && (
            <p className="home-panel__hint">{licenseRevalidationHint}</p>
          )}
        </div>

        <div className="startup-card home-panel__card">
          <div className="home-panel__field">
            <span className="home-panel__label" id="license-panel-installation-id-label">ID do dispositivo</span>
            <div className="home-panel__inline">
              <input
                aria-labelledby="license-panel-installation-id-label"
                className="settings-modal__input"
                value={installationId}
                readOnly
              />
              <button type="button" className="startup-button startup-button--secondary" onClick={onCopyInstallationId}>
                Copiar
              </button>
            </div>
          </div>

          <div className="home-panel__field">
            <label className="home-panel__label" htmlFor="license-panel-key-input">Chave de licença</label>
            <input
              id="license-panel-key-input"
              className="settings-modal__input"
              value={licenseKeyInput}
              onChange={(event) => onLicenseKeyInputChange(event.target.value)}
              placeholder="Cole ou digite sua chave de licença"
              disabled={licenseValidationBusy}
            />
          </div>

          {licenseValidationMessage.kind !== "idle" && (
            <p
              className={`home-panel__hint ${licenseValidationMessage.kind === "error" ? "home-panel__hint--error" : ""}`}
            >
              {licenseValidationMessage.text}
            </p>
          )}

          <div className="home-panel__field home-panel__actions">
            <button
              type="button"
              className="startup-button startup-button--secondary"
              disabled={licenseValidationBusy}
              onClick={onValidateLicense}
            >
              {licenseValidationBusy
                ? "Validando..."
                : isFullLicense ? "Trocar licença" : "Aplicar licença"}
            </button>

            {canStartTrial && (
              <button type="button" className="startup-button startup-button--primary" onClick={onStartTrial} disabled={licenseValidationBusy}>
                Iniciar teste grátis de 7 dias
              </button>
            )}

            {isTrial && (
              <>
                {!isOnline && (
                  <p className="home-panel__hint home-panel__hint--error">
                    Sem conexão com a internet. Se você está na rede própria da mesa, troque para uma rede com internet para concluir a compra.
                  </p>
                )}
                {pixEnabled && (
                  <button type="button" className="startup-button startup-button--primary" onClick={onStartPixPayment} disabled={licenseValidationBusy || !isOnline}>
                    Comprar via Pix · {upgradePriceLabel}
                  </button>
                )}
                <button type="button" className="startup-button startup-button--secondary" onClick={onContactForUpgrade}>
                  Comprar pelo WhatsApp
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
