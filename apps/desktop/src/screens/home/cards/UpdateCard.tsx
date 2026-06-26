import { ArrowUp, Download, CircleCheck, XCircle } from "lucide-react";
import type { BootstrapVersionInfo } from "../../../services/bootstrapService";
import { useUpdateState, dismissUpdateBanner, startDownload } from "../../../services/updateService";

type UpdateCardProps = {
  versionInfo: BootstrapVersionInfo | null;
  /** Instala a atualização baixada (App confirma se houver mesa conectada → reinicia). */
  onRequestInstallUpdate?: () => void;
};

/** Card de auto-update (full-width). Figma `UpdateCard` (variantes Disponível/Baixando/Pronto).
 * Mantém a máquina de estados do auto-update + fallback manual (link). */
export function UpdateCard({ versionInfo, onRequestInstallUpdate }: UpdateCardProps) {
  const update = useUpdateState();

  const autoActive =
    !update.dismissed &&
    (update.phase === "available" || update.phase === "downloading" || update.phase === "ready" || update.phase === "installing");
  const hasManualUpdate = !autoActive && versionInfo && versionInfo.update_type !== "none";

  if (!autoActive && !hasManualUpdate) return null;

  const ready = update.phase === "ready";
  const downloading = update.phase === "downloading";
  const installing = update.phase === "installing";

  // ── Estado de download em andamento ──
  if (autoActive && downloading) {
    return (
      <div className="home-update-card">
        <span className="home-update-card__icon home-update-card__icon--info"><Download size={20} /></span>
        <div className="home-update-card__body">
          <div className="home-update-card__title-row">
            <p className="home-update-card__title">Baixando atualização {update.version}…</p>
          </div>
          <div className="home-update-card__progress">
            <div className="home-update-card__progress-fill" style={{ width: `${update.percent}%` }} />
          </div>
          <p className="home-update-card__desc">{update.percent}% concluído</p>
        </div>
        <div className="home-update-card__actions">
          <button className="home-update-card__cancel" onClick={dismissUpdateBanner}>Ocultar</button>
        </div>
      </div>
    );
  }

  // ── Demais estados (disponível / pronto / instalando / manual) ──
  let icon = <ArrowUp size={20} />;
  let iconClass = "home-update-card__icon--info";
  let title = "";
  let desc = "";
  let showNew = false;
  let action: React.ReactNode = null;

  if (autoActive && ready) {
    icon = <CircleCheck size={20} />;
    iconClass = "home-update-card__icon--ready";
    title = `Atualização ${update.version} pronta`;
    desc = "O app será reiniciado para concluir.";
    action = <button className="home-update-card__btn home-update-card__btn--ready" onClick={onRequestInstallUpdate}>Instalar agora</button>;
  } else if (autoActive && installing) {
    icon = <CircleCheck size={20} />;
    iconClass = "home-update-card__icon--ready";
    title = `Instalando ${update.version}…`;
    desc = "Reiniciando o app para concluir.";
  } else if (autoActive) {
    title = `Atualização disponível ${update.version}`;
    desc = "Melhorias de estabilidade, detecção de mesas e ajustes de interface.";
    showNew = true;
    action = <button className="home-update-card__btn home-update-card__btn--info" onClick={startDownload}>Atualizar agora</button>;
  } else if (versionInfo) {
    title = `Atualização disponível ${versionInfo.latest_version}`;
    desc = versionInfo.message ?? "Baixe a atualização para ter os últimos recursos e correções.";
    showNew = true;
    if (versionInfo.download_url) {
      action = (
        <a className="home-update-card__btn home-update-card__btn--info" href={versionInfo.download_url} target="_blank" rel="noopener noreferrer">
          Atualizar agora
        </a>
      );
    }
  }

  return (
    <div className="home-update-card">
      <span className={`home-update-card__icon ${iconClass}`}>{icon}</span>
      <div className="home-update-card__body">
        <div className="home-update-card__title-row">
          <p className="home-update-card__title">{title}</p>
          {showNew && <span className="home-update-card__new">Novo</span>}
        </div>
        <p className="home-update-card__desc">{desc}</p>
      </div>
      <div className="home-update-card__actions">
        {action}
        {!installing && (
          <button className="home-update-card__dismiss" onClick={dismissUpdateBanner} aria-label="Dispensar">
            <XCircle size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
