import { useState, useCallback } from "react";
import type { Axios16Client } from "../lib/axios16Client";
import { valueToFaderDb } from "../lib/axios16Client";
import type { GroupMember } from "../protocol/duonn/bitmask";
import type { DcaGroupId } from "../protocol/duonn/groups";
import {
  buildClearDcaMembersMessages,
  buildSetDcaEnabledMessages,
  buildSetDcaFaderMessage,
  buildSetDcaMembersMessages,
  DCA_GROUPS_CONFIG,
} from "../protocol/duonn/groups";
import { VerticalFader } from "./VerticalFader";
import { GroupMemberSelector } from "./GroupMemberSelector";

type DcaGroupState = {
  enabled: boolean;
  faderPosition: number; // 0-100 UI position (linear → 0-1300 protocol)
  members: GroupMember[];
};

const DCA_IDS: DcaGroupId[] = [1, 2, 3, 4];

const DCA_ACCENT_COLORS: Record<DcaGroupId, string> = {
  1: "var(--brand-duonn-cyan)",
  2: "var(--primitive-amber-500)",
  3: "var(--primitive-green-500)",
  4: "var(--primitive-purple-500)",
};

const DCA_LABEL_COLORS: Record<DcaGroupId, string> = {
  1: "var(--text-accent)",
  2: "var(--text-warning)",
  3: "var(--text-success)",
  4: "var(--text-phantom)",
};

function dcaPositionToValue(position: number): number {
  // Linear: 0-100% → 0-1300
  return Math.round(Math.max(0, Math.min(100, position)) * 13);
}

function dcaValueToPosition(value: number): number {
  return Math.round(Math.max(0, Math.min(1300, value)) / 13);
}

function dcaFaderLabel(value: number): string {
  if (value === 0) return "−∞";
  const db = valueToFaderDb(value);
  if (db >= 0) return `+${db} dB`;
  if (db <= -120) return "−∞";
  return `${db} dB`;
}

function createInitialDcaState(): DcaGroupState[] {
  return DCA_IDS.map(() => ({
    enabled: true,
    faderPosition: 92, // ~0 dB
    members: [],
  }));
}

function sendMessages(
  client: Axios16Client,
  messages: { param: number; value: number }[]
) {
  for (const msg of messages) {
    client.sendParam(msg.param, msg.value);
  }
}

type DcaGroupsViewProps = {
  client: Axios16Client | null;
  isConnected: boolean;
  channelNames?: string[];
};

