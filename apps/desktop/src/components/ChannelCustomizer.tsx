import { useEffect, useState } from "react";

const CHANNEL_COLOR_PALETTE: Record<number, string> = {
  0: "#7B7B7B",
  1: "#4174BE",
  2: "#4F22E8",
  3: "#13BEC4",
  4: "#8BA52C",
  5: "#0CBD42",
  6: "#139EE6",
  7: "#A514E8",
  8: "#EBD93A",
  9: "#ED004C",
  10: "#F95361",
  11: "#E80CE9",
  12: "#C96626",
};

type ChannelCustomizerProps = {
  channel: number;
  title?: string;
  defaultName: string;
  channelName: string;
  colorId: number;
  allowZeroColorSelection?: boolean;
  onSave: (patch: { channelName: string; colorId: number }) => void;
  onClose: () => void;
};

export function ChannelCustomizer({
  channel,
  title = "Editar Canal",
  defaultName,
  channelName,
  colorId,
  allowZeroColorSelection = false,
  onSave,
  onClose,
}: ChannelCustomizerProps) {
  const [draftName, setDraftName] = useState(channelName);
  const [draftColorId, setDraftColorId] = useState(colorId);

  useEffect(() => {
    setDraftName(channelName.trim() === defaultName.trim() ? "" : channelName);
    setDraftColorId(colorId);
  }, [channelName, colorId, channel, defaultName]);

  function handleClear() {
    setDraftName("");
    setDraftColorId(0);
  }

  function handleSave() {
    onSave({ channelName: draftName, colorId: draftColorId });
    onClose();
  }

  return (
    <div className="settings-modal-backdrop channel-customizer-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="settings-modal channel-customizer-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-modal__header channel-customizer-modal__header">
          <h2>{title}</h2>
          <button
            type="button"
            className="channel-customizer-modal__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="channel-customizer-modal__content">
          <div className="channel-customizer-modal__name-row">
            <input
              type="text"
              className="settings-modal__input"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder={defaultName}
              maxLength={32}
              autoFocus
            />

            <button
              type="button"
              className="startup-button startup-button--secondary channel-customizer-modal__clear"
              onClick={handleClear}
            >
              Clear
            </button>
          </div>

          <div className="channel-customizer-modal__palette">
            {Object.entries(CHANNEL_COLOR_PALETTE)
              .filter(([id]) => allowZeroColorSelection || Number(id) !== 0)
              .map(([id, color]) => {
                const numericId = Number(id);
                const isActive = numericId === draftColorId;

                return (
                  <button
                    key={id}
                    type="button"
                    title={`Cor ${id}`}
                    aria-label={`Selecionar cor ${id}`}
                    onClick={() => setDraftColorId(numericId)}
                    className={`channel-customizer-modal__swatch ${isActive ? "channel-customizer-modal__swatch--active" : ""}`}
                    style={{ background: color }}
                  />
                );
              })}
          </div>
        </div>

        <div className="settings-modal__actions channel-customizer-modal__actions">
          <button
            type="button"
            className="startup-button startup-button--secondary"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="startup-button startup-button--primary"
            onClick={handleSave}
          >
            Salvar
          </button>
        </div>
      </section>
    </div>
  );
}
