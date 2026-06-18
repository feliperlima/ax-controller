import { Axios16Client, type AxiosCommand } from "../lib/axios16Client";

/**
 * Adapter for demo mode. All network operations are no-ops.
 * The AX32 protocol profile is activated so parameter addressing works
 * correctly for 32-channel UI rendering. Interactive controls update React
 * state normally because the App.tsx command functions call updateChannelState
 * after the client call, and the non-null client passes the `!client` guard.
 */
export class DemoMixerAdapter extends Axios16Client {
  constructor() {
    super("demo.local", 8088, "ax32", { channelCount: 32 });
  }

  // biome-ignore lint/suspicious/useAwait: override must match async signature
  override async connect(): Promise<void> {}

  override disconnect(): void {}

  override sendParam(_param: number, _value: number): void {}

  override readParams(_params: number[], _timeoutMs?: number): Promise<AxiosCommand[]> {
    return Promise.resolve([]);
  }

  override sendRaw(_bytes: Uint8Array): void {}
}