export function DcaGroupsView({
  client,
  isConnected,
  channelNames,
}: DcaGroupsViewProps) {
  const [groups, setGroups] = useState<DcaGroupState[]>(createInitialDcaState);
  const [selectedGroup, setSelectedGroup] = useState<DcaGroupId>(1);

  const updateGroup = useCallback(
    (id: DcaGroupId, patch: Partial<DcaGroupState>) => {
      setGroups((prev) =>
        prev.map((g, i) => (i === id - 1 ? { ...g, ...patch } : g))
      );
    },
    []
  );

  function handleToggleEnabled(id: DcaGroupId) {
    if (!client || !isConnected) return;
    const next = !groups[id - 1].enabled;
    try {
      sendMessages(client, buildSetDcaEnabledMessages(id, next));
    } catch (e) {
      console.error("[DCA] toggle enabled error:", e);
      return;
    }
    updateGroup(id, { enabled: next });
  }

  function handleFaderChange(id: DcaGroupId, position: number) {
    if (!client || !isConnected) return;
    const protocolValue = dcaPositionToValue(position);
    try {
      const msg = buildSetDcaFaderMessage(id, protocolValue);
      client.sendParam(msg.param, msg.value);
    } catch (e) {
      console.error("[DCA] fader error:", e);
      return;
    }
    updateGroup(id, { faderPosition: position });
  }

  function handleMembersChange(id: DcaGroupId, members: GroupMember[]) {
    if (!client || !isConnected) return;
    try {
      sendMessages(client, buildSetDcaMembersMessages(id, members));
    } catch (e) {
      console.error("[DCA] members error:", e);
      return;
    }
    updateGroup(id, { members });
  }

  function handleClear(id: DcaGroupId) {
    if (!client || !isConnected) return;
    try {
      sendMessages(client, buildClearDcaMembersMessages(id));
    } catch (e) {
      console.error("[DCA] clear error:", e);
      return;
    }
    updateGroup(id, { members: [] });
  }

  const selectedGroupState = groups[selectedGroup - 1];
  const selectedAccent = DCA_ACCENT_COLORS[selectedGroup];
  const isDerived = DCA_GROUPS_CONFIG[selectedGroup].isDerived ?? false;

  return (
    <div className="groups-view">
      <div className="groups-view__left">
        <div className="groups-view__list-header">
          <p className="groups-view__subtitle">
            Control linked channel groups with shared level and assignment.
          </p>
        </div>

        <div className="dca-groups-list">
          {DCA_IDS.map((id) => {
            const state = groups[id - 1];
            const accentColor = DCA_ACCENT_COLORS[id];
            const labelColor = DCA_LABEL_COLORS[id];
            const faderValue = dcaPositionToValue(state.faderPosition);
            const isSelected = selectedGroup === id;

            return (
              <button
                key={id}
                type="button"
                className={`dca-group-card ${isSelected ? "dca-group-card--selected" : ""} ${!isConnected ? "dca-group-card--offline" : ""}`}
                style={{ "--dca-accent": accentColor } as React.CSSProperties}
                onClick={() => setSelectedGroup(id)}
              >
                <div className="dca-group-card__top">
                  <div className="dca-group-card__identity">
                    <span
                      className="dca-group-card__label"
                      style={{ color: labelColor }}
                    >
                      DCA {id}
                    </span>
                    <span className="dca-group-card__count">
                      {state.members.length}{" "}
                      {state.members.length === 1 ? "channel" : "channels"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`dca-toggle ${state.enabled ? "dca-toggle--on" : "dca-toggle--off"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleEnabled(id);
                    }}
                    disabled={!isConnected}
                    title={state.enabled ? "Desativar DCA" : "Ativar DCA"}
                  >
                    {state.enabled ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="dca-group-card__fader-row">
                  <div className="dca-group-card__fader-track">
                    <VerticalFader
                      value={state.faderPosition}
                      height={120}
                      width={20}
                      disabled={!isConnected || !state.enabled}
                      snapPoints={[92]}
                      snapThreshold={2}
                      zeroMarkerValue={92}
                      dragFromThumbOnly
                      onChange={(pos) => handleFaderChange(id, pos)}
                    />
                  </div>
                  <span className="dca-group-card__fader-db">
                    {dcaFaderLabel(faderValue)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="groups-view__right">
        <div className="groups-view__matrix-header">
          <div>
            <span
              className="groups-view__matrix-title"
              style={{ color: DCA_LABEL_COLORS[selectedGroup] }}
            >
              ASSIGNMENT MATRIX — DCA {selectedGroup}
            </span>
            {isDerived && (
              <span className="groups-view__derived-badge">DERIVED</span>
            )}
          </div>
          <div className="groups-view__matrix-actions">
            <button
              type="button"
              className="groups-view__action-btn"
              disabled={!isConnected}
              onClick={() => {
                const allConfirmed: GroupMember[] = [
                  "CH_1","CH_2","CH_3","CH_4","CH_5","CH_6","CH_7","CH_8",
                  "CH_9","CH_10","CH_11","CH_12","CH_13","CH_14","CH_15","CH_16",
                ];
                handleMembersChange(selectedGroup, allConfirmed);
              }}
            >
              SELECT ALL CH
            </button>
            <button
              type="button"
              className="groups-view__action-btn groups-view__action-btn--danger"
              disabled={!isConnected}
              onClick={() => handleClear(selectedGroup)}
            >
              CLEAR
            </button>
          </div>
        </div>

        <p className="groups-view__matrix-hint">
          Selecione os canais e buses que pertencem a este grupo DCA.
          {isDerived && (
            <> <span style={{ color: "var(--text-warning)" }}>Mapeamento derivado por stride — validar no hardware.</span></>
          )}
        </p>

        <GroupMemberSelector
          selectedMembers={selectedGroupState.members}
          accentColor={selectedAccent}
          disabled={!isConnected}
          channelNames={channelNames}
          onChange={(members) => handleMembersChange(selectedGroup, members)}
        />
      </div>
    </div>
  );
}
