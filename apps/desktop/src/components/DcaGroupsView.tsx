import { useState, useCallback, useEffect, useRef } from "react";
import type { Axios16Client } from "../lib/axios16Client";
import { GROUP_MEMBER_BITS, decodeGroupMembers, type GroupMember } from "../protocol/duonn/bitmask";
import type { DcaGroupId } from "../protocol/duonn/groups";
import {
  buildClearDcaMembersMessages,
  getDcaFaderParam,
  getDcaMemberParams,
  getDcaOnOffParam,
  buildSetDcaEnabledMessages,
  buildSetDcaFaderMessage,
  buildSetDcaMembersMessages,
} from "../protocol/duonn/groups";
import { VerticalFader } from "./VerticalFader";

type DcaGroupState = {
  enabled: boolean;
  faderPosition: number; // 0-100 UI position (linear → 0-1300 protocol)
  members: GroupMember[];
};

const DCA_IDS: DcaGroupId[] = [1, 2, 3, 4];

const DCA_ACCENT_COLORS: Record<DcaGroupId, string> = {
  1: "var(--channel-07, #a514e8)",
  2: "var(--channel-10, #f95361)",
  3: "#7b7b7b",
  4: "var(--channel-08, #ebd93a)",
};

const DCA_FADER_INDICATOR_COLOR = "var(--channel-10, #21A7E8)";
const DCA_FOOTER_FIXED_COLOR = "#7b7b7b";

const CHANNEL_IDS = [
  "CH_1", "CH_2", "CH_3", "CH_4", "CH_5", "CH_6", "CH_7", "CH_8",
  "CH_9", "CH_10", "CH_11", "CH_12", "CH_13", "CH_14", "CH_15", "CH_16",
] as const;

const AUX_IDS = [
  "AUX_1", "AUX_2", "AUX_3", "AUX_4", "AUX_5", "AUX_6", "AUX_7", "AUX_8",
] as const;

const FX_IDS = ["FX_1", "FX_2"] as const;

const MASTER_IDS = ["MASTER_L", "MASTER_R"] as const;

const INCLUDE_MASTER_ROWS_IN_DCA = false;

const ASSIGNABLE_MEMBER_IDS = [...CHANNEL_IDS, ...AUX_IDS, ...FX_IDS, ...MASTER_IDS] as const;
const DCA_VISIBLE_MEMBER_IDS = (
  INCLUDE_MASTER_ROWS_IN_DCA
    ? [...CHANNEL_IDS, ...AUX_IDS, ...FX_IDS, ...MASTER_IDS]
    : [...CHANNEL_IDS, ...AUX_IDS, ...FX_IDS]
);

type AssignableMemberId = (typeof ASSIGNABLE_MEMBER_IDS)[number];

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

const DCA_FADER_DB_POINTS = [
  { pos: 0, db: -120 },
  { pos: 10, db: -50 },
  { pos: 25, db: -30 },
  { pos: 45, db: -20 },
  { pos: 65, db: -10 },
  { pos: 80, db: -5 },
  { pos: 90, db: 0 },
  { pos: 95, db: 5 },
  { pos: 100, db: 10 },
];

const DCA_FADER_SNAP_POINTS_DB = [-50, -40, -30, -20, -10, -5, 0, 5, 10];
const DCA_FADER_SNAP_POINTS = DCA_FADER_SNAP_POINTS_DB.map((db) => dcaDbToPosition(db));
const DCA_FADER_MARKS_DB = [-50, -40, -30, -20, -10, -5, 0];
const DCA_FADER_THUMB_HEIGHT = 50;
const DCA_FADER_THUMB_HALF = DCA_FADER_THUMB_HEIGHT / 2;
const DCA_FADER_TRACK_WIDTH = 23;

function dcaDbToPosition(db: number) {
  for (let i = 0; i < DCA_FADER_DB_POINTS.length - 1; i++) {
    const current = DCA_FADER_DB_POINTS[i];
    const next = DCA_FADER_DB_POINTS[i + 1];

    if (db >= current.db && db <= next.db) {
      const t = (db - current.db) / (next.db - current.db);
      return current.pos + t * (next.pos - current.pos);
    }
  }

  return db <= -120 ? 0 : 100;
}

function dcaPositionToDb(position: number) {
  const clamped = Math.max(0, Math.min(100, position));

  for (let i = 0; i < DCA_FADER_DB_POINTS.length - 1; i++) {
    const current = DCA_FADER_DB_POINTS[i];
    const next = DCA_FADER_DB_POINTS[i + 1];

    if (clamped >= current.pos && clamped <= next.pos) {
      const t = (clamped - current.pos) / (next.pos - current.pos);
      return current.db + t * (next.db - current.db);
    }
  }

  return clamped <= 0 ? -120 : 10;
}

