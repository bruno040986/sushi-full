/**
 * Rate limit em memória, por IP.
 *
 * Limitação conhecida: em serverless o estado é por instância, então isto é
 * best-effort — segura flood acidental e script ingênuo, não um ataque
 * distribuído. Para o volume de um restaurante é suficiente; se um dia
 * precisar de garantia real, trocar por Upstash/Redis sem mudar a assinatura.
 */

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

/** Limpa entradas vencidas para o Map não crescer sem limite. */
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now);

  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  hit.count++;
  if (hit.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** IP do cliente atrás do proxy da Vercel. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
