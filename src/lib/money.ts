/**
 * Dinheiro em centavos (Int) do banco até a tela.
 *
 * A formatação é MANUAL de propósito. `Intl.NumberFormat` com
 * `style: "currency"` emite U+00A0 (espaço não separável) em algumas versões
 * do ICU e espaço comum em outras — o que produz hydration mismatch entre o
 * Node do servidor e o browser do cliente.
 */

/** 12345 → "12,34" */
export function formatCents(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0;
  const sign = safe < 0 ? "-" : "";
  const abs = Math.abs(safe);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

/** 12345 → "R$ 123,45" */
export function formatBRL(cents: number): string {
  return `R$ ${formatCents(cents)}`;
}

/** Só os dígitos de uma string. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Converte o que o usuário digitou num campo de dinheiro para centavos.
 * Aceita "12,50", "12.50", "R$ 12,50", "1.234,56" e "1234".
 * Retorna null se não sobrar nenhum dígito.
 */
export function parseBRLToCents(input: string): number | null {
  const digits = onlyDigits(input);
  if (!digits) return null;

  // Sem separador decimal explícito, trata como reais inteiros.
  const hasDecimalSeparator = /[.,]\d{1,2}$/.test(input.trim());
  if (!hasDecimalSeparator) return Number(digits) * 100;

  const cents = Number(digits);
  return Number.isFinite(cents) ? cents : null;
}

/** Máscara progressiva de telefone: (61) 99329-2359 / (61) 3333-2359 */
export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Telefone brasileiro válido: DDD (11–99) + 8 ou 9 dígitos. */
export function isValidPhone(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11) return false;
  // Celular (11 dígitos) sempre começa com 9 depois do DDD
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

/** Máscara de CNPJ: 00.000.000/0000-00 */
export function formatCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Validação dos dois dígitos verificadores do CNPJ. */
export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false; // 00000000000000 e afins

  const checkDigit = (length: number): number => {
    let weight = length - 7;
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(d[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return checkDigit(12) === Number(d[12]) && checkDigit(13) === Number(d[13]);
}

/** Máscara de CEP: 00000-000 */
export function formatZip(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}
