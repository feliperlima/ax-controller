import { useState, type CSSProperties } from "react";
import { useRawParamSelector } from "../hooks/useRawParamSelector";
import type { UniversalRawParamStore } from "../lib/universalRawParamStore";
import type { DomainSelectors } from "../lib/domainSelectors";
import type { GroupMember } from "../protocol/duonn/bitmask";
import type { DcaGroupId } from "../protocol/duonn/groups";
import {
  AUX_IDS,
  buildAssignableMemberIds,
  buildVisibleDcaMemberIds,
  CHANNEL_IDS_MAX,
  DCA_DEFAULT_COLOR_IDS,
  FX_IDS,
  dcaAccentColorFromId,
  getAuxCountForChannelCount,
  getFxCountForChannelCount,
  isMemberSelectable,

  type AssignableMemberId,
  type DcaGroupState,
} from "../lib/groupControls";
import { stripColorForScope } from "./stripColor";

type MatrixRow = {
  id: AssignableMemberId;
  tag: string;
  name: string;
  colorId?: number;
  disabled?: boolean;
};

type DcaGroupsViewProps = {
  isConnected: boolean;
  channelCount?: number;
  groups: DcaGroupState[];
  onToggleEnabled: (id: DcaGroupId) => void;
  onMembersChange: (id: DcaGroupId, members: GroupMember[]) => void;
  onClear: (id: DcaGroupId) => void;
  channelNames?: string[];
  channelColorIds?: number[];
  auxNames?: string[];
  auxColorIds?: number[];
  fxNames?: string[];
  fxColorIds?: number[];
  masterColorIds?: [number, number];
  dcaNames?: string[];
  dcaColorIds?: number[];
  digiName?: string;
  digiColorId?: number;
  rawParamStore?: UniversalRawParamStore;
  domainSelectors?: DomainSelectors;
};

function rowBadgeColorFromId(row: MatrixRow): string {
  if (row.id === "DIGI") return stripColorForScope(row.colorId, "channel");
  if (row.id.startsWith("AUX_")) return stripColorForScope(row.colorId, "aux");
  if (row.id.startsWith("FX_")) return stripColorForScope(row.colorId, "fx");
  if (row.id.startsWith("MASTER_")) return stripColorForScope(row.colorId, "master");
  return stripColorForScope(row.colorId, "channel");
}

