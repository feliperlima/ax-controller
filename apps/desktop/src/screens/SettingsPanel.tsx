type SettingsPanelProps = {
  version: string;
};

export function SettingsPanel({ version }: SettingsPanelProps) {
  return (
    <div className="home-panel">
      <div className="home-panel__header">
        <h1 className="home-panel__title">Configurações</h1>
        <p className="home-panel__subtitle">Preferências e opções do aplicativo.</p>
      </div>

      <div className="home-panel__body">
        <div className="startup-card home-panel__card">
          <div className="home-panel__row">
            <span className="home-panel__label">Versão</span>
            <span className="home-panel__value">v{version}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
