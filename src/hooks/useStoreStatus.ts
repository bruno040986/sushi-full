"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getStoreStatus, type OpeningHourDTO, type StoreStatus } from "@/lib/hours";

type Options = {
  hours: OpeningHourDTO[];
  timezone: string;
  ordersEnabled: boolean;
  /** Status calculado no servidor, para o primeiro paint não piscar */
  initialStatus: StoreStatus;
  initialServerNowIso?: string;
};

/**
 * Mantém o status aberto/fechado atualizado sem ficar consultando a rede.
 *
 * Ancora o relógio no servidor: busca `serverNowIso` uma vez, guarda o offset
 * contra o relógio local e recomputa a cada 30s com a hora corrigida. Assim
 * ninguém destrava o botão de pedido mudando a hora do celular.
 */
export function useStoreStatus({
  hours,
  timezone,
  ordersEnabled,
  initialStatus,
  initialServerNowIso,
}: Options) {
  const [status, setStatus] = useState<StoreStatus>(initialStatus);
  // Diferença entre o relógio do servidor e o do aparelho. Começa em 0 e é
  // ajustada no efeito — ler Date.now() durante o render não é permitido.
  const offsetRef = useRef(0);

  const recompute = useCallback(() => {
    setStatus(getStoreStatus(hours, new Date(Date.now() + offsetRef.current), timezone));
  }, [hours, timezone]);

  // Sincroniza o relógio com o servidor uma vez ao montar
  useEffect(() => {
    let cancelled = false;

    if (initialServerNowIso) {
      offsetRef.current = Date.parse(initialServerNowIso) - Date.now();
    }

    fetch("/api/store/status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.serverNowIso) return;
        offsetRef.current = Date.parse(data.serverNowIso) - Date.now();
        recompute();
      })
      .catch(() => {
        // Offline: seguimos com o status do servidor mais o relógio local.
      });

    return () => {
      cancelled = true;
    };
  }, [recompute, initialServerNowIso]);

  // Recalcula periodicamente e ao voltar para a aba
  useEffect(() => {
    const interval = setInterval(recompute, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") recompute();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [recompute]);

  return {
    status,
    /** Só isto libera o envio do pedido. */
    isOrderingAllowed: status.isOpen && ordersEnabled,
  };
}
