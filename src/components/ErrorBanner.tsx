"use client";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorBanner({ message, onRetry, retrying = false }: {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
      <span className="flex-1 text-sm text-foreground">{message}</span>
      <button onClick={onRetry} disabled={retrying}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-destructive/40 bg-card px-4 text-sm font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50">
        <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} /> Thử lại
      </button>
    </div>
  );
}
