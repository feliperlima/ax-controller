import { useState, useCallback, useEffect, useRef } from "react";
import type { Axios16Client } from "../lib/axios16Client";
import { GROUP_MEMBER_BITS, decodeGroupMembers, type GroupMember } from "../protocol/duonn/bitmask";
import type { MuteGroupId } from "../protocol/duonn/groups";
import {
  buildAllMutedMuteGroupMessages,
  buildClearMuteGroupMembersMessages,
  getMuteGroupActiveParam,
  getMuteGroupMemberParams,
  buildSetMuteGroupActiveMessages,
  buildSetMuteGroupMembersMessages,
  MUTE_GROUPS_CONFIG,
} from "../protocol/duonn/groups";

type MuteGroupState = {
  active: boolean;
  members: GroupMember[];
};

const MUTE_IDS: MuteGroupId[] = [1, 2, 3, 4];

const CHANNEL_IDS_MAX = [
  "CH_1", "CH_2", "CH_3", "CH_4", "CH_5", "CH_6", "CH_7", "CH_8",
  "CH_9", "CH_10", "CH_11", "CH_12", "CH_13", "CH_14", "CH_15", "CH_16",
  "CH_17", "CH_18", "CH_19", "CH_20", "CH_21", "CH_22", "CH_23", "CH_24",
] as const;

const AUX_IDS = [
  "AUX_1", "AUX_2", "AUX_3", "AUX_4", "AUX_5", "AUX_6", "AUX_7", "AUX_8",
] as const;

const FX_IDS = ["FX_1", "FX_2"] as const;

const MASTER_IDS = ["MASTER_L", "MASTER_R"] as const;

type AssignableMemberId = GroupMember;

type MatrixRow = {
  id: AssignableMemberId;
  tag: string;
  name: string;
  colorId?: number;
  disabled?: boolean;
};

function channelBadgeColorFromId(colorId: number | undefined): string {
  const normalized = Math.max(0, Math.min(12, Math.round(colorId ?? 0)));
  if (normalized === 0) return "#7b7b7b";
  return `var(--channel-${String(normalized).padStart(2, "0")}, #7b7b7b)`;
}

function isMemberSelectable(member: AssignableMemberId) {
  return GROUP_MEMBER_BITS[member] !== null;
}

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

function applyMuteToMember(client: Axios16Client, member: AssignableMemberId, shouldMute: boolean) {
  if (member.startsWith("CH_")) {
    const channel = Number(member.slice(3));
    if (Number.isFinite(channel) && channel >= 1 && channel <= 24) {
      client.setMute(channel, shouldMute);
    }
    return;
  }

  if (member.startsWith("AUX_")) {
    const aux = Number(member.slice(4));
    if (Number.isFinite(aux) && aux >= 1 && aux <= 8) {
      client.setAuxMute(aux, shouldMute);
    }
    return;
  }

  if (member.startsWith("FX_")) {
    const fx = Number(member.slice(3));
    if (Number.isFinite(fx) && (fx === 1 || fx === 2)) {
      client.setFxMute(fx, shouldMute);
    }
    return;
  }

  if (member === "MASTER_L") {
    client.setMasterMute("left", shouldMute);
    return;
  }

  if (member === "MASTER_R") {
    client.setMasterMute("right", shouldMute);
  }
}

type MuteGroupsViewProps = {
  client: Axios16Client | null;
  isConnected: boolean;
  channelCount?: number;
  onMemberMuteApplied?: (memberId: string, muted: boolean) => void;
  channelNames?: string[];
  channelColorIds?: number[];
  auxNames?: string[];
  auxColorIds?: number[];
  fxNames?: string[];
  fxColorIds?: number[];
  masterColorIds?: [number, number];
};

