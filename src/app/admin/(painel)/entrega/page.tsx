"use client";

import { Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CsvImport, type ImportSpec } from "@/components/admin/CsvImport";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Notice,
  PageHeader,
  Select,
  TextInput,
  Toggle,
} from "@/components/admin/ui";
import { api } from "@/lib/apiClient";
import { formatBRL, formatCents, parseBRLToCents } from "@/lib/money";

type City = {
  id: string;
  name: string;
  state: string;
  isDefault: boolean;
  active: boolean;
  sortOrder: number;
  _count: { zones: number };
};

type Zone = {
  id: string;
  name: string;
  feeCents: number;
  freeDelivery: boolean;
  freeDeliveryThresholdCents: number | null;
  etaMinutes: number | null;
  active: boolean;
  sortOrder: number;
  cityId: string;
  city: { id: string; name: string; state: string };
};

type Settings = {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFeeMode: "FIXED" | "BY_NEIGHBORHOOD";
  fixedDeliveryFeeCents: number;
  freeDeliveryThresholdCents: number | null;
  minOrderCents: number | null;
  deliveryEtaMinMinutes: number;
  deliveryEtaMaxMinutes: number;
  pickupEtaMinutes: number;
};

const IMPORT_ZONES: ImportSpec = {
  action: "Importar bairros",
  title: "Cadastro e atualização de bairros em lote",
  description:
    "A mesma planilha serve para cadastrar e para atualizar: o sistema compara com o que está no banco, muda o que está diferente e ignora o que está igual. Cidade nova é criada junto.",
  endpoint: "/api/admin/delivery-zones/import",
  templates: [
    {
      href: "/api/admin/delivery-zones/export",
      label: "Planilha de bairros",
      hint: "Todos os bairros cadastrados, com taxa, previsão e regras",
    },
  ],
  columns:
    "id · bairro · cidade · uf · taxa_entrega · frete_gratis_acima_de · previsao_min · frete_sempre_gratis · entregamos · ordem",
};

