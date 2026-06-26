import type { BootstrapVersionInfo } from "../../services/bootstrapService";
import { MixerConnectCard, type MixerConnectStatus } from "./cards/MixerConnectCard";
import { MonitorCard } from "./cards/MonitorCard";
import { DemoCard } from "./cards/DemoCard";
import { UpdateCard } from "./cards/UpdateCard";

type HomeDashboardProps = {
  firstName?: string;
  showIem?: boolean;
  onDemo?: () => void;
  onIemInterest?: () => void;
  /** Estado do card principal de mesa (discovery real). */
  connectStatus?: MixerConnectStatus;
  mixerName?: string;
  mixerIp?: string;
  mixerChannels?: number;
  /** Ação do card por estado (conectar / buscar novamente / reconectar). */
  onConnectCardAction?: () => void;
  versionInfo?: BootstrapVersionInfo | null;
  onRequestInstallUpdate?: () => void;
};

/** Conteúdo da Home (header + grid de ações + update). Figma `Content` → `.home-dashboard`. */
export function HomeDashboard({
  firstName,
  showIem,
  onDemo,
  onIemInterest,
  connectStatus = "scanning",
  mixerName,
  mixerIp,
  mixerChannels,
  onConnectCardAction,
  versionInfo = null,
  onRequestInstallUpdate,
}: HomeDashboardProps) {
  return (
    <div className="home-dashboard">
      <header className="home-dashboard__header">
        <div>
          <h1 className="home-dashboard__title">
            {firstName ? `Bem-vindo, ${firstName}` : "Bem-vindo"}
          </h1>
          <p className="home-dashboard__subtitle">Sua mesa está pronta para conectar!</p>
        </div>
      </header>

      <div className={`home-dashboard__actions${showIem ? "" : " home-dashboard__actions--duo"}`}>
        <MixerConnectCard
          status={connectStatus}
          deviceName={mixerName}
          ip={mixerIp}
          channels={mixerChannels}
          onAction={onConnectCardAction ?? (() => {})}
        />
        {showIem && <MonitorCard onAction={onIemInterest} />}
        <DemoCard onDemo={onDemo} />
      </div>

      <UpdateCard versionInfo={versionInfo} onRequestInstallUpdate={onRequestInstallUpdate} />
    </div>
  );
}
