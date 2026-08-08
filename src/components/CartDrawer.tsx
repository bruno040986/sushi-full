"use client";

import { AlertCircle, Bike, Minus, Plus, ShoppingBag, Store, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { track } from "@/components/Analytics";
import { useStorefront } from "@/components/StorefrontProvider";
import { formatBRL, formatPhone, isValidPhone, onlyDigits, parseBRLToCents } from "@/lib/money";
import { computeTotals } from "@/lib/pricing";
import { formatStoreAddress } from "@/lib/store";
import { buildOrderMessage, buildWhatsappUrl } from "@/lib/whatsapp";
import { useCartStore } from "@/store/cartStore";
import { useCustomerStore } from "@/store/customerStore";

/** Domínio sem protocolo, para assinar a mensagem do WhatsApp. */
const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "").replace(
  /\/$/,
  "",
);

export function CartDrawer() {
  const { settings, zones, cities, paymentMethods, status, isOrderingAllowed } = useStorefront();

  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isDrawerOpen);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotalCents = useCartStore((s) => s.subtotalCents());

  const customer = useCustomerStore();
  const [chosenPaymentId, setChosenPaymentId] = useState("");
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  // Só uma modalidade habilitada: não faz sentido mostrar o seletor
  const onlyDelivery = settings.deliveryEnabled && !settings.pickupEnabled;
  const onlyPickup = settings.pickupEnabled && !settings.deliveryEnabled;
  const fulfillment = onlyDelivery ? "DELIVERY" : onlyPickup ? "PICKUP" : customer.fulfillment;
  const isDelivery = fulfillment === "DELIVERY";

  // Deriva em vez de pré-selecionar num efeito: enquanto o cliente não escolhe,
  // vale a primeira forma cadastrada.
  const paymentMethodId = chosenPaymentId || (paymentMethods[0]?.id ?? "");
  const selectedPayment = paymentMethods.find((m) => m.id === paymentMethodId);

  // Cidade: a escolhida pelo cliente ou a marcada como padrão no painel
  const defaultCity = cities.find((c) => c.isDefault) ?? cities[0] ?? null;
  const selectedCity = cities.find((c) => c.id === customer.cityId) ?? defaultCity;

  // Bairros são sempre os cadastrados no painel, filtrados pela cidade
  const cityZones = useMemo(
    () => zones.filter((zone) => zone.cityId === selectedCity?.id),
    [zones, selectedCity],
  );
  const selectedZone = cityZones.find((z) => z.id === customer.deliveryZoneId) ?? null;

  const totals = useMemo(
    () =>
      computeTotals({
        subtotalCents,
        fulfillment,
        settings: {
          deliveryFeeMode: settings.deliveryFeeMode,
          fixedDeliveryFeeCents: settings.fixedDeliveryFeeCents,
          freeDeliveryThresholdCents: settings.freeDeliveryThresholdCents,
          minOrderCents: settings.minOrderCents,
        },
        zone: selectedZone,
      }),
    [subtotalCents, fulfillment, settings, selectedZone],
  );

  // Trocar de cidade invalida o bairro escolhido. Roda depois do commit para
  // não encadear renders.
  useEffect(() => {
    if (!customer.deliveryZoneId) return;
    if (cityZones.some((zone) => zone.id === customer.deliveryZoneId)) return;

    const timer = setTimeout(() => customer.update({ deliveryZoneId: null }), 0);
    return () => clearTimeout(timer);
  }, [cityZones, customer]);

  // Abrir o carrinho com itens é o início do checkout
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    track.beginCheckout(
      items.map((item) => ({
        id: item.productId,
        name: item.name,
        priceCents: item.priceCents,
        quantity: item.quantity,
      })),
      subtotalCents,
    );
    // Só quando abre — mexer no carrinho aberto não conta como novo checkout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Fecha no Esc e trava o scroll do fundo enquanto aberto
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeDrawer]);

  function validate(): string[] {
    const missing: string[] = [];
    if (!customer.name.trim()) missing.push("Nome");
    if (!isValidPhone(customer.phone)) missing.push("Telefone válido");
    if (!paymentMethodId) missing.push("Forma de pagamento");

    if (isDelivery) {
      if (!selectedZone) missing.push("Bairro atendido");
      if (!customer.street.trim()) missing.push("Rua");
      if (!customer.number.trim()) missing.push("Número");
    }

    if (selectedPayment?.isCash && changeFor.trim()) {
      const cents = parseBRLToCents(changeFor);
      if (cents == null || (totals.totalCents != null && cents < totals.totalCents)) {
        missing.push("Troco maior ou igual ao total");
      }
    }
    return missing;
  }

  /**
   * ATENÇÃO: esta função é 100% SÍNCRONA até o window.open.
   *
   * Qualquer `await` antes do window.open faz o Safari/iOS tratar a abertura
   * como não solicitada pelo usuário e bloquear o popup — o pedido morre ali.
   * Por isso o POST de registro vai em fire-and-forget, sem await.
   */
  function handleCheckout() {
    if (!isOrderingAllowed) return;

    const missing = validate();
    if (missing.length > 0) {
      setErrors(missing);
      return;
    }
    if (totals.totalCents == null || totals.deliveryFeeCents == null) {
      setErrors(["Selecione o bairro para calcular a entrega"]);
      return;
    }
    if (totals.belowMinimum && settings.minOrderCents) {
      setErrors([`O pedido mínimo é de ${formatBRL(settings.minOrderCents)}`]);
      return;
    }
    setErrors([]);

    const changeForCents =
      selectedPayment?.isCash && changeFor.trim() ? parseBRLToCents(changeFor) : null;

    const message = buildOrderMessage({
      storeName: settings.storeName,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        lineTotalCents: item.priceCents * item.quantity,
      })),
      subtotalCents,
      deliveryFeeCents: totals.deliveryFeeCents,
      totalCents: totals.totalCents,
      freeDeliveryApplied: totals.freeDeliveryApplied,
      freeDeliveryThresholdCents: totals.freeDeliveryThresholdCents ?? null,
      customerName: customer.name,
      customerPhone: customer.phone,
      fulfillment,
      delivery: isDelivery
        ? {
            street: customer.street,
            number: customer.number,
            complement: customer.complement,
            neighborhood: selectedZone?.name ?? "",
            reference: customer.reference,
            city: selectedCity?.name ?? settings.city,
            state: selectedCity?.state ?? settings.state,
            etaMinMinutes: selectedZone?.etaMinutes ?? settings.deliveryEtaMinMinutes,
            etaMaxMinutes: selectedZone?.etaMinutes ?? settings.deliveryEtaMaxMinutes,
          }
        : undefined,
      pickup: !isDelivery
        ? {
            storeAddress: formatStoreAddress(settings),
            etaMinutes: settings.pickupEtaMinutes,
          }
        : undefined,
      paymentMethodName: selectedPayment?.name ?? "Não informado",
      changeForCents,
      changeDueCents: changeForCents != null ? changeForCents - totals.totalCents : null,
      notes,
      siteUrl: SITE_DOMAIN,
    });

    // Registro do pedido — sem await, de propósito (ver comentário acima).
    void fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        fulfillment,
        customerName: customer.name,
        customerPhone: onlyDigits(customer.phone),
        street: isDelivery ? customer.street : null,
        number: isDelivery ? customer.number : null,
        complement: isDelivery ? customer.complement : null,
        neighborhood: isDelivery ? (selectedZone?.name ?? null) : null,
        reference: isDelivery ? customer.reference : null,
        deliveryZoneId: isDelivery ? selectedZone?.id : null,
        paymentMethodId,
        changeForCents,
        notes,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }),
    }).catch(() => {
      // Falha aqui não pode atrapalhar o cliente: o pedido já foi para o WhatsApp.
    });

    window.open(buildWhatsappUrl(settings.whatsappNumber, message), "_blank");

    // A conversão. Vai depois do window.open para não atrasar a abertura.
    track.orderSent(
      items.map((item) => ({
        id: item.productId,
        name: item.name,
        priceCents: item.priceCents,
        quantity: item.quantity,
      })),
      totals.totalCents,
      {
        fulfillment,
        paymentMethod: selectedPayment?.name ?? "",
      },
    );

    clearCart();
    setNotes("");
    setChangeFor("");
    closeDrawer();
  }

  const canSubmit = isOrderingAllowed && items.length > 0;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDrawer}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Seu pedido"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[26rem] flex-col bg-surface shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold">
            Seu pedido
            {items.length > 0 && <span className="ml-2 text-sm text-muted">({items.length})</span>}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-full p-2 text-muted transition hover:bg-surface-2 hover:text-cream"
            aria-label="Fechar carrinho"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingBag className="size-10 text-faint" aria-hidden />
              <p className="text-sm text-muted">Seu carrinho está vazio.</p>
              <button
                type="button"
                onClick={closeDrawer}
                className="text-sm font-semibold text-brand hover:text-brand-soft"
              >
                Ver o cardápio
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex gap-3 rounded-2xl border border-line bg-surface-2 p-3"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface-3">
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug">{item.name}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="shrink-0 rounded-lg p-1 text-faint transition hover:bg-surface-3 hover:text-danger"
                        aria-label={`Remover ${item.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <p className="mt-0.5 text-xs text-muted">{formatBRL(item.priceCents)} cada</p>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border border-line">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          className="p-1.5 text-muted transition hover:text-cream"
                          aria-label={`Diminuir ${item.name}`}
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="min-w-7 text-center text-sm font-bold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          className="p-1.5 text-muted transition hover:text-cream"
                          aria-label={`Aumentar ${item.name}`}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="font-display text-sm font-bold">
                        {formatBRL(item.priceCents * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Formulário e resumo */}
        {items.length > 0 && (
          <div className="max-h-[62vh] space-y-4 overflow-y-auto border-t border-line bg-surface-2 px-5 py-4">
            {/* Entrega ou retirada */}
            {settings.deliveryEnabled && settings.pickupEnabled && (
              <div className="grid grid-cols-2 gap-2 rounded-full bg-surface p-1">
                {(
                  [
                    { value: "DELIVERY", label: "Entrega", Icon: Bike },
                    { value: "PICKUP", label: "Retirada", Icon: Store },
                  ] as const
                ).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => customer.update({ fulfillment: value })}
                    className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
                      fulfillment === value
                        ? "bg-brand text-white"
                        : "text-muted hover:text-cream"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/*
              Telefone em primeiro lugar de propósito: é a chave do cadastro
              guardado no aparelho, então ao digitá-lo o cliente recorrente já
              vê o resto do formulário preenchido.
            */}
            <Field label="Telefone (WhatsApp)">
              <input
                value={formatPhone(customer.phone)}
                onChange={(e) => customer.update({ phone: onlyDigits(e.target.value) })}
                inputMode="numeric"
                autoComplete="tel"
                className={inputClass}
                placeholder="(61) 90000-0000"
              />
            </Field>

            <Field label="Nome completo">
              <input
                value={customer.name}
                onChange={(e) => customer.update({ name: e.target.value })}
                autoComplete="name"
                className={inputClass}
                placeholder="Como devemos te chamar"
              />
            </Field>

            {isDelivery ? (
              <>
                <div className="grid grid-cols-[1fr_5rem] gap-2">
                  <Field label="Cidade">
                    <select
                      value={selectedCity?.id ?? ""}
                      onChange={(e) => customer.update({ cityId: e.target.value || null })}
                      className={inputClass}
                      disabled={cities.length <= 1}
                    >
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="UF">
                    {/* Acompanha a cidade — assim não dá para montar um par inválido */}
                    <input
                      value={selectedCity?.state ?? ""}
                      readOnly
                      tabIndex={-1}
                      aria-label="UF da cidade selecionada"
                      className={`${inputClass} cursor-default text-muted`}
                    />
                  </Field>
                </div>

                <Field label="Bairro">
                  <select
                    value={customer.deliveryZoneId ?? ""}
                    onChange={(e) => customer.update({ deliveryZoneId: e.target.value || null })}
                    className={inputClass}
                  >
                    <option value="">Selecione o bairro…</option>
                    {cityZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} — {zone.freeDelivery ? "frete grátis" : formatBRL(zone.feeCents)}
                      </option>
                    ))}
                  </select>
                  <a
                    href={buildWhatsappUrl(
                      settings.whatsappNumber,
                      "Olá! Meu bairro não aparece na lista de entrega do site. Vocês atendem aqui?",
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-brand hover:text-brand-soft"
                  >
                    Não achei meu bairro
                  </a>
                </Field>

                <div className="grid grid-cols-[1fr_5rem] gap-2">
                  <Field label="Rua">
                    <input
                      value={customer.street}
                      onChange={(e) => customer.update({ street: e.target.value })}
                      autoComplete="address-line1"
                      className={inputClass}
                      placeholder="Quadra, rua ou avenida"
                    />
                  </Field>
                  <Field label="Número">
                    <input
                      value={customer.number}
                      onChange={(e) => customer.update({ number: e.target.value })}
                      className={inputClass}
                      placeholder="123"
                    />
                  </Field>
                </div>

                <Field label="Complemento" optional>
                  <input
                    value={customer.complement}
                    onChange={(e) => customer.update({ complement: e.target.value })}
                    className={inputClass}
                    placeholder="Apto, bloco, casa"
                  />
                </Field>

                <Field label="Ponto de referência" optional>
                  <input
                    value={customer.reference}
                    onChange={(e) => customer.update({ reference: e.target.value })}
                    className={inputClass}
                    placeholder="Portão azul, em frente à praça"
                  />
                </Field>
              </>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-3 text-sm">
                <p className="font-semibold">Retirada no balcão</p>
                <p className="mt-1 text-muted">{formatStoreAddress(settings)}</p>
                <p className="mt-1 text-xs text-faint">
                  Fica pronto em cerca de {settings.pickupEtaMinutes} min.
                </p>
                {settings.googleMapsUrl && (
                  <a
                    href={settings.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-brand hover:text-brand-soft"
                  >
                    Traçar rota
                  </a>
                )}
              </div>
            )}

            <Field label="Forma de pagamento">
              <select
                value={paymentMethodId}
                onChange={(e) => setChosenPaymentId(e.target.value)}
                className={inputClass}
              >
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </Field>

            {selectedPayment?.isCash && (
              <Field label="Troco para quanto?" optional>
                <input
                  value={changeFor}
                  onChange={(e) => setChangeFor(e.target.value)}
                  inputMode="decimal"
                  className={inputClass}
                  placeholder="Ex: 100,00 — deixe vazio se não precisa"
                />
              </Field>
            )}

            <Field label="Observações" optional>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={500}
                className={`${inputClass} resize-none`}
                placeholder="Sem cebolinha, caprichar no shoyu…"
              />
            </Field>

            {/* Resumo */}
            <div className="space-y-1.5 border-t border-line pt-3 text-sm">
              <Row label="Subtotal" value={formatBRL(subtotalCents)} />
              {isDelivery && (
                <Row
                  label="Taxa de entrega"
                  value={
                    totals.deliveryFeeCents == null
                      ? "—"
                      : totals.freeDeliveryApplied
                        ? "GRÁTIS 🎉"
                        : formatBRL(totals.deliveryFeeCents)
                  }
                  highlight={totals.freeDeliveryApplied}
                />
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold">Total</span>
                <span className="font-display text-2xl font-black text-brand">
                  {totals.totalCents == null ? "—" : formatBRL(totals.totalCents)}
                </span>
              </div>

              {isDelivery && totals.amountMissingForFreeDeliveryCents != null && (
                <p className="rounded-xl bg-brand/10 px-3 py-2 text-xs text-brand-soft">
                  Faltam {formatBRL(totals.amountMissingForFreeDeliveryCents)} para o frete grátis 🎉
                </p>
              )}
              {totals.belowMinimum && settings.minOrderCents && (
                <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
                  O pedido mínimo é de {formatBRL(settings.minOrderCents)}.
                </p>
              )}
            </div>

            {errors.length > 0 && (
              <div className="flex gap-2 rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>Preencha: {errors.join(", ")}.</span>
              </div>
            )}

            {!isOrderingAllowed && (
              <div className="rounded-xl bg-warning/10 px-3 py-2.5 text-xs text-warning">
                <p className="font-semibold">
                  {settings.ordersEnabled ? "Estamos fechados agora." : "Pedidos pausados."}
                </p>
                <p className="mt-0.5 opacity-90">
                  {status.nextOpen?.label ?? settings.closedMessage}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={!canSubmit}
              className={`w-full rounded-full py-3.5 text-base font-bold transition ${
                canSubmit
                  ? "bg-brand text-white shadow-lg shadow-brand/25 hover:bg-brand-strong"
                  : "cursor-not-allowed bg-surface-3 text-faint"
              }`}
            >
              {isOrderingAllowed ? "Enviar pedido no WhatsApp" : "Fechado no momento"}
            </button>

            <a
              href={buildWhatsappUrl(settings.whatsappNumber, "Olá! Gostaria de tirar uma dúvida.")}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs text-muted transition hover:text-cream"
            >
              Falar com o atendente
            </a>

            <p className="text-center text-[0.6875rem] leading-relaxed text-faint">
              Ao enviar, você concorda que usemos seus dados para processar o pedido.
              Veja a{" "}
              <a href="/politica-de-privacidade" className="underline hover:text-muted">
                política de privacidade
              </a>
              .
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-cream placeholder:text-faint focus:border-brand focus:outline-none";

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">
        {label}
        {optional && <span className="ml-1 text-faint">(opcional)</span>}
      </span>
      {children}
    </label>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={highlight ? "font-semibold text-success" : ""}>{value}</span>
    </div>
  );
}
