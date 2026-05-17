export type GroupMember =
  | "CH_1"
  | "CH_2"
  | "CH_3"
  | "CH_4"
  | "CH_5"
  | "CH_6"
  | "CH_7"
  | "CH_8"
  | "CH_9"
  | "CH_10"
  | "CH_11"
  | "CH_12"
  | "CH_13"
  | "CH_14"
  | "CH_15"
  | "CH_16"
  | "FX_1"
  | "FX_2"
  | "AUX_1"
  | "AUX_2"
  | "AUX_3"
  | "AUX_4"
  | "AUX_5"
  | "AUX_6"
  | "AUX_7"
  | "AUX_8"
  | "MASTER_L"
  | "MASTER_R";

export type GroupMemberBit = {
  wordIndex: 0 | 1 | 2 | 3;
  bit: number;
  value: number;
  isConfirmed: boolean;
  note?: string;
};

export const GROUP_MEMBER_BITS: Readonly<Record<GroupMember, GroupMemberBit | null>> = {
  CH_1: { wordIndex: 0, bit: 0, value: 1, isConfirmed: true },
  CH_2: { wordIndex: 0, bit: 1, value: 2, isConfirmed: true },
  CH_3: { wordIndex: 0, bit: 2, value: 4, isConfirmed: true },
  CH_4: { wordIndex: 0, bit: 3, value: 8, isConfirmed: true },
  CH_5: { wordIndex: 0, bit: 4, value: 16, isConfirmed: true },
  CH_6: { wordIndex: 0, bit: 5, value: 32, isConfirmed: true },
  CH_7: { wordIndex: 0, bit: 6, value: 64, isConfirmed: true },
  CH_8: { wordIndex: 0, bit: 7, value: 128, isConfirmed: true },
  CH_9: { wordIndex: 0, bit: 8, value: 256, isConfirmed: true },
  CH_10: { wordIndex: 0, bit: 9, value: 512, isConfirmed: true },
  CH_11: { wordIndex: 0, bit: 10, value: 1024, isConfirmed: true },
  CH_12: { wordIndex: 0, bit: 11, value: 2048, isConfirmed: true },
  CH_13: { wordIndex: 0, bit: 12, value: 4096, isConfirmed: true },
  CH_14: { wordIndex: 0, bit: 13, value: 8192, isConfirmed: true },
  CH_15: { wordIndex: 0, bit: 14, value: 16384, isConfirmed: true },
  CH_16: { wordIndex: 0, bit: 15, value: 32768, isConfirmed: true },
  FX_1: { wordIndex: 1, bit: 10, value: 1024, isConfirmed: true },
  FX_2: { wordIndex: 1, bit: 11, value: 2048, isConfirmed: true },
  AUX_1: { wordIndex: 1, bit: 12, value: 4096, isConfirmed: true },
  AUX_2: {
    wordIndex: 1,
    bit: 13,
    value: 8192,
    isConfirmed: false,
    note: "Derived contiguous AUX bit pattern between confirmed AUX_1 and AUX_8. Validate on hardware.",
  },
  AUX_3: {
    wordIndex: 1,
    bit: 14,
    value: 16384,
    isConfirmed: false,
    note: "Derived contiguous AUX bit pattern between confirmed AUX_1 and AUX_8. Validate on hardware.",
  },
  AUX_4: {
    wordIndex: 1,
    bit: 15,
    value: 32768,
    isConfirmed: false,
    note: "Derived contiguous AUX bit pattern between confirmed AUX_1 and AUX_8. Validate on hardware.",
  },
  AUX_5: {
    wordIndex: 2,
    bit: 0,
    value: 1,
    isConfirmed: false,
    note: "Derived contiguous AUX bit pattern between confirmed AUX_1 and AUX_8. Validate on hardware.",
  },
  AUX_6: {
    wordIndex: 2,
    bit: 1,
    value: 2,
    isConfirmed: false,
    note: "Derived contiguous AUX bit pattern between confirmed AUX_1 and AUX_8. Validate on hardware.",
  },
  AUX_7: {
    wordIndex: 2,
    bit: 2,
    value: 4,
    isConfirmed: false,
    note: "Derived contiguous AUX bit pattern between confirmed AUX_1 and AUX_8. Validate on hardware.",
  },
  AUX_8: { wordIndex: 2, bit: 3, value: 8, isConfirmed: true },
  MASTER_L: {
    wordIndex: 2,
    bit: 4,
    value: 16,
    isConfirmed: false,
    note: "Provisional: bit value is confirmed in aggregate, side assignment L/R still needs hardware validation.",
  },
  MASTER_R: {
    wordIndex: 2,
    bit: 5,
    value: 32,
    isConfirmed: false,
    note: "Provisional: bit value is confirmed in aggregate, side assignment L/R still needs hardware validation.",
  },
};

export function setBit(wordValue: number, bit: number) {
  return (wordValue | (1 << bit)) >>> 0;
}

export function clearBit(wordValue: number, bit: number) {
  return (wordValue & ~(1 << bit)) >>> 0;
}

export function hasBit(wordValue: number, bit: number) {
  return ((wordValue >>> bit) & 1) === 1;
}

export function assertMappedGroupMember(member: GroupMember): asserts member is GroupMember {
  if (!GROUP_MEMBER_BITS[member]) {
    throw new Error(`Unmapped group member ${member}. TODO(protocol): add confirmed DUONN bit mapping before encoding.`);
  }
}

export function getMemberBit(member: GroupMember) {
  assertMappedGroupMember(member);
  return GROUP_MEMBER_BITS[member] as GroupMemberBit;
}

export function encodeGroupMembers(members: GroupMember[]): [number, number, number, number] {
  const words: [number, number, number, number] = [0, 0, 0, 0];

  for (const member of members) {
    const mapped = getMemberBit(member);
    words[mapped.wordIndex] = setBit(words[mapped.wordIndex], mapped.bit);
  }

  return words;
}

export function decodeGroupMembers(words: readonly [number, number, number, number]): GroupMember[] {
  const decoded: GroupMember[] = [];

  const entries = Object.entries(GROUP_MEMBER_BITS) as Array<[GroupMember, GroupMemberBit | null]>;

  for (const [member, mapped] of entries) {
    if (!mapped) continue;
    if (hasBit(words[mapped.wordIndex], mapped.bit)) {
      decoded.push(member);
    }
  }

  return decoded;
}
