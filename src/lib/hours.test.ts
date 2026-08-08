import { describe, expect, it } from "vitest";
import {
  formatMinutes,
  getStoreStatus,
  nowInTimezone,
  type OpeningHourDTO,
  weeklySchedule,
} from "@/lib/hours";

const TZ = "America/Sao_Paulo";

/** Grade real do SushiFull: terça a domingo, 18h–23h. Segunda fechado. */
const SUSHIFULL: OpeningHourDTO[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  closed: weekday === 1,
  opensAtMin: 18 * 60,
  closesAtMin: 23 * 60,
}));

/** Constrói um instante UTC. São Paulo é UTC-3 (sem horário de verão desde 2019). */
const utc = (iso: string) => new Date(iso);

describe("nowInTimezone", () => {
  it("converte UTC para o fuso da loja", () => {
    // 2026-08-12 é uma quarta-feira. 23:30 UTC = 20:30 em São Paulo.
    expect(nowInTimezone(utc("2026-08-12T23:30:00Z"), TZ)).toEqual({
      weekday: 3,
      minutes: 20 * 60 + 30,
    });
  });

  it("não deixa o dia da semana escorregar na virada UTC", () => {
    // 2026-08-13T02:00Z ainda é quarta 23h em São Paulo — não quinta.
    expect(nowInTimezone(utc("2026-08-13T02:00:00Z"), TZ)).toEqual({
      weekday: 3,
      minutes: 23 * 60,
    });
  });

  it("trata meia-noite como minuto 0, não 1440", () => {
    expect(nowInTimezone(utc("2026-08-13T03:00:00Z"), TZ).minutes).toBe(0);
  });
});

describe("getStoreStatus", () => {
  it("está aberto dentro da faixa", () => {
    // quarta, 20:00 em São Paulo
    const status = getStoreStatus(SUSHIFULL, utc("2026-08-12T23:00:00Z"), TZ);
    expect(status.isOpen).toBe(true);
    expect(status.minutesUntilClose).toBe(180);
  });

  it("está fechado antes de abrir e aponta o horário de hoje", () => {
    // quarta, 15:00
    const status = getStoreStatus(SUSHIFULL, utc("2026-08-12T18:00:00Z"), TZ);
    expect(status.isOpen).toBe(false);
    expect(status.nextOpen?.label).toBe("Abrimos hoje às 18h");
  });

  it("no minuto exato do fechamento já está fechado", () => {
    // quarta, 23:00 em ponto
    expect(getStoreStatus(SUSHIFULL, utc("2026-08-13T02:00:00Z"), TZ).isOpen).toBe(false);
  });

  it("no minuto exato da abertura já está aberto", () => {
    // quarta, 18:00 em ponto
    expect(getStoreStatus(SUSHIFULL, utc("2026-08-12T21:00:00Z"), TZ).isOpen).toBe(true);
  });

  it("na segunda (fechado) aponta a terça", () => {
    // segunda, 20:00
    const status = getStoreStatus(SUSHIFULL, utc("2026-08-10T23:00:00Z"), TZ);
    expect(status.isOpen).toBe(false);
    expect(status.nextOpen?.label).toBe("Abrimos amanhã às 18h");
  });

  it("no domingo tarde da noite aponta a terça pelo nome", () => {
    // domingo, 23:30 — fechou às 23h; segunda é fechado, então pula para terça
    const status = getStoreStatus(SUSHIFULL, utc("2026-08-10T02:30:00Z"), TZ);
    expect(status.isOpen).toBe(false);
    expect(status.nextOpen?.label).toBe("Abrimos terça-feira às 18h");
  });

  describe("travessia da meia-noite", () => {
    // Sexta abre 18h e fecha 00h30 do sábado → closesAtMin 1470
    const lateFriday: OpeningHourDTO[] = SUSHIFULL.map((h) =>
      h.weekday === 5 ? { ...h, closesAtMin: 24 * 60 + 30 } : h,
    );

    it("continua aberto às 00h10 de sábado", () => {
      // sábado 00:10 em São Paulo = 03:10Z
      const status = getStoreStatus(lateFriday, utc("2026-08-15T03:10:00Z"), TZ);
      expect(status.isOpen).toBe(true);
      expect(status.minutesUntilClose).toBe(20);
    });

    it("fecha às 00h30 em ponto", () => {
      expect(getStoreStatus(lateFriday, utc("2026-08-15T03:30:00Z"), TZ).isOpen).toBe(false);
    });

    it("sem a regra, 00h10 cairia como fechado", () => {
      // Mesma hora, mas com a grade padrão (fecha 23h) → fechado
      expect(getStoreStatus(SUSHIFULL, utc("2026-08-15T03:10:00Z"), TZ).isOpen).toBe(false);
    });
  });

  it("com todos os dias fechados, não há próxima abertura", () => {
    const allClosed = SUSHIFULL.map((h) => ({ ...h, closed: true }));
    const status = getStoreStatus(allClosed, utc("2026-08-12T23:00:00Z"), TZ);
    expect(status.isOpen).toBe(false);
    expect(status.nextOpen).toBeNull();
  });

  it("o resultado não depende do fuso do processo", () => {
    const original = process.env.TZ;
    const instant = utc("2026-08-12T23:00:00Z");
    const reference = getStoreStatus(SUSHIFULL, instant, TZ);

    for (const tz of ["UTC", "America/New_York", "Asia/Tokyo"]) {
      process.env.TZ = tz;
      expect(getStoreStatus(SUSHIFULL, instant, TZ)).toEqual(reference);
    }
    process.env.TZ = original;
  });
});

describe("formatMinutes", () => {
  it("formata hora cheia e hora quebrada", () => {
    expect(formatMinutes(1080)).toBe("18h");
    expect(formatMinutes(1290)).toBe("21h30");
  });

  it("normaliza minutos além da meia-noite", () => {
    expect(formatMinutes(1470)).toBe("0h30");
  });
});

describe("weeklySchedule", () => {
  it("lista de segunda a domingo com o rótulo certo", () => {
    const schedule = weeklySchedule(SUSHIFULL);
    expect(schedule).toHaveLength(7);
    expect(schedule[0].short).toBe("Seg");
    expect(schedule[0].label).toBe("Fechado");
    expect(schedule[1].label).toBe("18h às 23h");
    expect(schedule[6].short).toBe("Dom");
  });
});
