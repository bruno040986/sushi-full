/**
 * Aberto/fechado a partir da grade cadastrada no painel.
 *
 * Módulo puro: nenhum I/O, nenhum Date.now() interno. Quem chama passa o
 * instante — é o que torna a virada da meia-noite e o fuso testáveis.
 */

export type OpeningHourDTO = {
  /** 0 = domingo … 6 = sábado (mesma convenção de Date.getDay()) */
  weekday: number;
  closed: boolean;
  /** Minutos desde a meia-noite. 1080 = 18h */
  opensAtMin: number;
  /** Minutos desde a meia-noite. Acima de 1440 = fecha no dia seguinte */
  closesAtMin: number;
};

export type StoreStatus = {
  isOpen: boolean;
  /** Minutos até fechar, quando aberto */
  minutesUntilClose: number | null;
  /** Próxima abertura, quando fechado */
  nextOpen: { weekday: number; minutes: number; label: string } | null;
};

const MINUTES_PER_DAY = 1440;

/** Nomes fixos em PT-BR. `toLocaleDateString` varia por ICU e quebra hidratação. */
export const WEEKDAY_NAMES = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
] as const;

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

const INTL_WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Converte um instante para dia da semana + minutos NO FUSO DA LOJA.
 *
 * Nunca use date.getHours(): na Vercel o servidor roda em UTC, e 21h em São
 * Paulo é 00h UTC do dia seguinte — a grade leria a linha do dia errado.
 */
export function nowInTimezone(date: Date, timeZone: string): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  // hourCycle h23 pode devolver "24" à meia-noite em alguns ICUs
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));

  return {
    weekday: INTL_WEEKDAY_TO_INDEX[get("weekday")] ?? 0,
    minutes: hour * 60 + minute,
  };
}

/** "18h" ou "18h30" */
export function formatMinutes(totalMinutes: number): string {
  const normalized = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, "0")}`;
}

function byWeekday(hours: OpeningHourDTO[], weekday: number): OpeningHourDTO | undefined {
  return hours.find((h) => h.weekday === weekday);
}

export function getStoreStatus(
  hours: OpeningHourDTO[],
  now: Date,
  timeZone: string,
): StoreStatus {
  const { weekday, minutes } = nowInTimezone(now, timeZone);

  // Caso 1 — dentro da faixa de hoje
  const today = byWeekday(hours, weekday);
  if (today && !today.closed && minutes >= today.opensAtMin && minutes < today.closesAtMin) {
    return {
      isOpen: true,
      minutesUntilClose: today.closesAtMin - minutes,
      nextOpen: null,
    };
  }

  // Caso 2 — a faixa de ONTEM atravessou a meia-noite e ainda não terminou.
  // Sem isto, quem abre 18h e fecha 00h30 aparece fechado a partir de 00h01.
  const yesterday = byWeekday(hours, (weekday + 6) % 7);
  if (yesterday && !yesterday.closed && yesterday.closesAtMin > MINUTES_PER_DAY) {
    const minutesSinceYesterday = minutes + MINUTES_PER_DAY;
    if (
      minutesSinceYesterday >= yesterday.opensAtMin &&
      minutesSinceYesterday < yesterday.closesAtMin
    ) {
      return {
        isOpen: true,
        minutesUntilClose: yesterday.closesAtMin - minutesSinceYesterday,
        nextOpen: null,
      };
    }
  }

  return { isOpen: false, minutesUntilClose: null, nextOpen: findNextOpen(hours, weekday, minutes) };
}

/** Varre até 7 dias à frente procurando a próxima abertura. */
function findNextOpen(
  hours: OpeningHourDTO[],
  weekday: number,
  minutes: number,
): StoreStatus["nextOpen"] {
  for (let offset = 0; offset < 7; offset++) {
    const day = (weekday + offset) % 7;
    const entry = byWeekday(hours, day);
    if (!entry || entry.closed) continue;

    // No dia de hoje, só serve se a abertura ainda não passou
    if (offset === 0 && minutes >= entry.opensAtMin) continue;

    const time = formatMinutes(entry.opensAtMin);
    const label =
      offset === 0
        ? `Abrimos hoje às ${time}`
        : offset === 1
          ? `Abrimos amanhã às ${time}`
          : `Abrimos ${WEEKDAY_NAMES[day]} às ${time}`;

    return { weekday: day, minutes: entry.opensAtMin, label };
  }

  return null; // nenhum dia aberto na grade
}

/** Grade dos 7 dias na ordem seg→dom, para o rodapé. */
export function weeklySchedule(hours: OpeningHourDTO[]) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((weekday) => {
    const entry = byWeekday(hours, weekday);
    return {
      weekday,
      name: WEEKDAY_NAMES[weekday],
      short: WEEKDAY_SHORT[weekday],
      closed: !entry || entry.closed,
      label:
        !entry || entry.closed
          ? "Fechado"
          : `${formatMinutes(entry.opensAtMin)} às ${formatMinutes(entry.closesAtMin)}`,
    };
  });
}
