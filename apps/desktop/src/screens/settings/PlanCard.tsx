import { Check, Headphones } from "lucide-react";

/** Estado efetivo do plano exibido no card. "pro" entra de fato na v1.5.0. */
export type PlanCardState = "free" | "trial" | "plus" | "pro";

type PlanCardProps = {
  state: PlanCardState;
  /** Free: já usou o teste neste aparelho? (define "Desbloqueie" vs "Reativar"). */
  trialUsed?: boolean;
  /** Trial ativo: dias restantes / total (ex.: 5 de 7). */
  trialDaysLeft?: number;
  trialDaysTotal?: number;
  /** Preço da licença Plus (ex.: "R$ 189,90"). */
  priceLabel?: string;
  /** Pro: linha de renovação (ex.: "15/01/2026 · R$ 29,90/mês"). */
  proRenewalLabel?: string;
  /** Ações. */
  onUpgrade?: () => void;        // comprar Plus (PIX)
  onStartTrial?: () => void;     // ativar teste grátis (free + disponível)
  onSubscribePro?: () => void;   // assinar Pro (a partir do Plus) — v1.5.0
  onManageSubscription?: () => void; // gerenciar assinatura Pro — v1.5.0
  /** Pro: opção anual selecionada (default mensal). */
  disabled?: boolean;            // offline → ações desabilitadas
};

const PLUS_FEATURES = [
  "EQ, Comp e Gate",
  "Sends, AUX, FX e Patching",
  "Salvar, Editar e Carregar cenas",
  "Todas as atualizações oficiais da Duonn",
];

const PRO_FEATURES = [
  "App completo: Mixer, EQ, dinâmica, sends, cenas e patching",
  "Monitor Pessoal: cada músico com o próprio mix no IEM",
  "Novidades do Pro chegam automaticamente no seu plano",
];

