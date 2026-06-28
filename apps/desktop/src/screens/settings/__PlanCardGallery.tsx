import { PlanCard } from "./PlanCard";
import "./settings.css";

/** DEV-only — galeria de verificação das variants do PlanCard.
 *  Reachable só em dev via `#gallery` (ver main.tsx). Não vai pra produção. */
export function PlanCardGallery() {
  const common = {
    priceLabel: "R$ 189,90",
    onUpgrade: () => alert("onUpgrade"),
    onStartTrial: () => alert("onStartTrial"),
    onSubscribePro: () => alert("onSubscribePro"),
    onManageSubscription: () => alert("onManageSubscription"),
  };
  const label: React.CSSProperties = { color: "#64748b", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 };
  return (
    <div style={{ background: "#000814", minHeight: "100vh", padding: 40 }}>
      <div style={{ width: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={label}>Free · trial disponível</span>
        <PlanCard state="free" trialUsed={false} {...common} />
        <span style={{ ...label, marginTop: 16 }}>Free · trial usado</span>
        <PlanCard state="free" trialUsed={true} {...common} />
        <span style={{ ...label, marginTop: 16 }}>Trial ativo</span>
        <PlanCard state="trial" trialDaysLeft={5} trialDaysTotal={7} {...common} />
        <span style={{ ...label, marginTop: 16 }}>Plus</span>
        <PlanCard state="plus" {...common} />
        <span style={{ ...label, marginTop: 16 }}>Pro</span>
        <PlanCard state="pro" proRenewalLabel="15/01/2026 · R$ 29,90/mês" {...common} />
      </div>
    </div>
  );
}
