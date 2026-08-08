"use client";

import Script from "next/script";

export type AnalyticsConfig = {
  gtmContainerId: string | null;
  ga4MeasurementId: string | null;
  metaPixelId: string | null;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Carrega GTM, GA4 e Pixel da Meta — cada um só se estiver cadastrado no
 * painel. Sem nada preenchido, nenhum byte é baixado.
 *
 * `afterInteractive` deixa o conteúdo pintar primeiro: analytics não pode
 * competir com o cardápio pelo tempo de carregamento no celular.
 */
export function Analytics({ gtmContainerId, ga4MeasurementId, metaPixelId }: AnalyticsConfig) {
  return (
    <>
      {gtmContainerId && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmContainerId}');`}
        </Script>
      )}

      {ga4MeasurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());gtag('config','${ga4MeasurementId}');`}
          </Script>
        </>
      )}

      {metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,
'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}

/** Item no formato que GA4 e Meta esperam. */
export type TrackedItem = {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
  category?: string;
};

const toReais = (cents: number) => Number((cents / 100).toFixed(2));

/**
 * Publica o evento nas três plataformas de uma vez.
 *
 * Nada aqui explode se o script não carregou (bloqueador de anúncio, offline,
 * ou simplesmente não configurado) — as funções são checadas antes.
 */
function push(
  gaEvent: string,
  metaEvent: string | null,
  items: TrackedItem[],
  valueCents: number,
  extra: Record<string, unknown> = {},
) {
  const value = toReais(valueCents);

  window.dataLayer?.push({
    event: gaEvent,
    ecommerce: {
      currency: "BRL",
      value,
      items: items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: toReais(item.priceCents),
        quantity: item.quantity,
      })),
    },
    ...extra,
  });

  if (metaEvent && typeof window.fbq === "function") {
    window.fbq("track", metaEvent, {
      currency: "BRL",
      value,
      content_type: "product",
      contents: items.map((item) => ({ id: item.id, quantity: item.quantity })),
      ...extra,
    });
  }
}

export const track = {
  viewItem: (item: TrackedItem) => push("view_item", "ViewContent", [item], item.priceCents),

  addToCart: (item: TrackedItem) =>
    push("add_to_cart", "AddToCart", [item], item.priceCents * item.quantity),

  beginCheckout: (items: TrackedItem[], subtotalCents: number) =>
    push("begin_checkout", "InitiateCheckout", items, subtotalCents),

  /**
   * A conversão que importa. Sem este evento com valor, o Ads não tem como
   * otimizar campanha — ele não enxerga o que aconteceu no WhatsApp.
   */
  orderSent: (
    items: TrackedItem[],
    totalCents: number,
    details: { fulfillment: "DELIVERY" | "PICKUP"; paymentMethod: string; code?: string },
  ) =>
    push("purchase", "Purchase", items, totalCents, {
      transaction_id: details.code,
      fulfillment: details.fulfillment,
      payment_method: details.paymentMethod,
    }),
};
