import type { ComponentType, SVGProps } from "react";

/**
 * Aceita tanto os ícones da lucide (ForwardRefExoticComponent) quanto os
 * componentes simples deste arquivo — use este tipo ao guardar ícones em
 * arrays de configuração.
 */
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Ícones de marca em SVG próprio.
 *
 * A lucide-react v1 removeu os ícones de marca (Instagram, Facebook, TikTok),
 * então desenhamos os que precisamos. Mesma API dos ícones lucide: herdam
 * `currentColor` e aceitam className.
 */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function Instagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden={props["aria-hidden"] ?? true}>
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Facebook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden={props["aria-hidden"] ?? true}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function TikTok(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden={props["aria-hidden"] ?? true}>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

/** Talher cruzado — usado como marca genérica de delivery/iFood. */
export function Delivery(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden={props["aria-hidden"] ?? true}>
      <path d="M12 3c-4 0-6 3-6 7 0 5 3 11 6 11s6-6 6-11c0-4-2-7-6-7Z" />
      <path d="M12 3v18" />
    </svg>
  );
}
