"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { pushToast, type Toast } from "@/lib/toast";

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}
const ToastContext = createContext<ToastApi>({ success: () => {}, error: () => {} });
export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const add = useCallback((message: string, kind: "success" | "error") => {
    setToasts(prev => {
      const next = pushToast(prev, message, kind);
      // schedule dismissal for any newly added toast
      for (const toast of next) {
        if (!timers.current.has(toast.id)) {
          timers.current.set(toast.id, setTimeout(() => dismiss(toast.id), 3000));
        }
      }
      return next;
    });
  }, [dismiss]);

  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach(t => clearTimeout(t)); map.clear(); };
  }, []);

  const api: ToastApi = {
    success: useCallback((m: string) => add(m, "success"), [add]),
    error: useCallback((m: string) => add(m, "error"), [add]),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} role="status"
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg elevated ${
              toast.kind === "success" ? "border-primary/40 bg-card text-foreground" : "border-destructive/40 bg-card text-destructive"
            }`}>
            {toast.kind === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} aria-label="Đóng thông báo"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
