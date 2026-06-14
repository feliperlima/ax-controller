import { useState } from "react";
import {
  CLIPBOARD_STORAGE_KEY,
  deserializeClipboard,
  serializeClipboard,
  type MixerClipboardSnapshot,
} from "../lib/mixerClipboard";

function loadFromStorage(): MixerClipboardSnapshot | null {
  try {
    const raw = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
    return raw ? deserializeClipboard(raw) : null;
  } catch {
    return null;
  }
}

export function useMixerClipboard() {
  const [snapshot, setSnapshot] = useState<MixerClipboardSnapshot | null>(loadFromStorage);

  function saveSnapshot(s: MixerClipboardSnapshot) {
    setSnapshot(s);
    try {
      localStorage.setItem(CLIPBOARD_STORAGE_KEY, serializeClipboard(s));
    } catch { /* storage unavailable */ }
  }

  return { snapshot, saveSnapshot };
}
