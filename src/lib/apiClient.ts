"use client";

import type { FieldErrors } from "@/components/admin/ui";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Cliente das rotas do painel.
 *
 * Trata os três casos que interessam ao formulário: 401 (sessão caiu),
 * 422 (erros por campo) e o resto. Sempre lança ApiError — quem chama só
 * precisa de um try/catch.
 */
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const { method = "GET", body, signal } = options;

  const response = await fetch(path, {
    method,
    signal,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    // A sessão expirou — mandar de volta ao login com o retorno preservado.
    window.location.href = `/admin/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError("Sessão expirada", 401);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.error ?? "Não foi possível concluir a operação",
      response.status,
      payload?.fieldErrors,
    );
  }

  return payload as T;
}

/** Envia arquivo para /api/admin/media (multipart, não JSON). */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/admin/media", { method: "POST", body: formData });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.error ?? "Falha no upload", response.status);
  }
  return { url: payload.asset.url };
}
