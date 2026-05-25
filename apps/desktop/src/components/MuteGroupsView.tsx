import { useState, type CSSProperties } from "react";
import type { GroupMember } from "../protocol/duonn/bitmask";
import type { MuteGroupId } from "../protocol/duonn/groups";
import { getMuteGroupConfig } from "../protocol/duonn/groups";
import {
  AUX_IDS,
  buildAssignableMemberIds,
  CHANNEL_IDS_MAX,
  FX_IDS,
  getAuxCountForChannelCount,
  getFxCountForChannelCount,
  isMemberSelectable,
  type AssignableMemberId,
  type MuteGroupState,
} from "../lib/groupControls";
import { stripColorForScope } from "./stripColor";

type MatrixRow = {
  id: AssignableMemberId;
  tag: string;
  name: string;
  colorId?: number;
  disabled?: boolean;
};

type MuteGroupsViewProps = {
  isConnected: boolean;
  channelCount?: number;
  groups: MuteGroupState[];
  onToggleActive: (id: MuteGroupId) => void;
  onMembersChange: (id: MuteGroupId, members: GroupMember[]) => void;
  onClear: (id: MuteGroupId) => void;
  onAllMuted: (id: MuteGroupId) => void;
  channelNames?: string[];
  channelColorIds?: number[];
  auxNames?: string[];
  auxColorIds?: number[];
  fxNames?: string[];
  fxColorIds?: number[];
  masterColorIds?: [number, number];
};

function rowBadgeColorFromId(row: MatrixRow): string {
  if (row.id.startsWith("AUX_")) return stripColorForScope(row.colorId, "aux");
  if (row.id.startsWith("FX_")) return stripColorForScope(row.colorId, "fx");
  if (row.id.startsWith("MASTER_")) return stripColorForScope(row.colorId, "master");
  return stripColorForScope(row.colorId, "channel");
}

