import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

type ToastItem = { id: number; title: string | null; message: string };

let _nextId = 0;
let _toasts: ToastItem[] = [];
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

export function showToast(message: string, title?: string) {
  const id = ++_nextId;
  _toasts = [..._toasts.slice(-2), { id, title: title ?? null, message }];
  notify();
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id);
    notify();
  }, 7000);
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ToastList({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return createPortal(
    <div className="ax-toast-container" role="region" aria-live="polite" aria-label="Notificações">
      {toasts.map((t) => (
        <div key={t.id} className="ax-toast">
          <div className="ax-toast__icon"><BellIcon /></div>
          <div className="ax-toast__content">
            {t.title && <span className="ax-toast__title">{t.title}</span>}
            <span className="ax-toast__body">{t.message}</span>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}

export function ToastRenderer() {
  const [toasts, setToasts] = useState<ToastItem[]>(_toasts);

  useEffect(() => {
    const update = () => setToasts([..._toasts]);
    _listeners.add(update);
    return () => { _listeners.delete(update); };
  }, []);

  return <ToastList toasts={toasts} />;
}
