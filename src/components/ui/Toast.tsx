"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

interface ToastOptions {
  action?: string;
  onAction?: () => void;
  paw?: boolean;
  /** sobre la barra de acciones del detalle en vez de sobre la tab bar */
  raised?: boolean;
}
interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

const ToastContext = createContext<(message: string, opts?: ToastOptions) => void>(() => {});
export const useToast = () => useContext(ToastContext);

/** Un toast a la vez, 5 s, con "Deshacer" opcional y la patita de Lukas. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const show = useCallback((message: string, opts: ToastOptions = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: ++seq.current, message, ...opts });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={["toasts", toast?.raised ? "on-detail" : ""].join(" ")} aria-live="polite">
        {toast && (
          <div className="toast" role="status" key={toast.id}>
            {toast.paw && <Icon name="paw" className="toast__paw" />}
            <span className="toast__msg">{toast.message}</span>
            {toast.action && (
              <button
                className="toast__action"
                onClick={() => {
                  setToast(null);
                  toast.onAction?.();
                }}
              >
                {toast.action}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
