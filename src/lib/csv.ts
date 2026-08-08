/**
 * Leitura e escrita de CSV pensadas para o Excel em português.
 *
 * Três detalhes que, sem eles, o dono abre a planilha e vê tudo errado:
 *  - separador `;` (o Excel pt-BR usa vírgula como decimal, então `,` quebra)
 *  - BOM UTF-8 no início (sem ele, "Ceviche de tilápia" vira "tilÃ¡pia")
 *  - dinheiro com vírgula decimal ("49,90"), não ponto
 */

export const CSV_SEPARATOR = ";";
const BOM = "﻿";

/** Escapa um valor: aspas duplas quando contém separador, aspas ou quebra. */
function escapeCell(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  if (text.includes(CSV_SEPARATOR) || text.includes('"') || /[\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.join(CSV_SEPARATOR)];
  for (const row of rows) lines.push(row.map(escapeCell).join(CSV_SEPARATOR));
  // \r\n porque o Excel do Windows engasga com \n sozinho
  return BOM + lines.join("\r\n");
}

/**
 * Parser de CSV que respeita aspas e quebras de linha dentro de célula.
 * Aceita `;` ou `,` como separador — detecta pelo cabeçalho.
 */
export function parseCsv(input: string): Record<string, string>[] {
  const text = input.replace(/^﻿/, "");
  if (!text.trim()) return [];

  const separator = detectSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];

  const headers = headerRow.map((h) => h.trim());

  return dataRows
    .filter((cells) => cells.some((value) => value.trim() !== ""))
    .map((cells) =>
      Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? "").trim()])),
    );
}

/** Conta separadores fora de aspas na primeira linha. */
function detectSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

// ─── Conversões de valor ─────────────────────────────────────────────────────

/** 4990 → "49,90" — como o Excel pt-BR espera. */
export function centsToCsv(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * "49,90" | "49.90" | "R$ 49,90" | "1.234,56" → centavos.
 * Retorna null quando a célula está vazia; undefined quando é inválida.
 */
export function csvToCents(value: string): number | null | undefined {
  const text = value.trim();
  if (!text) return null;

  const digits = text.replace(/[^\d,.-]/g, "");
  if (!digits) return undefined;

  // Último separador manda: em "1.234,56" é a vírgula; em "1,234.56" é o ponto
  const lastComma = digits.lastIndexOf(",");
  const lastDot = digits.lastIndexOf(".");
  const decimalAt = Math.max(lastComma, lastDot);

  let normalized: string;
  if (decimalAt === -1) {
    normalized = digits;
  } else {
    const whole = digits.slice(0, decimalAt).replace(/[.,]/g, "");
    const fraction = digits.slice(decimalAt + 1).replace(/[.,]/g, "");
    normalized = `${whole}.${fraction}`;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

/** "1" | "sim" | "true" | "x" → true. Vazio → o padrão informado. */
export function csvToBoolean(value: string, fallback: boolean): boolean {
  const text = value.trim().toLowerCase();
  if (!text) return fallback;
  return ["1", "sim", "s", "true", "verdadeiro", "x", "ativo"].includes(text);
}

export const booleanToCsv = (value: boolean) => (value ? "1" : "0");

/** Número inteiro opcional. undefined quando a célula é inválida. */
export function csvToInt(value: string): number | null | undefined {
  const text = value.trim();
  if (!text) return null;
  const parsed = Number(text.replace(/[^\d-]/g, ""));
  if (!Number.isFinite(parsed)) return undefined;
  return Math.trunc(parsed);
}

// ─── Resultado de uma importação ─────────────────────────────────────────────

export type ImportIssue = { line: number; message: string };

export type ImportPreview<T = unknown> = {
  create: T[];
  update: T[];
  unchanged: number;
  errors: ImportIssue[];
};
