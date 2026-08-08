"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Reel = {
  id: string;
  title: string;
  videoUrl: string;
  posterUrl: string | null;
};

/**
 * Faixa de vídeos verticais 9:16.
 *
 * Cada card só baixa o MP4 quando entra no viewport (IntersectionObserver) —
 * sem isso, os três vídeos baixariam junto com a home. Toca mudo por política
 * de autoplay; o botão de som liga o áudio de um vídeo por vez.
 */
export function ReelsSection({ reels }: { reels: Reel[] }) {
  const [unmutedId, setUnmutedId] = useState<string | null>(null);

  if (reels.length === 0) return null;

  return (
    <section className="py-14">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-1 font-display text-2xl font-black sm:text-3xl">Direto da cozinha</h2>
        <p className="mb-6 text-sm text-muted">
          Um pouco do que sai do nosso balcão todos os dias.
        </p>
      </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:justify-center">
        {reels.map((reel) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            isUnmuted={unmutedId === reel.id}
            onToggleSound={() => setUnmutedId((current) => (current === reel.id ? null : reel.id))}
          />
        ))}
      </div>
    </section>
  );
}

function ReelCard({
  reel,
  isUnmuted,
  onToggleSound,
}: {
  reel: Reel;
  isUnmuted: boolean;
  onToggleSound: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Atribui o src só na primeira vez que o card aparece
          if (!loadedRef.current) {
            video.src = reel.videoUrl;
            loadedRef.current = true;
          }
          video.muted = !isUnmuted;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [reel.videoUrl, isUnmuted]);

  // Liga/desliga o som sem reiniciar o vídeo
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = !isUnmuted;
  }, [isUnmuted]);

  return (
    <div className="relative aspect-[9/16] w-[260px] shrink-0 snap-center overflow-hidden rounded-2xl border border-line bg-surface-2 sm:w-[290px]">
      <video
        ref={videoRef}
        poster={reel.posterUrl ?? undefined}
        preload="none"
        muted
        loop
        playsInline
        className="size-full object-cover"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-10">
        <p className="text-sm font-semibold text-white">{reel.title}</p>
      </div>

      <button
        type="button"
        onClick={onToggleSound}
        className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80"
        aria-label={isUnmuted ? "Desativar som" : "Ativar som"}
      >
        {isUnmuted ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
      </button>
    </div>
  );
}
