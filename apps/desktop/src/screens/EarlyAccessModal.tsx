import { useState } from "react";
import { submitEarlyAccess } from "../services/earlyAccessService";

type Role = "operador" | "musico";

type EarlyAccessModalProps = {
  defaultName?: string;
  defaultEmail?: string;
  defaultRole?: Role;
  /** Plano atual da conta (free/trial/founder/plus), só metadado. */
  plan?: string;
  appVersion: string;
  userId?: number | null;
  source?: string;
  onClose: () => void;
};

const MIXER_OPTIONS = ["AXIOS 16", "AXIOS 24", "AXIOS 32", "Atrium 32", "Ainda não tenho / outra"];
const MUSICIAN_OPTIONS = ["1", "2", "3", "4", "5 ou mais"];

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function EarlyAccessModal({
  defaultName = "",
  defaultEmail = "",
  defaultRole = "musico",
  plan = "",
  appVersion,
  userId = null,
  source = "home_card",
  onClose,
}: EarlyAccessModalProps) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [role, setRole] = useState<Role>(defaultRole);
  const [mixerModel, setMixerModel] = useState(MIXER_OPTIONS[2]);
  const [musicians, setMusicians] = useState(MUSICIAN_OPTIONS[1]);
  const [whatsapp, setWhatsapp] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const emailOk = isValidEmail(email);
  const canSubmit = emailOk && status !== "sending";

  async function handleSubmit() {
    if (!emailOk) {
      setStatus("error");
      setErrorMsg("Informe um e-mail válido.");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    const res = await submitEarlyAccess({
      feature: "personal_monitor",
      name: name.trim() || email.trim().split("@")[0],
      email: email.trim(),
      role,
      mixerModel,
      musicians,
      whatsapp: whatsapp.trim(),
      plan,
      source,
      appVersion,
      userId,
    });
    if (res.ok) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMsg(
        res.error === "network"
          ? "Sem conexão agora. Tente de novo quando estiver online."
          : "Não consegui registrar agora. Tente novamente em instantes."
      );
    }
  }

  return (
    <div
      className="upg-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ea-card" role="dialog" aria-modal="true" aria-labelledby="ea-title">
        <button type="button" className="ea-close" onClick={onClose} aria-label="Fechar">✕</button>

        {status === "success" ? (
          <div className="ea-success">
            <div className="ea-success__icon" aria-hidden="true">✓</div>
            <h2 className="upg-heading" id="ea-title">Você está na lista!</h2>
            <p className="upg-desc">
              Assim que o <strong>Monitor Pessoal</strong> abrir, avisamos no e-mail
              {whatsapp.trim() ? " (e no WhatsApp)" : ""}. Obrigado pelo interesse.
            </p>
            <div className="upg-actions">
              <button type="button" className="upg-btn upg-btn--primary" onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="ea-header">
              <span className="upg-badge">Em breve · Early Access</span>
              <h2 className="upg-heading" id="ea-title">Monitor Pessoal</h2>
              <p className="upg-desc">
                Cada músico ajusta a própria mix de retorno — o operador continua no
                controle da mesa. Entre na lista e seja avisado quando abrir.
              </p>
            </div>

            <div className="ea-form">
              <div className="ea-field">
                <label className="ea-label">Você é</label>
                <div className="ea-seg" role="group" aria-label="Papel">
                  <button
                    type="button"
                    className={`ea-seg__btn${role === "musico" ? " ea-seg__btn--active" : ""}`}
                    onClick={() => setRole("musico")}
                  >
                    🎸 Músico
                  </button>
                  <button
                    type="button"
                    className={`ea-seg__btn${role === "operador" ? " ea-seg__btn--active" : ""}`}
                    onClick={() => setRole("operador")}
                  >
                    🎛️ Operador
                  </button>
                </div>
              </div>

              <div className="ea-field">
                <label className="ea-label" htmlFor="ea-name">Nome</label>
                <input
                  id="ea-name"
                  className="ea-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como podemos te chamar"
                  autoComplete="name"
                />
              </div>

              <div className="ea-field">
                <label className="ea-label" htmlFor="ea-email">E-mail</label>
                <input
                  id="ea-email"
                  className="ea-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>

              <div className="ea-row">
                <div className="ea-field">
                  <label className="ea-label" htmlFor="ea-mixer">Sua mesa</label>
                  <select
                    id="ea-mixer"
                    className="ea-input"
                    value={mixerModel}
                    onChange={(e) => setMixerModel(e.target.value)}
                  >
                    {MIXER_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="ea-field">
                  <label className="ea-label" htmlFor="ea-musicians">Músicos</label>
                  <select
                    id="ea-musicians"
                    className="ea-input"
                    value={musicians}
                    onChange={(e) => setMusicians(e.target.value)}
                  >
                    {MUSICIAN_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ea-field">
                <label className="ea-label" htmlFor="ea-wpp">WhatsApp <span className="ea-optional">(opcional)</span></label>
                <input
                  id="ea-wpp"
                  className="ea-input"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                />
              </div>

              {status === "error" && errorMsg && (
                <p className="ea-result ea-result--error">{errorMsg}</p>
              )}
            </div>

            <div className="upg-actions">
              <button
                type="button"
                className="upg-btn upg-btn--primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {status === "sending" ? "Enviando…" : "Quero acesso antecipado"}
              </button>
              <button type="button" className="upg-btn upg-btn--ghost" onClick={onClose}>
                Agora não
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
