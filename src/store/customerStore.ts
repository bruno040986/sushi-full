"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Dados do cliente guardados NO APARELHO DELE (localStorage).
 *
 * É o que faz o cliente recorrente não redigitar nada. Deliberadamente não
 * existe rota pública que devolva estes dados a partir de um telefone: isso
 * permitiria a qualquer visitante extrair nome e endereço da base inteira
 * digitando números — vazamento de dado pessoal e problema de LGPD.
 *
 * O servidor guarda o cadastro, mas só o painel autenticado lê.
 */
export type CustomerProfile = {
  name: string;
  phone: string;
  street: string;
  number: string;
  complement: string;
  /** Cidade atendida escolhida; null = usa a padrão cadastrada no painel */
  cityId: string | null;
  deliveryZoneId: string | null;
  reference: string;
  fulfillment: "DELIVERY" | "PICKUP";
};

type CustomerState = CustomerProfile & {
  update: (patch: Partial<CustomerProfile>) => void;
  clear: () => void;
};

/** Só o perfil é persistido — as funções ficam de fora. */
const PROFILE_KEYS = [
  "name",
  "phone",
  "street",
  "number",
  "complement",
  "cityId",
  "deliveryZoneId",
  "reference",
  "fulfillment",
] as const satisfies readonly (keyof CustomerProfile)[];

const EMPTY: CustomerProfile = {
  name: "",
  phone: "",
  street: "",
  number: "",
  complement: "",
  cityId: null,
  deliveryZoneId: null,
  reference: "",
  fulfillment: "DELIVERY",
};

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      ...EMPTY,
      update: (patch) => set(patch),
      clear: () => set(EMPTY),
    }),
    {
      name: "sushifull-cliente",
      partialize: (state) =>
        Object.fromEntries(PROFILE_KEYS.map((key) => [key, state[key]])) as CustomerProfile,
    },
  ),
);
