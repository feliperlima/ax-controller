import { useState, useCallback } from "react";
import type { Axios16Client } from "../lib/axios16Client";
import type { GroupMember } from "../protocol/duonn/bitmask";
import type { MuteGroupId } from "../protocol/duonn/groups";
import {
  buildAllMutedMuteGroupMessages,
  buildClearMuteGroupMembersMessages,
  buildSetMuteGroupActiveMessages,
  buildSetMuteGroupMembersMessages,
  MUTE_GROUPS_CONFIG,
} from "../protocol/duonn/groups";
import { GroupMemberSelector } from "./GroupMemberSelector";

type MuteGroupState = {
  active: boolean;
  members: GroupMember[];
};

const MUTE_IDS: MuteGroupId[] = [1, 2, 3, 4];

const MUTE_ACCENT_COLORS: Record<MuteGroupId, string> = {
  1: "var(--semantic-danger-base)",
  2: "var(--primitive-amber-500)",
  3: "var(--primitive-green-500)",
  4: "var(--primitive-purple-500)",
};

const MUTE_LABEL_COLORS: Record<MuteGroupId, string> = {
  1: "var(--text-danger)",
  2: "var(--text-warning)",
  3: "var(--text-success)",
  4: "var(--text-phantom)",
};

function createInitialMuteState(): MuteGroupState[] {
  return MUTE_IDS.map(() => ({
    active: false,
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

type MuteGroupsViewProps = {
  client: Axios16Client | null;
  isConnected: boolean;
  channelNames?: string[];
};

export function MuteGroupsView({
  client,
  isConnected,
  channelNames,
}: MuteGroupsViewProps) {
  const [groups, setGroups] = useState<MuteGroupState[]>(createInitialMuteState);
  const [selectedGroup, setSelectedGroup] = useState<MuteGroupId>(1);
  const [confirmAllMuted, setConfirmAllMuted] = useState<MuteGroupId | null>(null);

  const updateGroup = useCallback(
    (id: MuteGroupId, patch: Partial<MuteGroupState>) => {
      setGroups((prev) =>
        prev.map((g, i) => (i === id - 1 ? { ...g, ...patch } : g))
      );
    },
    []
  );

  function handleToggleActive(id: MuteGroupId) {
    if (!client || !isConnected) return;
    const next = !groups[id - 1].active;
    try {
      sendMessages(client, buildSetMuteGroupActiveMessages(id, next));
    } catch (e) {
      console.error("[Mute] toggle active error:", e);
      return;
    }
    updateGroup(id, { active: next });
  }

  function handleMembersChange(id: MuteGroupId, members: GroupMember[]) {
    if (!client || !isConnected) return;
    try {
      sendMessages(client, buildSetMuteGroupMembersMessages(id, members));
    } catch (e) {
      console.error("[Mute] members error:", e);
      return;
    }
    updateGroup(id, { members });
  }

  function handleClear(id: MuteGroupId) {
    if (!client || !isConnected) return;
    try {
      sendMessages(client, buildClearMuteGroupMembersMessages(id));
    } catch (e) {
      console.error("[Mute] clear error:", e);
      return;
    }
    updateGroup(id, { members: [] });
  }

  function handleAllMuted(id: MuteGroupId) {
    if (!client || !isConnected) return;
    const isDerived = MUTE_GROUPS_CONFIG[id].isDerived ?? false;
    try {
      const msgs = buildAllMutedMuteGroupMessages(id, {
        allowDerived: isDerived,
      });
      sendMessages(client, msgs);
    } catch (e) {
      console.error("[Mute] all muted error:", e);
      setConfirmAllMuted(null);
      return;
    }
    // optimistic: set all confirmed channel members
    const allChannels: GroupMember[] = [
      "CH_1","CH_2","CH_3","CH_4","CH_5","CH_6","CH_7","CH_8",
      "CH_9","CH_10","CH_11","CH_12","CH_13","CH_14","CH_15","CH_16",
      "FX_1","FX_2","AUX_1","AUX_8",
    ];
    updateGroup(id, { members: allChannels });
    setConfirmAllMuted(null);
  }

  const selectedGroupState = groups[selectedGroup - 1];
  const selectedAccent = MUTE_ACCENT_COLORS[selectedGroup];
  const isDerived = MUTE_GROUPS_CONFIG[selectedGroup].isDerived ?? false;

  return (
    <div className="groups-view">
      {/* All Muted confirmation overlay */}
      {confirmAllMuted !== null && (
        <div className="groups-view__confirm-overlay">
          <div className="groups-view__confirm-dialog">
            <p className="groups-view__confirm-title">Mute All in Group {confirmAllMuted}?</p>
            <p className="groups-view__confirm-body">
              Isso irá adicionar todos os canais mapeados ao grupo de mute {confirmAllMuted}.
              {(MUTE_GROUPS_CONFIG[confirmAllMuted].isDerived) && (
                <> <strong style={{ color: "var(--text-warning)" }}>Mapeamento derivado — validar no hardware.</strong></>
              )}
            </p>
            <div className="groups-view__confirm-actions">
              <button
                type="button"
                className="groups-view__action-btn groups-view__action-btn--danger"
                onClick={() => handleAllMuted(confirmAllMuted)}
              >
                CONFIRMAR
              </button>
              <button
                type="button"
                className="groups-view__action-btn"
                onClick={() => setConfirmAllMuted(null)}
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="groups-view__left">
        <div className="groups-view__list-header">
          <p className="groups-view__subtitle">
            Assign channels and buses to quick mute groups.
          </p>
        </div>

        <div className="mute-groups-list">
          {MUTE_IDS.map((id) => {
            const state = groups[id - 1];
            const labelColor = MUTE_LABEL_COLORS[id];
            const accentColor = MUTE_ACCENT_COLORS[id];
            const isSelected = selectedGroup === id;

            return (
              <button
                key={id}
                type="button"
                className={`mute-group-card ${state.active ? "mute-group-card--active" : ""} ${isSelected ? "mute-group-card--selected" : ""} ${!isConnected ? "mute-group-card--offline" : ""}`}
                style={{ "--mute-accent": accentColor } as React.CSSProperties}
                onClick={() => setSelectedGroup(id)}
              >
                <div className="mute-group-card__top">
                  <div className="mute-group-card__identity">
                    <span
                      className="mute-group-card__label"
                      style={{ color: labelColor }}
                    >
                      MUTE {id}
                    </span>
                    <span className="mute-group-card__count">
                      {state.members.length}{" "}
                      {state.members.length === 1 ? "channel" : "channels"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`mute-active-btn ${state.active ? "mute-active-btn--on" : "mute-active-btn--off"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(id);
                    }}
                    disabled={!isConnected}
                    title={state.active ? "Desativar grupo de mute" : "Ativar grupo de mute"}
                  >
                    {state.active ? "MUTED" : "MUTE"}
                  </button>
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
              style={{ color: MUTE_LABEL_COLORS[selectedGroup] }}
            >
              MUTE GROUP {selectedGroup} — ASSIGNMENT
            </span>
            {isDerived && (
              <span className="groups-view__derived-badge">DERIVED</span>
            )}
          </div>
          <div className="groups-view__matrix-actions">
            <button
              type="button"
              className="groups-view__action-btn groups-view__action-btn--warning"
              disabled={!isConnected}
              onClick={() => setConfirmAllMuted(selectedGroup)}
              title="Adicionar todos os membros mapeados ao grupo"
            >
              ALL MUTED
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
          Selecione os canais que pertencem a este grupo de mute.
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
