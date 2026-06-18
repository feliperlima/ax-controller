type UpgradeModalProps = {
  canStartTrial: boolean;
  onUpgrade: () => void;
  onStartTrial: () => void;
  onClose: () => void;
};

export function UpgradeModal({ canStartTrial, onUpgrade, onStartTrial, onClose }: UpgradeModalProps) {
  return (
    <div className="upg-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="upg-card">
        <div className="upg-badge">AX CONTROL+</div>

        <div className="upg-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>

        <div className="upg-body">
          <p className="upg-feature">Recurso Plus</p>
          <h2 className="upg-heading">Disponível no Plus</h2>
          <p className="upg-desc">
            Pagamento único e vitalício — sem mensalidades.
            {canStartTrial && " Experimente 7 dias grátis antes de decidir, sem cartão."}
          </p>
        </div>

        <div className="upg-actions">
          <button type="button" className="upg-btn upg-btn--primary" onClick={onUpgrade}>
            Comprar agora
          </button>
          {canStartTrial && (
            <button type="button" className="upg-btn upg-btn--secondary" onClick={onStartTrial}>
              Experimentar 7 dias grátis
            </button>
          )}
          <button type="button" className="upg-btn upg-btn--ghost" onClick={onClose}>
            Continuar no Free
          </button>
        </div>
      </div>
    </div>
  );
}
