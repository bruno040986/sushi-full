"use client";

import { MapPin, Navigation, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export type RouteLinks = {
  googleMapsUrl: string | null;
  wazeUrl: string | null;
  address: string;
};

/**
 * Botão "Como chegar" + janela sobreposta com os apps de navegação.
 *
 * Só aparecem os apps cadastrados no painel. Se nenhum estiver cadastrado, o
 * botão inteiro some — melhor não ter botão do que ter um que não leva a lugar
 * nenhum.
 */
export function HowToGetThereButton({
  links,
  className,
  children,
}: {
  links: RouteLinks;
  className: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasAnyApp = Boolean(links.googleMapsUrl || links.wazeUrl);

  if (!hasAnyApp) return null;

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className}>
        {children}
      </button>
      {isOpen && <RouteDialog links={links} onClose={() => setIsOpen(false)} />}
    </>
  );
}

function RouteDialog({ links, onClose }: { links: RouteLinks; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const apps = [
    {
      href: links.googleMapsUrl,
      label: "Google Maps",
      hint: "Abrir rota no Google Maps",
      Icon: MapPin,
    },
    { href: links.wazeUrl, label: "Waze", hint: "Abrir rota no Waze", Icon: Navigation },
  ].filter((app): app is { href: string; label: string; hint: string; Icon: typeof MapPin } =>
    Boolean(app.href),
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Como chegar"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-black">Como chegar</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-2 rounded-full p-2 text-muted transition hover:bg-surface-2 hover:text-cream"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-muted">{links.address}</p>

        <div className="space-y-3">
          {apps.map(({ href, label, hint, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3.5 transition hover:border-brand hover:bg-surface-3"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-bold">{label}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
