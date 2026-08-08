"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  Notice,
  PageHeader,
  TextInput,
  Toggle,
} from "@/components/admin/ui";
import { api } from "@/lib/apiClient";
import { WEEKDAY_NAMES, formatMinutes } from "@/lib/hours";

type Hour = {
  weekday: number;
  closed: boolean;
  opensAtMin: number;
  closesAtMin: number;
};

/** Segunda a domingo — a ordem que o dono espera ver. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const toTimeInput = (minutes: number) => {
  const normalized = minutes % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
};

const fromTimeInput = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

export default function HorariosPage() {
  const [hours, setHours] = useState<Hour[]>([]);
  const [ordersEnabled, setOrdersEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ hours: Hour[] }>("/api/admin/opening-hours"),
      api<{ settings: { ordersEnabled: boolean } }>("/api/admin/settings"),
    ])
      .then(([h, s]) => {
        setHours(h.hours);
        setOrdersEnabled(s.settings.ordersEnabled);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const update = (weekday: number, patch: Partial<Hour>) =>
    setHours((current) =>
      current.map((hour) => (hour.weekday === weekday ? { ...hour, ...patch } : hour)),
    );

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api("/api/admin/opening-hours", { method: "PUT", body: hours });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  async function togglePause(value: boolean) {
    setOrdersEnabled(value);
    setError(null);
    try {
      await api("/api/admin/settings", { method: "PATCH", body: { ordersEnabled: value } });
    } catch (err) {
      setOrdersEnabled(!value);
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
    }
  }

  if (loading) return <EmptyState>Carregando…</EmptyState>;

  return (
    <>
      <PageHeader
        title="Horários"
        description="Fora deste horário o site bloqueia o envio de pedidos. O cardápio continua visível."
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {saved && (
        <div className="mb-4">
          <Notice tone="success">
            Horários salvos. O site reflete a mudança em até 30 segundos, sem precisar publicar
            nada.
          </Notice>
        </div>
      )}

      <Card className="mb-6">
        <Toggle
          checked={!ordersEnabled}
          onChange={(paused) => togglePause(!paused)}
          label="Pausar pedidos agora"
          hint="Use quando a cozinha lotar. Derruba o botão mesmo dentro do horário."
        />
      </Card>

      <Card className="mb-6 p-0">
        <ul className="divide-y divide-line">
          {DISPLAY_ORDER.map((weekday) => {
            const hour = hours.find((h) => h.weekday === weekday);
            if (!hour) return null;

            const crossesMidnight = hour.closesAtMin > 1440;

            return (
              <li key={weekday} className="flex flex-wrap items-center gap-4 p-4">
                <span className="w-32 shrink-0 font-semibold capitalize">
                  {WEEKDAY_NAMES[weekday]}
                </span>

                <div className="w-36">
                  <Toggle
                    checked={!hour.closed}
                    onChange={(open) => update(weekday, { closed: !open })}
                    label={hour.closed ? "Fechado" : "Aberto"}
                  />
                </div>

                {!hour.closed && (
                  <div className="flex flex-wrap items-center gap-2">
                    <TextInput
                      type="time"
                      value={toTimeInput(hour.opensAtMin)}
                      onChange={(e) =>
                        update(weekday, { opensAtMin: fromTimeInput(e.target.value) })
                      }
                      aria-label={`Abertura de ${WEEKDAY_NAMES[weekday]}`}
                      className="w-32"
                    />
                    <span className="text-muted">às</span>
                    <TextInput
                      type="time"
                      value={toTimeInput(hour.closesAtMin)}
                      onChange={(e) => {
                        const minutes = fromTimeInput(e.target.value);
                        // Fechar antes de abrir só faz sentido virando o dia
                        update(weekday, {
                          closesAtMin: minutes <= hour.opensAtMin ? minutes + 1440 : minutes,
                        });
                      }}
                      aria-label={`Fechamento de ${WEEKDAY_NAMES[weekday]}`}
                      className="w-32"
                    />
                    {crossesMidnight && (
                      <span className="text-xs text-accent">
                        fecha {formatMinutes(hour.closesAtMin)} do dia seguinte
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Button onClick={save} loading={saving}>
        <Check className="size-4" aria-hidden />
        Salvar horários
      </Button>
    </>
  );
}
