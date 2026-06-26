import { Wifi, Search, WifiOff, ArrowRight, RefreshCw } from "lucide-react";
import { Card } from "../../../design-system/components";

export type MixerConnectStatus = "found" | "scanning" | "not-found" | "last-session";

type MixerConnectCardProps = {
  status?: MixerConnectStatus;
  deviceName?: string;
  ip?: string;
  channels?: number;
  /** Ação do botão: conectar (found) ou buscar novamente (demais). */
  onAction: () => void;
};

/** Card principal de mesa, com 4 estados. Figma `MixingConnectCard` (variantes). */
export function MixerConnectCard({
  status = "scanning",
  deviceName = "",
  ip = "",
  channels = 0,
  onAction,
}: MixerConnectCardProps) {
  const isFound = status === "found";
  const isScanning = status === "scanning";
  const isNotFound = status === "not-found";
  const isLast = status === "last-session";
  const hasDevice = isFound || isLast;

  const glow = isFound ? "connect" : isLast ? "amber" : "slate";
  const eyebrow = isFound ? "Sua mesa" : isScanning ? "Escaneando" : isNotFound ? "Procurando" : "Última sessão";
  const title = hasDevice ? deviceName : isScanning ? "Procurando mesas…" : "Nenhuma mesa encontrada";

  return (
    <Card glow={glow} className="home-connect-card">
      <div className="home-connect-card__top">
        <div className="home-connect-card__eyebrow">
          <span className={`home-connect-card__icon home-connect-card__icon--${status}`}>
            {isFound && <Wifi size={24} />}
            {isScanning && <RefreshCw size={20} className="home-connect-card__spin" />}
            {isNotFound && <Search size={20} />}
            {isLast && <WifiOff size={20} />}
          </span>
          <span className={`home-connect-card__eyebrow-label home-connect-card__eyebrow-label--${status}`}>
            {eyebrow}
          </span>
        </div>

        <div className="home-connect-card__title-row">
          <h2 className={`home-connect-card__title${hasDevice ? "" : " home-connect-card__title--searching"}`}>
            {title}
          </h2>
          {isFound && <span className="home-connect-card__badge home-connect-card__badge--found">Encontrada</span>}
          {isLast && <span className="home-connect-card__badge home-connect-card__badge--last">Fora da rede</span>}
        </div>

        {hasDevice && (
          <div className={`home-connect-card__meta${isLast ? " home-connect-card__meta--last" : ""}`}>
            <span>IP {ip}</span>
            <span className="home-connect-card__dot" />
            <span>{channels} canais</span>
          </div>
        )}
        {isScanning && <p className="home-connect-card__desc">Verificando a rede local…</p>}
        {isNotFound && <p className="home-connect-card__desc">Verifique se sua mesa está ligada e na mesma rede Wi-Fi.</p>}
        {isLast && <p className="home-connect-card__desc">Não detectada na rede atual</p>}
      </div>

      {isScanning ? (
        <div className="home-connect-card__button home-connect-card__button--scanning" aria-disabled="true">
          Escaneando…
          <RefreshCw size={14} className="home-connect-card__spin" />
        </div>
      ) : (
        <button
          type="button"
          className={`home-connect-card__button home-connect-card__button--${status}`}
          onClick={onAction}
        >
          {isFound ? "Conectar agora" : "Buscar novamente"}
          {isFound ? <ArrowRight size={14} /> : <RefreshCw size={14} />}
        </button>
      )}
    </Card>
  );
}
