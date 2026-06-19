import type { PaywallFeatureKey } from "./UpgradeModal";

const FEATURE_LABELS: Record<PaywallFeatureKey, string> = {
  details:    "Details",
  auxSends:   "Aux Sends",
  fxSends:    "FX Sends",
  dcaGroups:  "DCA Groups",
  muteGroups: "Mute Groups",
  scenes:     "Scenes",
  patching:   "Patching",
};

function formatTrialEnd(isoDate: string | null): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

type TrialActivatedModalProps = {
  trialExpiryAt: string | null;
  originFeature?: PaywallFeatureKey;
  onContinue: () => void;
  onDismiss: () => void;
};

export function TrialActivatedModal({
  trialExpiryAt,
  originFeature,
  onContinue,
  onDismiss,
}: TrialActivatedModalProps) {
  const featureName = originFeature ? FEATURE_LABELS[originFeature] : null;
  const expiryFormatted = formatTrialEnd(trialExpiryAt);

  const bodyText = featureName
    ? `Seu teste grátis começou. Agora você pode usar o controle completo da mesa: Details, Aux/FX Sends, DCA, Mute Groups, Scenes e Patching.`
    : `Seu teste grátis começou. Agora você pode usar todos os recursos avançados por 7 dias.`;

  const primaryLabel = "Comprar o Plus";

  return (
    <div className="trial-activated-overlay">
      <div className="trial-activated-card" role="dialog" aria-modal="true" aria-labelledby="trial-activated-title">
        <div className="trial-activated-icon" aria-hidden="true">✦</div>

        <div className="trial-activated-body">
          <h2 className="trial-activated-title" id="trial-activated-title">
            AX Control+ ativado
          </h2>
          <p className="trial-activated-desc">{bodyText}</p>
          {expiryFormatted && (
            <p className="trial-activated-expiry">Teste válido até {expiryFormatted}.</p>
          )}
        </div>

        <div className="trial-activated-actions">
          <button type="button" className="upg-btn upg-btn--primary" onClick={onContinue}>
            {primaryLabel}
          </button>
          <button type="button" className="upg-btn upg-btn--ghost" onClick={onDismiss}>
            Explorar depois
          </button>
        </div>
      </div>
    </div>
  );
}
