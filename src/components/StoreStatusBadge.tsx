"use client";

import { useStorefront } from "@/components/StorefrontProvider";

/** Bolinha verde/vermelha com o estado da loja. */
export function StoreStatusBadge({ className = "" }: { className?: string }) {
  const { status, settings } = useStorefront();
  const paused = status.isOpen && !settings.ordersEnabled;

  const tone = paused
    ? { dot: "bg-warning", text: "text-warning", label: "Pedidos pausados" }
    : status.isOpen
      ? { dot: "bg-success", text: "text-success", label: "Aberto agora" }
      : { dot: "bg-danger", text: "text-muted", label: "Fechado" };

  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-medium ${tone.text} ${className}`}
    >
      <span className="relative flex size-2">
        {status.isOpen && !paused && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
        )}
        <span className={`relative inline-flex size-2 rounded-full ${tone.dot}`} />
      </span>
      {tone.label}
      {!status.isOpen && status.nextOpen && (
        <span className="hidden text-faint sm:inline">· {status.nextOpen.label}</span>
      )}
    </span>
  );
}
