"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { ImageField } from "@/components/admin/ImageField";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Notice,
  PageHeader,
  TextInput,
  inputClass,
  type FieldErrors,
} from "@/components/admin/ui";
import { ApiError, api } from "@/lib/apiClient";
import { formatCnpj, formatPhone, formatZip, onlyDigits } from "@/lib/money";

type Settings = Record<string, string | number | boolean | null>;

const TABS = [
  { id: "identidade", label: "Identidade" },
  { id: "juridico", label: "Dados jurídicos" },
  { id: "contato", label: "Contato" },
  { id: "redes", label: "Redes sociais" },
  { id: "local", label: "Localização" },
  { id: "seo", label: "SEO" },
  { id: "analytics", label: "Analytics" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState<TabId>("identidade");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<{ settings: Settings }>("/api/admin/settings")
      .then((data) => setSettings(data.settings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: string | null) =>
    setSettings((current) => (current ? { ...current, [key]: value } : current));

  const text = (key: string) => (settings?.[key] as string | null) ?? "";

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;

    setSaving(true);
    setError(null);
    setFieldErrors({});
    setSaved(false);

    // Só os campos desta tela — não reenviar entrega/horários, que têm tela própria
    const keys = TABS.flatMap((t) => FIELDS_BY_TAB[t.id]);
    const body = Object.fromEntries(keys.map((key) => [key, settings[key] ?? null]));

    try {
      const { settings: updated } = await api<{ settings: Settings }>("/api/admin/settings", {
        method: "PATCH",
        body,
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError("Não foi possível salvar");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) return <EmptyState>Carregando…</EmptyState>;

  return (
    <form onSubmit={save}>
      <PageHeader
        title="Configurações"
        description="Estes dados alimentam o site inteiro. Campo vazio some da página, em vez de virar link quebrado."
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {saved && (
        <div className="mb-4">
          <Notice tone="success">Salvo. As páginas já refletem a mudança.</Notice>
        </div>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-surface-2 p-1 scrollbar-hide">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === item.id ? "bg-brand text-white" : "text-muted hover:text-cream"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Card className="space-y-4">
        {tab === "identidade" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do restaurante" error={fieldErrors.storeName}>
                <TextInput value={text("storeName")} onChange={(e) => set("storeName", e.target.value)} />
              </Field>
              <Field label="Slogan" error={fieldErrors.tagline}>
                <TextInput value={text("tagline")} onChange={(e) => set("tagline", e.target.value)} />
              </Field>
            </div>
            <ImageField
              label="Logotipo"
              value={text("logoUrl") || null}
              onChange={(url) => set("logoUrl", url)}
              hint="Use PNG com fundo transparente — o site é escuro."
            />
            <Field label="Título da seção Sobre">
              <TextInput value={text("aboutTitle")} onChange={(e) => set("aboutTitle", e.target.value)} />
            </Field>
            <Field label="Texto do Sobre" optional error={fieldErrors.aboutText}>
              <textarea
                value={text("aboutText")}
                onChange={(e) => set("aboutText", e.target.value || null)}
                rows={5}
                className={`${inputClass} resize-y`}
              />
            </Field>
          </>
        )}

        {tab === "juridico" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Razão social" optional error={fieldErrors.legalName}>
                <TextInput
                  value={text("legalName")}
                  onChange={(e) => set("legalName", e.target.value || null)}
                  placeholder="SushiFull Restaurante LTDA"
                />
              </Field>
              <Field label="Nome fantasia" optional>
                <TextInput
                  value={text("tradeName")}
                  onChange={(e) => set("tradeName", e.target.value || null)}
                  placeholder="SushiFull"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="CNPJ"
                optional
                hint="Aparece no rodapé e nas páginas legais"
                error={fieldErrors.cnpj}
              >
                <TextInput
                  value={formatCnpj(text("cnpj"))}
                  onChange={(e) => set("cnpj", onlyDigits(e.target.value) || null)}
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  error={fieldErrors.cnpj}
                />
              </Field>
              <Field label="Inscrição estadual" optional>
                <TextInput
                  value={text("stateRegistration")}
                  onChange={(e) => set("stateRegistration", e.target.value || null)}
                />
              </Field>
            </div>
          </>
        )}

        {tab === "contato" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="WhatsApp (só dígitos, com DDI)"
                hint="É para onde os pedidos são enviados"
                error={fieldErrors.whatsappNumber}
              >
                <TextInput
                  value={text("whatsappNumber")}
                  onChange={(e) => set("whatsappNumber", onlyDigits(e.target.value))}
                  inputMode="numeric"
                  placeholder="5561993292359"
                  error={fieldErrors.whatsappNumber}
                />
              </Field>
              <Field label="WhatsApp como exibir">
                <TextInput
                  value={text("whatsappDisplay")}
                  onChange={(e) => set("whatsappDisplay", e.target.value)}
                  placeholder="(61) 99329-2359"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Telefone fixo" optional>
                <TextInput
                  value={formatPhone(text("phoneLandline"))}
                  onChange={(e) => set("phoneLandline", e.target.value || null)}
                />
              </Field>
              <Field label="Telefone secundário" optional>
                <TextInput
                  value={formatPhone(text("secondaryPhone"))}
                  onChange={(e) => set("secondaryPhone", e.target.value || null)}
                />
              </Field>
              <Field label="E-mail" optional error={fieldErrors.contactEmail}>
                <TextInput
                  type="email"
                  value={text("contactEmail")}
                  onChange={(e) => set("contactEmail", e.target.value || null)}
                  error={fieldErrors.contactEmail}
                />
              </Field>
            </div>
          </>
        )}

        {tab === "redes" && (
          <>
            <p className="text-sm text-muted">
              Deixe em branco o que o restaurante não usa — o botão simplesmente não aparece.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instagram (URL)" optional error={fieldErrors.instagramUrl}>
                <TextInput
                  type="url"
                  value={text("instagramUrl")}
                  onChange={(e) => set("instagramUrl", e.target.value || null)}
                  placeholder="https://instagram.com/sushifullvalparaiso"
                  error={fieldErrors.instagramUrl}
                />
              </Field>
              <Field label="@ do Instagram" optional>
                <TextInput
                  value={text("instagramHandle")}
                  onChange={(e) => set("instagramHandle", e.target.value || null)}
                  placeholder="@sushifullvalparaiso"
                />
              </Field>
              <Field label="Facebook (URL)" optional error={fieldErrors.facebookUrl}>
                <TextInput
                  type="url"
                  value={text("facebookUrl")}
                  onChange={(e) => set("facebookUrl", e.target.value || null)}
                  error={fieldErrors.facebookUrl}
                />
              </Field>
              <Field label="TikTok (URL)" optional error={fieldErrors.tiktokUrl}>
                <TextInput
                  type="url"
                  value={text("tiktokUrl")}
                  onChange={(e) => set("tiktokUrl", e.target.value || null)}
                  error={fieldErrors.tiktokUrl}
                />
              </Field>
              <Field label="iFood (URL)" optional error={fieldErrors.ifoodUrl}>
                <TextInput
                  type="url"
                  value={text("ifoodUrl")}
                  onChange={(e) => set("ifoodUrl", e.target.value || null)}
                  error={fieldErrors.ifoodUrl}
                />
              </Field>
              <Field label="Linktree (URL)" optional error={fieldErrors.linktreeUrl}>
                <TextInput
                  type="url"
                  value={text("linktreeUrl")}
                  onChange={(e) => set("linktreeUrl", e.target.value || null)}
                  error={fieldErrors.linktreeUrl}
                />
              </Field>
            </div>
          </>
        )}

        {tab === "local" && (
          <>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem_1fr]">
              <Field label="Logradouro">
                <TextInput
                  value={text("addressLine")}
                  onChange={(e) => set("addressLine", e.target.value)}
                  placeholder="Q 33, Lote 22"
                />
              </Field>
              <Field label="Número" optional>
                <TextInput value={text("number")} onChange={(e) => set("number", e.target.value || null)} />
              </Field>
              <Field label="Complemento" optional>
                <TextInput
                  value={text("complement")}
                  onChange={(e) => set("complement", e.target.value || null)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_5rem_9rem]">
              <Field label="Bairro">
                <TextInput
                  value={text("neighborhood")}
                  onChange={(e) => set("neighborhood", e.target.value)}
                />
              </Field>
              <Field label="Cidade">
                <TextInput value={text("city")} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="UF">
                <TextInput
                  value={text("state")}
                  onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                />
              </Field>
              <Field label="CEP" optional>
                <TextInput
                  value={formatZip(text("zipCode"))}
                  onChange={(e) => set("zipCode", onlyDigits(e.target.value) || null)}
                  inputMode="numeric"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Link do Google Maps"
                optional
                hint='Aparece no botão "Como chegar"'
                error={fieldErrors.googleMapsUrl}
              >
                <TextInput
                  type="url"
                  value={text("googleMapsUrl")}
                  onChange={(e) => set("googleMapsUrl", e.target.value || null)}
                  error={fieldErrors.googleMapsUrl}
                />
              </Field>
              <Field
                label="Link do Waze"
                optional
                hint="Some do modal se ficar vazio"
                error={fieldErrors.wazeUrl}
              >
                <TextInput
                  type="url"
                  value={text("wazeUrl")}
                  onChange={(e) => set("wazeUrl", e.target.value || null)}
                  error={fieldErrors.wazeUrl}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" optional hint="Deixa o mapa mais preciso">
                <TextInput
                  value={text("latitude")}
                  onChange={(e) => set("latitude", e.target.value || null)}
                  inputMode="decimal"
                  placeholder="-16.0658"
                />
              </Field>
              <Field label="Longitude" optional>
                <TextInput
                  value={text("longitude")}
                  onChange={(e) => set("longitude", e.target.value || null)}
                  inputMode="decimal"
                  placeholder="-47.9756"
                />
              </Field>
            </div>
          </>
        )}

        {tab === "seo" && (
          <>
            <Field
              label="Título nos buscadores"
              optional
              hint={`${text("metaTitle").length}/70 caracteres`}
              error={fieldErrors.metaTitle}
            >
              <TextInput
                value={text("metaTitle")}
                onChange={(e) => set("metaTitle", e.target.value || null)}
                maxLength={70}
              />
            </Field>
            <Field
              label="Descrição nos buscadores"
              optional
              hint={`${text("metaDescription").length}/180 caracteres`}
              error={fieldErrors.metaDescription}
            >
              <textarea
                value={text("metaDescription")}
                onChange={(e) => set("metaDescription", e.target.value || null)}
                rows={3}
                maxLength={180}
                className={`${inputClass} resize-y`}
              />
            </Field>
            <ImageField
              label="Imagem de compartilhamento"
              value={text("ogImageUrl") || null}
              onChange={(url) => set("ogImageUrl", url)}
              hint="Aparece quando alguém compartilha o link no WhatsApp."
            />
          </>
        )}
        {tab === "analytics" && (
          <>
            <p className="text-sm text-muted">
              Cada ferramenta só é carregada se estiver preenchida aqui — em branco, o site não
              baixa nada e não grava cookie de terceiro. O aviso de cookies aparece sozinho
              quando alguma estiver ativa.
            </p>

            <Field
              label="Google Tag Manager"
              optional
              hint="Contêiner para gerenciar as tags sem mexer no código"
              error={fieldErrors.gtmContainerId}
            >
              <TextInput
                value={text("gtmContainerId")}
                onChange={(e) => set("gtmContainerId", e.target.value.toUpperCase() || null)}
                placeholder="GTM-XXXXXXX"
                error={fieldErrors.gtmContainerId}
              />
            </Field>

            <Field
              label="Google Analytics 4"
              optional
              hint="Relatórios de tráfego e comportamento"
              error={fieldErrors.ga4MeasurementId}
            >
              <TextInput
                value={text("ga4MeasurementId")}
                onChange={(e) => set("ga4MeasurementId", e.target.value.toUpperCase() || null)}
                placeholder="G-XXXXXXXXXX"
                error={fieldErrors.ga4MeasurementId}
              />
            </Field>

            <Field
              label="Pixel da Meta"
              optional
              hint="Para anunciar no Instagram e no Facebook. Só os números do ID."
              error={fieldErrors.metaPixelId}
            >
              <TextInput
                value={text("metaPixelId")}
                onChange={(e) => set("metaPixelId", e.target.value.replace(/\D/g, "") || null)}
                inputMode="numeric"
                placeholder="1234567890123456"
                error={fieldErrors.metaPixelId}
              />
            </Field>

            <div className="rounded-2xl border border-line bg-surface-2 p-4 text-sm">
              <h3 className="mb-2 font-bold">O que o site já mede sozinho</h3>
              <ul className="space-y-1 text-muted">
                <li>
                  <code className="text-cream">view_item</code> — abriu o detalhe de um prato
                </li>
                <li>
                  <code className="text-cream">add_to_cart</code> — adicionou ao carrinho
                </li>
                <li>
                  <code className="text-cream">begin_checkout</code> — abriu o carrinho para
                  fechar o pedido
                </li>
                <li>
                  <code className="text-cream">purchase</code> — <strong>enviou o pedido</strong>,
                  com valor, itens e forma de pagamento
                </li>
              </ul>
              <p className="mt-3 text-xs text-faint">
                É o <code>purchase</code> que permite a campanha otimizar por conversão. Sem ele,
                o anúncio só sabe que houve visita.
              </p>
            </div>
          </>
        )}
      </Card>

      <div className="mt-6">
        <Button type="submit" loading={saving}>
          <Check className="size-4" aria-hidden />
          Salvar configurações
        </Button>
      </div>
    </form>
  );
}

/** Quais campos cada aba controla — o PATCH envia só estes. */
const FIELDS_BY_TAB: Record<TabId, string[]> = {
  identidade: ["storeName", "tagline", "logoUrl", "aboutTitle", "aboutText"],
  juridico: ["legalName", "tradeName", "cnpj", "stateRegistration"],
  contato: [
    "whatsappNumber",
    "whatsappDisplay",
    "phoneLandline",
    "secondaryPhone",
    "contactEmail",
  ],
  redes: [
    "instagramUrl",
    "instagramHandle",
    "facebookUrl",
    "tiktokUrl",
    "ifoodUrl",
    "linktreeUrl",
  ],
  local: [
    "addressLine",
    "number",
    "complement",
    "neighborhood",
    "city",
    "state",
    "zipCode",
    "googleMapsUrl",
    "wazeUrl",
    "latitude",
    "longitude",
  ],
  seo: ["metaTitle", "metaDescription", "ogImageUrl"],
  analytics: ["gtmContainerId", "ga4MeasurementId", "metaPixelId"],
};