export function DcaGroupsView({
  isConnected,
  channelCount = 16,
  groups,
  onToggleEnabled,
  onMembersChange,
  onClear,
  channelNames,
  channelColorIds,
  auxNames,
  auxColorIds,
  fxNames,
  fxColorIds,
  masterColorIds,
  dcaNames,
  dcaColorIds,
  digiName,
  digiColorId,
  rawParamStore,
  domainSelectors,
}: DcaGroupsViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<DcaGroupId>(1);
  const storeDcaGroup = useRawParamSelector(
    rawParamStore ?? null,
    (store) => { void store; return domainSelectors?.selectDcaGroup(selectedGroup) ?? null; },
    (prev, next) => prev?.onOff?.value === next?.onOff?.value
  );
  const availableGroupIds = groups.map((_, index) => (index + 1) as DcaGroupId);
  const channelIds = CHANNEL_IDS_MAX.slice(0, Math.max(1, Math.min(CHANNEL_IDS_MAX.length, channelCount))) as GroupMember[];
  const auxIds = AUX_IDS.slice(0, getAuxCountForChannelCount(channelCount));
  const fxIds = FX_IDS.slice(0, getFxCountForChannelCount(channelCount));
  const assignableMemberIds = buildAssignableMemberIds(channelCount);
  const visibleMemberIds = buildVisibleDcaMemberIds(channelCount, false);

  function getDcaName(id: DcaGroupId): string {
    const customName = dcaNames?.[id - 1]?.trim();
    if (!customName || customName.length === 0) return `DCA Group ${id}`;
    if (/^DCA\s*\d+$/i.test(customName) || /^GROUP\s*\d+$/i.test(customName)) {
      return `DCA Group ${id}`;
    }
    return customName;
  }

  function getDcaColorId(id: DcaGroupId): number {
    const storedColorId = dcaColorIds?.[id - 1];
    if (typeof storedColorId === "number" && Number.isFinite(storedColorId)) {
      return Math.max(0, Math.min(12, Math.round(storedColorId)));
    }
    return DCA_DEFAULT_COLOR_IDS[id];
  }

  const selectedGroupState = groups[selectedGroup - 1] ?? {
    enabled: true,
    faderPosition: 90,
    members: [],
  };
  const activeDcaEnabled =
    storeDcaGroup?.onOff != null
      ? storeDcaGroup.onOff.value > 0
      : selectedGroupState.enabled;
  const selectedAssignableMembers = visibleMemberIds.filter((member) => selectedGroupState.members.includes(member));
  const selectedSet = new Set(selectedAssignableMembers);
  const selectedNonAssignableMembers = selectedGroupState.members.filter(
    (member) => !visibleMemberIds.includes(member as AssignableMemberId)
  );

  const matrixRows: MatrixRow[] = [
    ...channelIds.map((id, index) => ({
      id,
      tag: `CH ${index + 1}`,
      name: channelNames?.[index]?.trim() || `CH ${index + 1}`,
      colorId: channelColorIds?.[index],
      disabled: !isMemberSelectable(id),
    })),
    {
      id: "DIGI" as AssignableMemberId,
      tag: "DIGI",
      name: digiName?.trim() || "DIGI",
      colorId: digiColorId,
      disabled: false,
    },
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
      disabled: true,
    },
    {
      id: "MASTER_R",
      tag: "MASTER",
      name: "Right",
      colorId: masterColorIds?.[1] ?? 0,
      disabled: true,
    },
  ];

  const visibleRows = matrixRows.filter((row) => visibleMemberIds.includes(row.id as AssignableMemberId));
  const selectableVisibleMemberIds = visibleMemberIds.filter((member) => isMemberSelectable(member));
  const channelRows = visibleRows.filter((row) => row.id.startsWith("CH_"));
  const channelSplit = Math.ceil(channelRows.length / 2);
  const channelCol1 = channelRows.slice(0, channelSplit);
  const channelCol2 = channelRows.slice(channelSplit);
  const digiRows = visibleRows.filter((row) => row.id === "DIGI");
  const auxRows = visibleRows.filter((row) => row.id.startsWith("AUX_"));
  const fxRows = visibleRows.filter((row) => row.id.startsWith("FX_"));
  const masterRows = matrixRows.filter((row) => row.id.startsWith("MASTER_"));

  function handleToggleAssignableMember(id: DcaGroupId, memberId: AssignableMemberId) {
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
    const selected = selectedSet.has(row.id as AssignableMemberId);
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

  const accent = dcaAccentColorFromId(getDcaColorId(selectedGroup));

  return (
    <div
      className="groups-structured-view"
      style={{ "--tab-underline-color": "var(--branch-duonn-cyan)" } as CSSProperties}
    >
      <div className="groups-structured-tabs" role="tablist" aria-label="DCA groups">
        {availableGroupIds.map((id) => (
          <button
            key={id}
            id={`dca-group-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={selectedGroup === id}
            disabled={!isConnected}
            onClick={() => setSelectedGroup(id)}
            className={`groups-structured-tab ${selectedGroup === id ? "groups-structured-tab--active" : ""}`}
          >
            {getDcaName(id)}
          </button>
        ))}
      </div>

      <section
        className="groups-structured-panel"
        id={`dca-group-panel-${selectedGroup}`}
        role="tabpanel"
        aria-labelledby={`dca-group-tab-${selectedGroup}`}
      >
        <div className="groups-view__matrix-header">
          <span className="groups-view__matrix-title">{getDcaName(selectedGroup)}</span>
          <div className="groups-view__matrix-actions groups-view__matrix-actions--outline">
            <button
              type="button"
              className="groups-view__action-btn"
              disabled={!isConnected}
              onClick={() => onMembersChange(selectedGroup, [...selectedNonAssignableMembers, ...selectableVisibleMemberIds])}
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
              className={`dca-toggle groups-view__toggle-btn ${activeDcaEnabled ? "dca-toggle--on" : "dca-toggle--off"}`}
              disabled={!isConnected}
              onClick={() => onToggleEnabled(selectedGroup)}
            >
              ON
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
                {channelCol1.map((row) => renderMatrixRow(row, accent))}
              </div>
              <div className="groups-matrix-col__list">
                {channelCol2.map((row) => renderMatrixRow(row, accent))}
                {digiRows.map((row) => renderMatrixRow(row, accent))}
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