function dcaValueToDb(value: number) {
  if (value <= 0) return -120;
  return Math.max(-120, Math.min(10, (Math.round(value) - 1200) / 10));
}

function dcaDbToValue(db: number) {
  const clamped = Math.max(-120, Math.min(10, db));
  if (clamped <= -120) return 0;
  return Math.round(1200 + clamped * 10);
}

function dcaPositionToValue(position: number): number {
  return dcaDbToValue(dcaPositionToDb(position));
}

function dcaValueToPosition(value: number): number {
  return dcaDbToPosition(dcaValueToDb(value));
}

function dcaFaderLabel(db: number): string {
  if (db <= -119.95) return "-∞";
  const formatted = db >= 0 ? `+${db.toFixed(1)}` : db.toFixed(1);
  return `${formatted} dB`;
}

function dcaMarkTop(db: number) {
  const pos = dcaDbToPosition(db);
  return `calc(${DCA_FADER_THUMB_HALF}px + ${(100 - pos) / 100} * (100% - ${DCA_FADER_THUMB_HEIGHT}px))`;
}

function createInitialDcaState(): DcaGroupState[] {
  return DCA_IDS.map(() => ({
    enabled: true,
    faderPosition: dcaDbToPosition(0),
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
  channelColorIds?: number[];
  auxNames?: string[];
  auxColorIds?: number[];
  fxNames?: string[];
  fxColorIds?: number[];
  masterColorIds?: [number, number];
  dcaNames?: string[];
};

export function DcaGroupsView({
  client,
  isConnected,
  channelNames,
  channelColorIds,
  auxNames,
  auxColorIds,
  fxNames,
  fxColorIds,
  masterColorIds,
  dcaNames,
}: DcaGroupsViewProps) {
  const [groups, setGroups] = useState<DcaGroupState[]>(createInitialDcaState);
  const [selectedGroup, setSelectedGroup] = useState<DcaGroupId>(1);
  const matrixColumnsRef = useRef<HTMLDivElement | null>(null);

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

    const syncEnabledStates = async () => {
      try {
        const params = DCA_IDS.flatMap((id) => [
          getDcaOnOffParam(id),
          getDcaFaderParam(id),
          ...getDcaMemberParams(id),
        ]);
        const response = await client.readParams(params, 1000);
        const values = new Map(response.map((item) => [item.param, item.value]));

        if (disposed) return;

        setGroups((current) =>
          current.map((group, index) => {
            const id = DCA_IDS[index];
            const raw = values.get(getDcaOnOffParam(id));
            const rawFader = values.get(getDcaFaderParam(id));
            const memberParams = getDcaMemberParams(id);
            const words = memberParams.map((param) => values.get(param));
            const nextMembers = words.every((word) => word !== undefined)
              ? decodeGroupMembers(words as [number, number, number, number]).filter(
                  (member): member is AssignableMemberId => ASSIGNABLE_MEMBER_IDS.includes(member as AssignableMemberId)
                )
              : group.members;
            const nextFaderPosition = rawFader === undefined ? group.faderPosition : dcaValueToPosition(rawFader);
            if (raw === undefined) {
              return {
                ...group,
                faderPosition: nextFaderPosition,
                members: nextMembers,
              };
            }
            return {
              ...group,
              enabled: raw > 0,
              faderPosition: nextFaderPosition,
              members: nextMembers,
            };
          })
        );
      } catch {
        // Ignore transient read failures.
      }
    };

    syncEnabledStates();
    const timer = window.setInterval(syncEnabledStates, 1500);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [client, isConnected]);

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

  function handleToggleAssignableMember(id: DcaGroupId, memberId: AssignableMemberId) {
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

  function getDcaName(id: DcaGroupId): string {
    const customName = dcaNames?.[id - 1]?.trim();
    if (!customName || customName.length === 0) return `Group ${id}`;
    if (/^DCA\s*\d+$/i.test(customName) || /^GROUP\s*\d+$/i.test(customName)) {
      return `Group ${id}`;
    }
    return customName;
  }

  const selectedGroupState = groups[selectedGroup - 1];
  const selectedAssignableMembers = DCA_VISIBLE_MEMBER_IDS.filter((member) => selectedGroupState.members.includes(member));
  const selectedSet = new Set(selectedAssignableMembers);
  const selectedNonAssignableMembers = selectedGroupState.members.filter(
    (member) => !DCA_VISIBLE_MEMBER_IDS.includes(member as (typeof DCA_VISIBLE_MEMBER_IDS)[number])
  );
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
  const visibleRows = matrixRows.filter((row) => DCA_VISIBLE_MEMBER_IDS.includes(row.id as (typeof DCA_VISIBLE_MEMBER_IDS)[number]));
  const selectableVisibleMemberIds = DCA_VISIBLE_MEMBER_IDS.filter((member) => isMemberSelectable(member as AssignableMemberId));
  const channelRows = visibleRows.filter((row) => row.id.startsWith("CH_"));
  const outputRows = visibleRows.filter((row) => row.id.startsWith("AUX_") || row.id.startsWith("FX_") || row.id.startsWith("MASTER_"));

  function renderMatrixRow(row: MatrixRow) {
    const selected = selectedSet.has(row.id as (typeof DCA_VISIBLE_MEMBER_IDS)[number]);
    const isDisabled = !isConnected || Boolean(row.disabled);

    return (
      <button
        key={row.id}
        type="button"
        className={`dca-matrix-row ${selected ? "dca-matrix-row--selected" : ""}`}
        disabled={isDisabled}
        onClick={() => {
          if (row.disabled) return;
          if (!DCA_VISIBLE_MEMBER_IDS.includes(row.id as (typeof DCA_VISIBLE_MEMBER_IDS)[number])) return;
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
    <div className="groups-view dca-groups-view">
      <div className="groups-view__left dca-groups-view__left">
        <div className="dca-groups-list">
          {DCA_IDS.map((id) => {
            const state = groups[id - 1];
            const accentColor = DCA_ACCENT_COLORS[id];
            const faderDb = dcaPositionToDb(state.faderPosition);
            const isSelected = selectedGroup === id;

            return (
              <div
                key={id}
                className={`dca-group-card ${isSelected ? "dca-group-card--selected" : ""} ${!isConnected ? "dca-group-card--offline" : ""}`}
                style={{ "--dca-accent": accentColor } as React.CSSProperties}
                onClick={() => setSelectedGroup(id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedGroup(id);
                  }
                }}
              >
                <button
                  type="button"
                  className={`dca-toggle dca-group-card__on ${state.enabled ? "dca-toggle--on" : "dca-toggle--off"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleEnabled(id);
                  }}
                  disabled={!isConnected}
                  title={state.enabled ? "Desativar DCA" : "Ativar DCA"}
                >
                  {state.enabled ? "ON" : "OFF"}
                </button>

                <div className="dca-group-card__fader-wrap">
                  <div className="dca-group-card__fader-track">
                    <div className="dca-group-card__fader-scale" aria-hidden="true">
                      {DCA_FADER_MARKS_DB.map((db) => (
                        <div
                          key={`${id}-${db}`}
                          className="dca-group-card__fader-mark"
                          style={{ top: dcaMarkTop(db) }}
                        >
                          <span
                            className={`dca-group-card__fader-mark-line dca-group-card__fader-mark-line--left ${db === 0 ? "dca-group-card__fader-mark-line--zero" : ""}`}
                          />
                          <span
                            className={`dca-group-card__fader-mark-line dca-group-card__fader-mark-line--right ${db === 0 ? "dca-group-card__fader-mark-line--zero" : ""}`}
                          />
                        </div>
                      ))}
                    </div>
                    <VerticalFader
                      value={state.faderPosition}
                      height="100%"
                      width={DCA_FADER_TRACK_WIDTH}
                      disabled={!isConnected || !state.enabled}
                      snapPoints={DCA_FADER_SNAP_POINTS}
                      snapThreshold={2}
                      zeroMarkerValue={dcaDbToPosition(0)}
                      dragFromThumbOnly
                      thumbIndicatorColor={DCA_FADER_INDICATOR_COLOR}
                      onChange={(pos) => handleFaderChange(id, pos)}
                    />
                  </div>
                </div>

                <span className="dca-group-card__fader-db">{dcaFaderLabel(faderDb)}</span>

                <div
                  className="dca-group-card__footer"
                  style={{ backgroundColor: DCA_FOOTER_FIXED_COLOR }}
                >
                  <span className="dca-group-card__footer-id">DCA {id}</span>
                  <span className="dca-group-card__footer-name">{getDcaName(id)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="groups-view__right dca-groups-view__right">
        <div className="dca-groups-view__matrix-headbar">
          <div className="groups-view__matrix-header">
            <span className="groups-view__matrix-title">
              DCA {selectedGroup} - {getDcaName(selectedGroup)}
            </span>
            <div className="groups-view__matrix-actions">
              <button
                type="button"
                className="groups-view__action-btn"
                disabled={!isConnected}
                onClick={() => {
                  handleMembersChange(selectedGroup, [...selectedNonAssignableMembers, ...selectableVisibleMemberIds]);
                }}
              >
                SELECT ALL
              </button>
              <button
                type="button"
                className="groups-view__action-btn groups-view__action-btn--danger"
                disabled={!isConnected}
                onClick={() => handleClear(selectedGroup)}
              >
                CLEAR ALL
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
      </div>
    </div>
  );
}
