"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "sushifull-cookies";

/**
 * Só depois da hidratação dá para ler o localStorage. `getServerSnapshot`
 * devolve false no SSR, o que mantém o HTML dos dois lados igual.
 */
const subscribeNever = () => () => {};

/**
 * Aviso de cookies.
 *
 * Só aparece quando há alguma ferramenta de analytics ativa — sem GTM, GA4 ou
 * Pixel cadastrados o site não grava cookie de terceiro e o aviso seria ruído.
 */
export function CookieNotice({ enabled }: { enabled: boolean }) {
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);

  const alreadyAccepted = hydrated && localStorage.getItem(STORAGE_KEY) === "ok";
  if (!enabled || !hydrated || alreadyAccepted || dismissed) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "ok");
    setDismissed(true);
  }

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-line bg-surface/95 p-4 shadow-2xl backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 text-sm leading-relaxed text-muted">
          Usamos cookies de medição para entender como o site é usado e melhorar o atendimento.
          Veja a{" "}
          <Link href="/politica-de-privacidade" className="text-brand underline">
            política de privacidade
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-strong"
        >
          Entendi
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar aviso"
          className="shrink-0 rounded-lg p-1.5 text-faint transition hover:text-cream"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