const PLAN_BADGE_LABEL: Record<PlanCardState, string> = {
  free: "Free",
  trial: "Trial",
  plus: "AX Control Plus",
  pro: "AX Control Pro",
};

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="plan-card__features">
      {items.map((f) => (
        <li key={f} className="plan-card__feature">
          <Check size={14} aria-hidden="true" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

/** Card de Plano & Licença (Figma 276:547). Cor/gradiente/glow por estado.
 *  Free(disponível/usado) · Trial ativo · Plus(+upsell Pro) · Pro(gerenciar). */
export function PlanCard({
  state,
  trialUsed = false,
  trialDaysLeft = 0,
  trialDaysTotal = 7,
  priceLabel = "R$ 189,90",
  proRenewalLabel,
  onUpgrade,
  onStartTrial,
  onSubscribePro,
  onManageSubscription,
  disabled = false,
}: PlanCardProps) {
  const badge = (
    <span className={`plan-card__badge plan-card__badge--${state}`}>
      <span className="plan-card__badge-dot" aria-hidden="true" />
      {state === "trial" ? `Trial · ${trialDaysLeft} dias restantes` : PLAN_BADGE_LABEL[state]}
    </span>
  );

  return (
    <div className={`plan-card plan-card--${state}`}>
      <span className="plan-card__glow" aria-hidden="true" />

      <div className="plan-card__head">
        <span className="plan-card__eyebrow">PLANO ATUAL</span>
        {state === "pro" ? (
          <div className="plan-card__head-right">
            {badge}
            <button type="button" className="plan-card__manage-chip" onClick={onManageSubscription} disabled={disabled}>
              Gerenciar assinatura →
            </button>
          </div>
        ) : (
          badge
        )}
      </div>

      {/* ── FREE (disponível ou usado) ───────────────────────────────── */}
      {state === "free" && (
        <>
          <h3 className="plan-card__title">
            {trialUsed ? "Volte a ter o controle completo da mesa." : "Desbloqueie o AX Control Plus"}
          </h3>
          <p className="plan-card__subtitle">
            {trialUsed ? "Você já conhece o que o Plus oferece." : "O Plus libera tudo."}
          </p>
          <FeatureList items={PLUS_FEATURES} />
          <div className="plan-card__price-block">
            <span className="plan-card__price-eyebrow">Licença vitalícia — pagamento único</span>
            <span className="plan-card__price">{priceLabel}</span>
          </div>
          {trialUsed ? (
            <button type="button" className="plan-card__btn plan-card__btn--free" onClick={onUpgrade} disabled={disabled}>
              Reativar meu acesso — {priceLabel}
            </button>
          ) : (
            <div className="plan-card__actions">
              <button type="button" className="plan-card__btn plan-card__btn--free" onClick={onUpgrade} disabled={disabled}>
                Fazer upgrade agora
              </button>
              <button type="button" className="plan-card__btn plan-card__btn--outline-free" onClick={onStartTrial} disabled={disabled}>
                Experimentar grátis por {trialDaysTotal} dias
              </button>
            </div>
          )}
        </>
      )}

      {/* ── TRIAL ATIVO ──────────────────────────────────────────────── */}
      {state === "trial" && (
        <>
          <h3 className="plan-card__title">Seu acesso completo termina em {trialDaysLeft} dias.</h3>
          <p className="plan-card__subtitle">Garanta agora e não perca funcionalidades.</p>
          <div className="plan-card__progress">
            <div className="plan-card__progress-head">
              <span>Dias restantes</span>
              <span className="plan-card__progress-count">{trialDaysLeft}/{trialDaysTotal}</span>
            </div>
            <div className="plan-card__progress-track">
              <div
                className="plan-card__progress-fill"
                style={{ width: `${Math.max(0, Math.min(100, (trialDaysLeft / Math.max(1, trialDaysTotal)) * 100))}%` }}
              />
            </div>
          </div>
          <FeatureList items={PLUS_FEATURES} />
          <div className="plan-card__price-block">
            <span className="plan-card__price-eyebrow">Licença vitalícia — pagamento único</span>
            <span className="plan-card__price">{priceLabel}</span>
          </div>
          <div className="plan-card__actions plan-card__actions--center">
            <button type="button" className="plan-card__btn plan-card__btn--trial" onClick={onUpgrade} disabled={disabled}>
              Garantir meu acesso — {priceLabel}
            </button>
            <span className="plan-card__fineprint">Licença vitalícia. Sem mensalidades.</span>
          </div>
        </>
      )}

      {/* ── PLUS (+ upsell de Pro) ───────────────────────────────────── */}
      {state === "plus" && (
        <>
          <h3 className="plan-card__title">Você tem o AX Control Plus ✓</h3>
          <div className="plan-card__divider" />
          <div className="plan-card__upsell">
            <span className="plan-card__upsell-eyebrow">DESBLOQUEAR</span>
            <div className="plan-card__upsell-titlerow">
              <span className="plan-card__upsell-icon"><Headphones size={18} aria-hidden="true" /></span>
              <span className="plan-card__upsell-title">Monitor Pessoal</span>
            </div>
            <p className="plan-card__upsell-desc">Cada músico controla sua própria mix de fone.</p>
            <div className="plan-card__billing">
              <div className="plan-card__billing-opt">
                <span className="plan-card__radio" aria-hidden="true" />
                <div className="plan-card__billing-content">
                  <span className="plan-card__billing-label">MENSAL</span>
                  <span className="plan-card__billing-price"><strong>R$ 29,90</strong> /mês</span>
                </div>
              </div>
              <div className="plan-card__billing-opt plan-card__billing-opt--annual">
                <span className="plan-card__radio plan-card__radio--on" aria-hidden="true" />
                <div className="plan-card__billing-content">
                  <span className="plan-card__billing-labelrow">
                    <span className="plan-card__billing-label plan-card__billing-label--annual">ANUAL</span>
                    <span className="plan-card__billing-rec">Recomendado</span>
                  </span>
                  <span className="plan-card__billing-price"><strong>R$ 247,00</strong> /ano</span>
                  <span className="plan-card__billing-note">≈ R$ 20,58/mês · economize 31%</span>
                </div>
              </div>
            </div>
            <button type="button" className="plan-card__btn plan-card__btn--pro" onClick={onSubscribePro} disabled={disabled}>
              Assinar o AX Control Pro
            </button>
          </div>
        </>
      )}

      {/* ── PRO (Plus + Monitor Pessoal) ─────────────────────────────── */}
      {state === "pro" && (
        <>
          <h3 className="plan-card__title">AX Control Plus + Monitor Pessoal ✓</h3>
          {proRenewalLabel && <p className="plan-card__subtitle">Renovação automática: {proRenewalLabel}</p>}
          <span className="plan-card__upsell-eyebrow">INCLUÍDO NO PLANO</span>
          <FeatureList items={PRO_FEATURES} />
          <button type="button" className="plan-card__btn plan-card__btn--outline-pro" onClick={onManageSubscription} disabled={disabled}>
            Gerenciar assinatura →
          </button>
        </>
      )}
    </div>
  );
}
