import {
  type DcaGroupId,
  type DuonnParamWriteMessage,
  type MuteGroupId,
  buildAllMutedMuteGroupMessages,
  buildClearDcaMembersMessages,
  buildClearMuteGroupMembersMessages,
  buildSetDcaEnabledMessages,
  buildSetDcaFaderMessage,
  buildSetDcaMembersMessages,
  buildSetMuteGroupActiveMessages,
  buildSetMuteGroupMembersMessages,
} from "../../protocol/duonn/groups";
import { type GroupMember } from "../../protocol/duonn/bitmask";

export type DuonnParamSender = (param: number, value: number) => void | Promise<void>;

export class DuonnGroupsService {
  constructor(private readonly sendParam: DuonnParamSender) {}

  async setDcaEnabled(id: DcaGroupId, enabled: boolean) {
    await this.sendMessages(buildSetDcaEnabledMessages(id, enabled));
  }

  async setDcaFader(id: DcaGroupId, value: number) {
    await this.sendMessages([buildSetDcaFaderMessage(id, value)]);
  }

  async setDcaMembers(id: DcaGroupId, members: GroupMember[]) {
    await this.sendMessages(buildSetDcaMembersMessages(id, members));
  }

  async clearDcaMembers(id: DcaGroupId) {
    await this.sendMessages(buildClearDcaMembersMessages(id));
  }

  async setMuteGroupActive(id: MuteGroupId, active: boolean) {
    await this.sendMessages(buildSetMuteGroupActiveMessages(id, active));
  }

  async setMuteGroupMembers(id: MuteGroupId, members: GroupMember[]) {
    await this.sendMessages(buildSetMuteGroupMembersMessages(id, members));
  }

  async clearMuteGroupMembers(id: MuteGroupId) {
    await this.sendMessages(buildClearMuteGroupMembersMessages(id));
  }

  async allMutedMuteGroup(id: MuteGroupId, options?: { allowDerived?: boolean }) {
    await this.sendMessages(buildAllMutedMuteGroupMessages(id, options));
  }

  private async sendMessages(messages: DuonnParamWriteMessage[]) {
    for (const message of messages) {
      // TODO(protocol): surface derived/provisional writes in future UI confirmation dialog before sending.
      await this.sendParam(message.param, message.value);
    }
  }
}
