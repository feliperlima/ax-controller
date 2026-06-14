import { useState, useCallback } from "react";

type ToastItem = { id: number; message: string };

let _nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string) => {
    const id = ++_nextId;
    setToasts((prev) => [...prev.slice(-2), { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  }, []);

  function ToastRenderer() {
    return (
      <div className="floating-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="floating-toast">
            {t.message}
          </div>
        ))}
      </div>
    );
  }

  return { showToast, ToastRenderer };
}