export function MuteGroupsView({
  isConnected,
  channelCount = 16,
  groups,
  onToggleActive,
  onMembersChange,
  onClear,
  onAllMuted,
  channelNames,
  channelColorIds,
  auxNames,
  auxColorIds,
  fxNames,
  fxColorIds,
  masterColorIds,
}: MuteGroupsViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<MuteGroupId>(1);
  const [confirmAllMuted, setConfirmAllMuted] = useState<MuteGroupId | null>(null);
  const availableGroupIds = groups.map((_, index) => (index + 1) as MuteGroupId);
  const channelIds = CHANNEL_IDS_MAX.slice(0, Math.max(1, Math.min(CHANNEL_IDS_MAX.length, channelCount))) as GroupMember[];
  const auxIds = AUX_IDS.slice(0, getAuxCountForChannelCount(channelCount));
  const fxIds = FX_IDS.slice(0, getFxCountForChannelCount(channelCount));
  const assignableMemberIds = buildAssignableMemberIds(channelCount);

  const selectedGroupState = groups[selectedGroup - 1] ?? {
    active: false,
    members: [],
  };
  const isDerived = getMuteGroupConfig(selectedGroup).isDerived ?? false;
  const selectedAssignableMembers = assignableMemberIds.filter((member) => selectedGroupState.members.includes(member));
  const selectedSet = new Set(selectedAssignableMembers);

  const matrixRows: MatrixRow[] = [
    ...channelIds.map((id, index) => ({
      id,
      tag: `CH ${index + 1}`,
      name: channelNames?.[index]?.trim() || `CH ${index + 1}`,
      colorId: channelColorIds?.[index],
      disabled: !isMemberSelectable(id),
    })),
    ...auxIds.map((id, index) => ({
      id,
      tag: `AUX ${index + 1}`,
      name: auxNames?.[index]?.trim() || `AUX ${index + 1}`,
      colorId: auxColorIds?.[index],
      disabled: !isMemberSelectable(id),
    })),
    ...fxIds.map((id, index) => ({
      id,
      tag: `FX ${index + 1}`,
      name: fxNames?.[index]?.trim() || `FX ${index + 1}`,
      colorId: fxColorIds?.[index],
      disabled: !isMemberSelectable(id),
    })),
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
  const channelSplit = Math.ceil(channelRows.length / 2);
  const channelCol1 = channelRows.slice(0, channelSplit);
  const channelCol2 = channelRows.slice(channelSplit);
  const auxRows = matrixRows.filter((row) => row.id.startsWith("AUX_"));
  const fxRows = matrixRows.filter((row) => row.id.startsWith("FX_"));
  const masterRows = matrixRows.filter((row) => row.id.startsWith("MASTER_"));

  function handleToggleAssignableMember(id: MuteGroupId, memberId: AssignableMemberId) {
    if (!isMemberSelectable(memberId)) return;

    const current = groups[id - 1].members;
    const selectedAssignable = assignableMemberIds.filter((member) => current.includes(member));
    const selectedMembers = new Set(selectedAssignable);
    const preservedMembers = current.filter((member) => !assignableMemberIds.includes(member as AssignableMemberId));

    if (selectedMembers.has(memberId)) {
      selectedMembers.delete(memberId);
    } else {
      selectedMembers.add(memberId);
    }

    const orderedSelected = assignableMemberIds.filter((member) => selectedMembers.has(member));
    onMembersChange(id, [...preservedMembers, ...orderedSelected]);
  }

  function renderMatrixRow(row: MatrixRow, accent: string) {
    const selected = selectedSet.has(row.id);
    const isDisabled = !isConnected || Boolean(row.disabled);
    const channelAccent = rowBadgeColorFromId(row);

    return (
      <button
        key={row.id}
        type="button"
        className={`groups-structured-row ${selected ? "groups-structured-row--selected" : ""}`}
        disabled={isDisabled}
        style={{ "--group-select-accent": accent } as CSSProperties}
        onClick={() => {
          if (row.disabled) return;
          handleToggleAssignableMember(selectedGroup, row.id);
        }}
      >
        <span className={`groups-structured-row__checkbox ${selected ? "groups-structured-row__checkbox--selected" : ""}`}>
          {selected ? "✓" : ""}
        </span>
        <span
          className="groups-structured-row__tag"
          style={{ "--channel-accent": channelAccent } as CSSProperties}
        >
          {row.tag}
        </span>
        <span className="groups-structured-row__name">{row.name}</span>
      </button>
    );
  }

  return (
    <div className="groups-structured-view">
      {confirmAllMuted !== null && (
        <div className="groups-view__confirm-overlay">
          <div className="groups-view__confirm-dialog">
            <p className="groups-view__confirm-title">Mute All in Group {confirmAllMuted}?</p>
            <p className="groups-view__confirm-body">
              Isso ira adicionar todos os canais mapeados ao grupo de mute {confirmAllMuted}.
              {getMuteGroupConfig(confirmAllMuted).isDerived && (
                <> <strong style={{ color: "var(--text-warning)" }}>Mapeamento derivado - validar no hardware.</strong></>
              )}
            </p>
            <div className="groups-view__confirm-actions">
              <button
                type="button"
                className="groups-view__action-btn groups-view__action-btn--danger"
                onClick={() => {
                  onAllMuted(confirmAllMuted);
                  setConfirmAllMuted(null);
                }}
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

      <div className="groups-structured-tabs" role="tablist" aria-label="Mute groups">
        {availableGroupIds.map((id) => (
          <button
            key={id}
            id={`mute-group-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={selectedGroup === id}
            disabled={!isConnected}
            onClick={() => setSelectedGroup(id)}
            className={`groups-structured-tab ${selectedGroup === id ? "groups-structured-tab--active" : ""}`}
          >
            {`Mute Group ${id}`}
          </button>
        ))}
      </div>

      <section
        className="groups-structured-panel"
        id={`mute-group-panel-${selectedGroup}`}
        role="tabpanel"
        aria-labelledby={`mute-group-tab-${selectedGroup}`}
      >
        <div className="groups-view__matrix-header">
          <span className="groups-view__matrix-title">
            Mute Group {selectedGroup}
            {isDerived && <span className="groups-view__derived-badge">DERIVED</span>}
          </span>
          <div className="groups-view__matrix-actions groups-view__matrix-actions--outline">
            <button
              type="button"
              className="groups-view__action-btn"
              disabled={!isConnected}
              onClick={() => onMembersChange(selectedGroup, [...channelRows, ...auxRows, ...fxRows, ...masterRows].filter((r) => !r.disabled).map((r) => r.id))}
            >
              SELECT ALL
            </button>
            <button
              type="button"
              className="groups-view__action-btn"
              disabled={!isConnected}
              onClick={() => onClear(selectedGroup)}
            >
              CLEAR ALL
            </button>
            <button
              type="button"
              className={`mute-toggle groups-view__toggle-btn ${selectedGroupState.active ? "mute-toggle--on" : "mute-toggle--off"}`}
              disabled={!isConnected}
              onClick={() => onToggleActive(selectedGroup)}
            >
              MUTE
            </button>
          </div>
        </div>

        <div className="groups-matrix-card">
          <div className="groups-matrix-col groups-matrix-col--channels">
            <div className="groups-matrix-col__header">
              <span className="groups-matrix-col__title">Input Channels</span>
            </div>
            <div className="groups-matrix-col__split">
              <div className="groups-matrix-col__list">
                {channelCol1.map((row) => renderMatrixRow(row, "#8b5cf6"))}
              </div>
              <div className="groups-matrix-col__list">
                {channelCol2.map((row) => renderMatrixRow(row, "#8b5cf6"))}
              </div>
            </div>
          </div>

          <div className="groups-matrix-col">
            <div className="groups-matrix-col__header">
              <span className="groups-matrix-col__title">Aux / Busses</span>
            </div>
            <div className="groups-matrix-col__list">
              {auxRows.map((row) => renderMatrixRow(row, "#f6d83b"))}
            </div>
          </div>

          <div className="groups-matrix-col">
            <div className="groups-matrix-col__header">
              <span className="groups-matrix-col__title">FX Returns</span>
            </div>
            <div className="groups-matrix-col__list">
              {fxRows.map((row) => renderMatrixRow(row, "#a855f7"))}
            </div>
          </div>

          <div className="groups-matrix-col">
            <div className="groups-matrix-col__header">
              <span className="groups-matrix-col__title">Master</span>
            </div>
            <div className="groups-matrix-col__list">
              {masterRows.map((row) => renderMatrixRow(row, "#ef4444"))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