export function MuteGroupsView({
  client,
  isConnected,
  channelCount = 16,
  onMemberMuteApplied,
  channelNames,
  channelColorIds,
  auxNames,
  auxColorIds,
  fxNames,
  fxColorIds,
  masterColorIds,
}: MuteGroupsViewProps) {
  const CHANNEL_IDS = CHANNEL_IDS_MAX.slice(0, Math.max(1, Math.min(24, channelCount))) as GroupMember[];
  const ASSIGNABLE_MEMBER_IDS: AssignableMemberId[] = [...CHANNEL_IDS, ...AUX_IDS, ...FX_IDS, ...MASTER_IDS];

  const [groups, setGroups] = useState<MuteGroupState[]>(createInitialMuteState);
  const [selectedGroup, setSelectedGroup] = useState<MuteGroupId>(1);
  const [confirmAllMuted, setConfirmAllMuted] = useState<MuteGroupId | null>(null);
  const matrixColumnsRef = useRef<HTMLDivElement | null>(null);
  const lastAppliedMuteSignatureRef = useRef("");

  const applyManagedMutes = useCallback((nextGroups: MuteGroupState[]) => {
    if (!client || !isConnected) {
      lastAppliedMuteSignatureRef.current = "";
      return;
    }

    const managedMembersSet = new Set<AssignableMemberId>();
    const activeMembersSet = new Set<AssignableMemberId>();

    for (const group of nextGroups) {
      for (const member of group.members) {
        if (!ASSIGNABLE_MEMBER_IDS.includes(member)) continue;
        managedMembersSet.add(member);
        if (group.active) {
          activeMembersSet.add(member);
        }
      }
    }

    const managedOrdered = ASSIGNABLE_MEMBER_IDS.filter((member) => managedMembersSet.has(member));
    const activeOrdered = ASSIGNABLE_MEMBER_IDS.filter((member) => activeMembersSet.has(member));
    const signature = `${managedOrdered.join(",")}|${activeOrdered.join(",")}`;

    if (signature === lastAppliedMuteSignatureRef.current) {
      return;
    }

    for (const member of managedOrdered) {
      const shouldMute = activeMembersSet.has(member);
      applyMuteToMember(client, member, shouldMute);
      onMemberMuteApplied?.(member, shouldMute);
    }

    lastAppliedMuteSignatureRef.current = signature;
  }, [client, isConnected, onMemberMuteApplied]);

  useEffect(() => {
    const root = matrixColumnsRef.current;
    if (!root) return;

    const lists = root.querySelectorAll<HTMLElement>(".dca-matrix-column__list");
    lists.forEach((list) => {
      list.scrollTop = 0;
    });
  }, [selectedGroup]);

  useEffect(() => {
    if (!client || !isConnected) return;

    let disposed = false;

    const syncMuteGroupStates = async () => {
      try {
        const params = MUTE_IDS.flatMap((id) => [
          getMuteGroupActiveParam(id),
          ...getMuteGroupMemberParams(id),
        ]);
        const response = await client.readParams(params, 1000);
        const values = new Map(response.map((item) => [item.param, item.value]));

        if (disposed) return;

        setGroups((current) => {
          const next = current.map((group, index) => {
            const id = MUTE_IDS[index];
            const raw = values.get(getMuteGroupActiveParam(id));
            const memberParams = getMuteGroupMemberParams(id);
            const words = memberParams.map((param) => values.get(param));

            const nextMembers = words.every((word) => word !== undefined)
              ? decodeGroupMembers(words as [number, number, number, number]).filter(
                  (member) => ASSIGNABLE_MEMBER_IDS.includes(member)
                )
              : group.members;

            if (raw === undefined) {
              return {
                ...group,
                members: nextMembers,
              };
            }

            return {
              ...group,
              active: raw > 0,
              members: nextMembers,
            };
          });

          applyManagedMutes(next);
          return next;
        });
      } catch {
        // Ignore transient read failures.
      }
    };

    syncMuteGroupStates();
    const timer = window.setInterval(syncMuteGroupStates, 1500);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [client, isConnected]);

  useEffect(() => {
    if (!client || !isConnected) {
      lastAppliedMuteSignatureRef.current = "";
    }
  }, [client, isConnected]);

  const updateGroup = useCallback(
    (id: MuteGroupId, patch: Partial<MuteGroupState>) => {
      setGroups((prev) =>
      {
        const next = prev.map((g, i) => (i === id - 1 ? { ...g, ...patch } : g));
        applyManagedMutes(next);
        return next;
      });
    },
    [applyManagedMutes]
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
    const mappedMembers = ASSIGNABLE_MEMBER_IDS.filter((member) => isMemberSelectable(member));
    updateGroup(id, { members: mappedMembers as GroupMember[] });
    setConfirmAllMuted(null);
  }

  function handleToggleAssignableMember(id: MuteGroupId, memberId: AssignableMemberId) {
    if (!isMemberSelectable(memberId)) return;

    const current = groups[id - 1].members;
    const selectedAssignable = ASSIGNABLE_MEMBER_IDS.filter((member) => current.includes(member));
    const selectedSet = new Set(selectedAssignable);
    const preservedMembers = current.filter((member) => !ASSIGNABLE_MEMBER_IDS.includes(member as AssignableMemberId));

    if (selectedSet.has(memberId)) {
      selectedSet.delete(memberId);
    } else {
      selectedSet.add(memberId);
    }

    const orderedSelected = ASSIGNABLE_MEMBER_IDS.filter((member) => selectedSet.has(member));
    handleMembersChange(id, [...preservedMembers, ...orderedSelected]);
  }

  function getMuteGroupName(id: MuteGroupId): string {
    return `Mute Group ${id}`;
  }

  const selectedGroupState = groups[selectedGroup - 1];
  const isDerived = MUTE_GROUPS_CONFIG[selectedGroup].isDerived ?? false;
  const selectedAssignableMembers = ASSIGNABLE_MEMBER_IDS.filter((member) => selectedGroupState.members.includes(member));
  const selectedSet = new Set(selectedAssignableMembers);
  const matrixRows: MatrixRow[] = [
    ...CHANNEL_IDS.map((id, index) => {
      const channelNumber = index + 1;
      const name = channelNames?.[index]?.trim() || `CH ${channelNumber}`;
      return {
        id,
        tag: `CH ${channelNumber}`,
        name,
        colorId: channelColorIds?.[index],
        disabled: !isMemberSelectable(id),
      };
    }),
    ...AUX_IDS.map((id, index) => {
      const auxNumber = index + 1;
      const name = auxNames?.[index]?.trim() || `AUX ${auxNumber}`;
      return {
        id,
        tag: `AUX ${auxNumber}`,
        name,
        colorId: auxColorIds?.[index],
        disabled: !isMemberSelectable(id),
      };
    }),
    ...FX_IDS.map((id, index) => {
      const fxNumber = index + 1;
      const name = fxNames?.[index]?.trim() || `FX ${fxNumber}`;
      return {
        id,
        tag: `FX ${fxNumber}`,
        name,
        colorId: fxColorIds?.[index],
        disabled: !isMemberSelectable(id),
      };
    }),
    {
      id: "MASTER_L",
      tag: "MASTER",
      name: "Left",
      colorId: masterColorIds?.[0] ?? 0,
      disabled: !isMemberSelectable("MASTER_L"),
    },
    {
      id: "MASTER_R",
      tag: "MASTER",
      name: "Right",
      colorId: masterColorIds?.[1] ?? 0,
      disabled: !isMemberSelectable("MASTER_R"),
    },
  ];
  const channelRows = matrixRows.filter((row) => row.id.startsWith("CH_"));
  const outputRows = matrixRows.filter((row) => row.id.startsWith("AUX_") || row.id.startsWith("FX_") || row.id.startsWith("MASTER_"));

  function renderMatrixRow(row: MatrixRow) {
    const selected = selectedSet.has(row.id);
    const isDisabled = !isConnected || Boolean(row.disabled);

    return (
      <button
        key={row.id}
        type="button"
        className={`dca-matrix-row ${selected ? "dca-matrix-row--selected" : ""}`}
        disabled={isDisabled}
        onClick={() => {
          if (row.disabled) return;
          handleToggleAssignableMember(selectedGroup, row.id);
        }}
      >
        <span className={`dca-matrix-row__checkbox ${selected ? "dca-matrix-row__checkbox--selected" : ""}`}>
          {selected ? "✓" : ""}
        </span>
        <span
          className="dca-matrix-row__tag"
          style={{ "--channel-accent": channelBadgeColorFromId(row.colorId) } as React.CSSProperties}
        >
          {row.tag}
        </span>
        <span className="dca-matrix-row__name">{row.name}</span>
      </button>
    );
  }

  return (
    <div
      className="mute-groups-view"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gridTemplateRows: "32px minmax(0, 1fr)",
        gap: 0,
        padding: "8px",
      }}
    >
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

      <section
        style={{
          minWidth: 0,
          borderRadius: 4,
          border: "none",
          background: "transparent",
          overflow: "hidden",
        }}
      >
        <div
          role="tablist"
          aria-label="Mute groups"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {MUTE_IDS.map((id) => {
            const isSelected = selectedGroup === id;

            return (
              <button
                key={id}
                id={`mute-group-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                disabled={!isConnected}
                onClick={() => setSelectedGroup(id)}
                style={{
                  height: 32,
                  padding: "0 16px",
                  borderRadius: 0,
                  border: "none",
                  borderBottom: isSelected
                    ? "2px solid var(--border-focus)"
                    : "2px solid transparent",
                  background: "transparent",
                  color: isSelected
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  fontSize: 10,
                  lineHeight: "12px",
                  fontWeight: 700,
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  cursor: !isConnected ? "not-allowed" : "pointer",
                  opacity: !isConnected ? 0.5 : 1,
                  whiteSpace: "nowrap",
                  width: "auto",
                  flex: "0 0 auto",
                }}
              >
                {getMuteGroupName(id)}
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="detail-panel"
        id={`mute-group-panel-${selectedGroup}`}
        role="tabpanel"
        aria-labelledby={`mute-group-tab-${selectedGroup}`}
        style={{
          borderRadius: 4,
          border: "none",
          background: "transparent",
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
          zIndex: 1,
          padding: "24px 0 0 0",
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr)",
          gap: 4,
        }}
      >
        <div className="dca-groups-view__matrix-headbar">
          <div className="groups-view__matrix-header">
          <div>
            <span className="groups-view__matrix-title">
              {getMuteGroupName(selectedGroup)}
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
              CLEAR ALL
            </button>
            <button
              type="button"
              className={`mute-toggle mute-groups-side-tab__mute-btn ${selectedGroupState.active ? "mute-toggle--on" : "mute-toggle--off"}`}
              disabled={!isConnected}
              onClick={() => handleToggleActive(selectedGroup)}
              title={selectedGroupState.active ? "Desativar grupo de mute" : "Ativar grupo de mute"}
            >
              MUTE
            </button>
          </div>
        </div>
          </div>

        <div className="dca-matrix-columns" ref={matrixColumnsRef}>
          <section className="dca-matrix-column">
            <div className="dca-matrix-column__list">
              {channelRows.map(renderMatrixRow)}
            </div>
          </section>

          <section className="dca-matrix-column">
            <div className="dca-matrix-column__list">
              {outputRows.map(renderMatrixRow)}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