export default function EntregaPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editingCity, setEditingCity] = useState<City | "new" | null>(null);
  const [editingZone, setEditingZone] = useState<Zone | "new" | null>(null);

  async function reload() {
    const [c, z, s] = await Promise.all([
      api<{ cities: City[] }>("/api/admin/service-cities"),
      api<{ zones: Zone[] }>("/api/admin/delivery-zones"),
      api<{ settings: Settings }>("/api/admin/settings"),
    ]);
    setCities(c.cities);
    setZones(z.zones);
    setSettings(s.settings);
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await reload();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Falha ao carregar");
      } finally {
        if (active) setLoading(false);
      }
    })();

    // Evita atualizar estado depois que a tela saiu
    return () => {
      active = false;
    };
  }, []);

  async function saveSettings(patch: Partial<Settings>) {
    setError(null);
    setSaved(false);
    try {
      const { settings: updated } = await api<{ settings: Settings }>("/api/admin/settings", {
        method: "PATCH",
        body: patch,
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
    }
  }

  async function removeCity(city: City) {
    if (!confirm(`Excluir a cidade "${city.name}"?`)) return;
    try {
      await api(`/api/admin/service-cities/${city.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir");
    }
  }

  async function removeZone(zone: Zone) {
    if (!confirm(`Excluir o bairro "${zone.name}"?`)) return;
    try {
      await api(`/api/admin/delivery-zones/${zone.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir");
    }
  }

  if (loading || !settings) return <EmptyState>Carregando…</EmptyState>;

  return (
    <>
      <PageHeader
        title="Entrega"
        description="Modalidades, taxa de frete, cidades atendidas e bairros."
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {saved && (
        <div className="mb-4">
          <Notice tone="success">Alterações salvas.</Notice>
        </div>
      )}

      <div className="space-y-6">
        {/* Modalidades e regra de frete */}
        <Card className="space-y-5">
          <h2 className="font-display font-bold">Como o cliente recebe</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle
              checked={settings.deliveryEnabled}
              onChange={(value) => saveSettings({ deliveryEnabled: value })}
              label="Aceitar entrega"
              hint="Cliente informa o endereço e paga o frete"
            />
            <Toggle
              checked={settings.pickupEnabled}
              onChange={(value) => saveSettings({ pickupEnabled: value })}
              label="Aceitar retirada no balcão"
              hint="Sem taxa, cliente busca na loja"
            />
          </div>

          <div className="border-t border-line pt-5">
            <Field
              label="Como calcular o frete"
              hint="Em qualquer modo, o cliente escolhe o bairro na lista abaixo."
            >
              <Select
                value={settings.deliveryFeeMode}
                onChange={(e) =>
                  saveSettings({ deliveryFeeMode: e.target.value as Settings["deliveryFeeMode"] })
                }
              >
                <option value="FIXED">Taxa única para todos os bairros</option>
                <option value="BY_NEIGHBORHOOD">Taxa por bairro</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {settings.deliveryFeeMode === "FIXED" && (
              <MoneyField
                label="Taxa única"
                value={settings.fixedDeliveryFeeCents}
                // Sem `nullable`, o campo nunca emite null — mas o tipo permite.
                onSave={(cents) => cents != null && saveSettings({ fixedDeliveryFeeCents: cents })}
              />
            )}
            <MoneyField
              label="Frete grátis a partir de"
              hint="Vazio = sem promoção"
              value={settings.freeDeliveryThresholdCents}
              nullable
              onSave={(cents) => saveSettings({ freeDeliveryThresholdCents: cents ?? null })}
            />
            <MoneyField
              label="Pedido mínimo"
              hint="Compara com o subtotal, sem o frete"
              value={settings.minOrderCents}
              nullable
              onSave={(cents) => saveSettings({ minOrderCents: cents ?? null })}
            />
          </div>

          <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
            <NumberField
              label="Previsão mínima (min)"
              value={settings.deliveryEtaMinMinutes}
              onSave={(value) => saveSettings({ deliveryEtaMinMinutes: value })}
            />
            <NumberField
              label="Previsão máxima (min)"
              value={settings.deliveryEtaMaxMinutes}
              onSave={(value) => saveSettings({ deliveryEtaMaxMinutes: value })}
            />
            <NumberField
              label="Retirada pronta em (min)"
              value={settings.pickupEtaMinutes}
              onSave={(value) => saveSettings({ pickupEtaMinutes: value })}
            />
          </div>
        </Card>

        {/* Cidades */}
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold">Cidades atendidas</h2>
              <p className="text-sm text-muted">
                A marcada como padrão vem pré-selecionada no checkout. A UF acompanha a cidade.
              </p>
            </div>
            <Button variant="ghost" onClick={() => setEditingCity("new")}>
              <Plus className="size-4" aria-hidden />
              Nova
            </Button>
          </div>

          {editingCity && (
            <div className="mb-4">
              <CityForm
                city={editingCity === "new" ? null : editingCity}
                onDone={async () => {
                  setEditingCity(null);
                  await reload();
                }}
                onCancel={() => setEditingCity(null)}
              />
            </div>
          )}

          <ul className="divide-y divide-line">
            {cities.map((city) => (
              <li key={city.id} className="flex flex-wrap items-center gap-3 py-3">
                <MapPin className="size-4 shrink-0 text-faint" aria-hidden />
                <div className="min-w-32 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {city.name}/{city.state}
                    </span>
                    {city.isDefault && <Badge tone="brand">Padrão</Badge>}
                    {!city.active && <Badge tone="danger">Inativa</Badge>}
                  </div>
                  <p className="text-sm text-muted">
                    {city._count.zones} bairro{city._count.zones === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCity(city)}
                  className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-brand"
                  aria-label={`Editar ${city.name}`}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeCity(city)}
                  className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-danger"
                  aria-label={`Excluir ${city.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* Bairros */}
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold">Bairros</h2>
              <p className="text-sm text-muted">
                Cada bairro pode ter taxa própria, frete grátis sempre, ou frete grátis acima de
                um valor só dele.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CsvImport spec={IMPORT_ZONES} onApplied={() => void reload()} />
              <Button variant="ghost" onClick={() => setEditingZone("new")} disabled={!cities.length}>
                <Plus className="size-4" aria-hidden />
                Novo
              </Button>
            </div>
          </div>

          {editingZone && (
            <div className="mb-4">
              <ZoneForm
                zone={editingZone === "new" ? null : editingZone}
                cities={cities}
                onDone={async () => {
                  setEditingZone(null);
                  await reload();
                }}
                onCancel={() => setEditingZone(null)}
              />
            </div>
          )}

          {zones.length === 0 ? (
            <EmptyState>
              Nenhum bairro cadastrado. Sem bairro, ninguém consegue pedir entrega.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {zones.map((zone) => (
                <li key={zone.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-32 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{zone.name}</span>
                      {zone.freeDelivery && <Badge tone="success">Frete grátis</Badge>}
                      {!zone.active && <Badge tone="danger">Inativo</Badge>}
                    </div>
                    <p className="text-sm text-muted">
                      {zone.city.name}/{zone.city.state}
                      {zone.etaMinutes ? ` · ~${zone.etaMinutes} min` : ""}
                      {zone.freeDeliveryThresholdCents != null &&
                        ` · grátis acima de ${formatBRL(zone.freeDeliveryThresholdCents)}`}
                    </p>
                  </div>

                  <span className="font-display font-bold tabular-nums">
                    {zone.freeDelivery ? "—" : formatBRL(zone.feeCents)}
                  </span>

                  <button
                    type="button"
                    onClick={() => setEditingZone(zone)}
                    className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-brand"
                    aria-label={`Editar ${zone.name}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeZone(zone)}
                    className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-danger"
                    aria-label={`Excluir ${zone.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

/**
 * Campo de dinheiro que salva ao sair do foco.
 *
 * Não-controlado de propósito: o `key` remonta o input quando o valor muda no
 * servidor, o que dispensa sincronizar prop→estado num efeito.
 */
function MoneyField({
  label,
  hint,
  value,
  nullable,
  onSave,
}: {
  label: string;
  hint?: string;
  value: number | null;
  nullable?: boolean;
  onSave: (cents: number | null) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
          R$
        </span>
        <TextInput
          key={String(value)}
          defaultValue={value == null ? "" : formatCents(value)}
          onBlur={(event) => {
            const cents = parseBRLToCents(event.target.value);
            if (cents == null && !nullable) {
              // Campo obrigatório esvaziado: devolve o valor que estava lá
              event.target.value = value == null ? "" : formatCents(value);
              return;
            }
            if (cents !== value) onSave(cents);
          }}
          inputMode="decimal"
          placeholder={nullable ? "sem limite" : "0,00"}
          className="pl-10"
        />
      </div>
    </Field>
  );
}

function NumberField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number;
  onSave: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <TextInput
        key={String(value)}
        type="number"
        min={0}
        defaultValue={value}
        onBlur={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && next !== value) onSave(next);
        }}
      />
    </Field>
  );
}

function CityForm({
  city,
  onDone,
  onCancel,
}: {
  city: City | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(city?.name ?? "");
  const [state, setState] = useState(city?.state ?? "GO");
  const [isDefault, setIsDefault] = useState(city?.isDefault ?? false);
  const [active, setActive] = useState(city?.active ?? true);
  const [sortOrder, setSortOrder] = useState(city?.sortOrder ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { name, state, isDefault, active, sortOrder };
      if (city) await api(`/api/admin/service-cities/${city.id}`, { method: "PATCH", body });
      else await api("/api/admin/service-cities", { method: "POST", body });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface-2 p-4">
      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid gap-3 sm:grid-cols-[1fr_6rem_6rem]">
        <Field label="Cidade">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="Valparaíso de Goiás"
          />
        </Field>
        <Field label="UF">
          <TextInput
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
            required
            maxLength={2}
            placeholder="GO"
          />
        </Field>
        <Field label="Ordem">
          <TextInput
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </Field>
      </div>

      <Toggle
        checked={isDefault}
        onChange={setIsDefault}
        label="Cidade padrão"
        hint="Vem pré-selecionada no checkout. Só uma pode ser a padrão."
      />
      <Toggle checked={active} onChange={setActive} label="Atendemos esta cidade" />

      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          <Check className="size-4" aria-hidden />
          Salvar
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="size-4" aria-hidden />
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function ZoneForm({
  zone,
  cities,
  onDone,
  onCancel,
}: {
  zone: Zone | null;
  cities: City[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(zone?.name ?? "");
  const [cityId, setCityId] = useState(
    zone?.cityId ?? cities.find((c) => c.isDefault)?.id ?? cities[0]?.id ?? "",
  );
  const [feeText, setFeeText] = useState(zone ? formatCents(zone.feeCents) : "");
  const [freeDelivery, setFreeDelivery] = useState(zone?.freeDelivery ?? false);
  const [thresholdText, setThresholdText] = useState(
    zone?.freeDeliveryThresholdCents != null ? formatCents(zone.freeDeliveryThresholdCents) : "",
  );
  const [eta, setEta] = useState(zone?.etaMinutes != null ? String(zone.etaMinutes) : "");
  const [active, setActive] = useState(zone?.active ?? true);
  const [sortOrder, setSortOrder] = useState(zone?.sortOrder ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        name,
        cityId,
        feeCents: parseBRLToCents(feeText) ?? 0,
        freeDelivery,
        freeDeliveryThresholdCents: parseBRLToCents(thresholdText),
        etaMinutes: eta ? Number(eta) : null,
        active,
        sortOrder,
      };
      if (zone) await api(`/api/admin/delivery-zones/${zone.id}`, { method: "PATCH", body });
      else await api("/api/admin/delivery-zones", { method: "POST", body });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface-2 p-4">
      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bairro">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="Parque Esplanada III"
          />
        </Field>
        <Field label="Cidade">
          <Select value={cityId} onChange={(e) => setCityId(e.target.value)} required>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}/{city.state}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Taxa de entrega">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              R$
            </span>
            <TextInput
              value={feeText}
              onChange={(e) => setFeeText(e.target.value)}
              inputMode="decimal"
              disabled={freeDelivery}
              placeholder="5,00"
              className="pl-10"
            />
          </div>
        </Field>
        <Field label="Frete grátis acima de" optional hint="Só neste bairro">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              R$
            </span>
            <TextInput
              value={thresholdText}
              onChange={(e) => setThresholdText(e.target.value)}
              inputMode="decimal"
              disabled={freeDelivery}
              placeholder="usa a regra geral"
              className="pl-10"
            />
          </div>
        </Field>
        <Field label="Previsão (min)" optional>
          <TextInput
            type="number"
            min={0}
            value={eta}
            onChange={(e) => setEta(e.target.value)}
            placeholder="usa a geral"
          />
        </Field>
      </div>

      <Toggle
        checked={freeDelivery}
        onChange={setFreeDelivery}
        label="Frete sempre grátis neste bairro"
        hint="Ignora a taxa e qualquer valor mínimo"
      />
      <Toggle checked={active} onChange={setActive} label="Entregamos neste bairro" />

      <Field label="Ordem na lista">
        <TextInput
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          className="max-w-24"
        />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          <Check className="size-4" aria-hidden />
          Salvar
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="size-4" aria-hidden />
          Cancelar
        </Button>
      </div>
    </form>
  );
}
