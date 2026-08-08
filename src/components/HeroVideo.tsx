"use client";

import { useEffect, useRef } from "react";

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/**
 * Vídeo de fundo do hero.
 *
 * Renderiza sempre o <video> com o poster, mas SEM src. Um efeito decide se
 * vale a pena baixar os ~430 KB: em conexão lenta, com economia de dados ou
 * com "reduzir movimento" ligado, fica só o poster de 28 KB — visualmente
 * quase idêntico e sem custo.
 */
export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    const saveData = connection?.saveData === true;
    const slowNetwork = ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (saveData || slowNetwork || reducedMotion) return;

    // O React nem sempre reflete `muted` no DOM, e sem isso o iOS recusa o autoplay.
    video.muted = true;
    video.src = src;
    video.play().catch(() => {
      // Autoplay bloqueado: o poster continua na tela, sem quebrar nada.
    });
  }, [src]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      preload="none"
      muted
      loop
      playsInline
      aria-hidden
      className="absolute inset-0 size-full object-cover"
    />
  );
}
