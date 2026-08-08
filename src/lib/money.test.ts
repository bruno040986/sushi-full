import { describe, expect, it } from "vitest";
import {
  formatBRL,
  formatCents,
  formatCnpj,
  formatPhone,
  formatZip,
  isValidCnpj,
  isValidPhone,
  onlyDigits,
  parseBRLToCents,
} from "@/lib/money";

describe("formatCents / formatBRL", () => {
  it("formata com vírgula e dois decimais", () => {
    expect(formatCents(14770)).toBe("147,70");
    expect(formatBRL(3199)).toBe("R$ 31,99");
  });

  it("preenche centavos com zero à esquerda", () => {
    expect(formatCents(1005)).toBe("10,05");
    expect(formatCents(1050)).toBe("10,50");
  });

  it("lida com zero e negativo", () => {
    expect(formatCents(0)).toBe("0,00");
    expect(formatCents(-500)).toBe("-5,00");
  });

  it("não usa espaço não separável (evita hydration mismatch)", () => {
    expect(formatBRL(1000)).not.toContain(" ");
    expect(formatBRL(1000)).toBe("R$ 10,00");
  });

  it("não quebra com valor inválido", () => {
    expect(formatCents(Number.NaN)).toBe("0,00");
  });
});

describe("parseBRLToCents", () => {
  it("aceita os formatos que o usuário digita", () => {
    expect(parseBRLToCents("12,50")).toBe(1250);
    expect(parseBRLToCents("12.50")).toBe(1250);
    expect(parseBRLToCents("R$ 12,50")).toBe(1250);
    expect(parseBRLToCents("1.234,56")).toBe(123456);
  });

  it("sem separador decimal, trata como reais inteiros", () => {
    expect(parseBRLToCents("50")).toBe(5000);
    expect(parseBRLToCents("200")).toBe(20000);
  });

  it("devolve null quando não há dígito", () => {
    expect(parseBRLToCents("")).toBeNull();
    expect(parseBRLToCents("R$")).toBeNull();
  });
});

describe("telefone", () => {
  it("aplica a máscara progressivamente", () => {
    expect(formatPhone("61")).toBe("61");
    expect(formatPhone("6199")).toBe("(61) 99");
    expect(formatPhone("6199329")).toBe("(61) 9932-9");
    expect(formatPhone("61993292359")).toBe("(61) 99329-2359");
  });

  it("formata fixo de 10 dígitos", () => {
    expect(formatPhone("6133334444")).toBe("(61) 3333-4444");
  });

  it("valida celular e fixo, rejeita lixo", () => {
    expect(isValidPhone("(61) 99329-2359")).toBe(true);
    expect(isValidPhone("6133334444")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
    expect(isValidPhone("0199329235")).toBe(false); // DDD inválido
    expect(isValidPhone("61893292359")).toBe(false); // celular sem o 9
  });
});

describe("CNPJ", () => {
  it("aplica a máscara", () => {
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("valida os dígitos verificadores", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("rejeita repetição e tamanho errado", () => {
    expect(isValidCnpj("00000000000000")).toBe(false);
    expect(isValidCnpj("1122233300018")).toBe(false);
  });
});

describe("auxiliares", () => {
  it("onlyDigits remove tudo que não é número", () => {
    expect(onlyDigits("(61) 99329-2359")).toBe("61993292359");
  });

  it("formatZip aplica a máscara de CEP", () => {
    expect(formatZip("72878404")).toBe("72878-404");
    expect(formatZip("728")).toBe("728");
  });
});
