"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import type { StorefrontData } from "@/lib/store";

type StorefrontContextValue = StorefrontData & {
  isOrderingAllowed: boolean;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

/**
 * Distribui os dados da loja (configurações, horários, bairros, formas de
 * pagamento) para Header, CartDrawer e afins.
 *
 * Os dados vêm do servidor num único fetch; o status aberto/fechado é
 * recalculado no cliente a cada 30s com a hora ancorada no servidor.
 */
export function StorefrontProvider({
  data,
  children,
}: {
  data: StorefrontData;
  children: ReactNode;
}) {
  const { status, isOrderingAllowed } = useStoreStatus({
    hours: data.hours,
    timezone: data.settings.timezone,
    ordersEnabled: data.settings.ordersEnabled,
    initialStatus: data.status,
    initialServerNowIso: data.serverNowIso,
  });

  return (
    <StorefrontContext.Provider value={{ ...data, status, isOrderingAllowed }}>
      {children}
    </StorefrontContext.Provider>
  );
}

export function useStorefront(): StorefrontContextValue {
  const context = useContext(StorefrontContext);
  if (!context) {
    throw new Error("useStorefront precisa estar dentro de <StorefrontProvider>");
  }
  return context;
}
