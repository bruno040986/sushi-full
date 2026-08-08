"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Field, Notice, TextInput } from "@/components/admin/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block">
          <Image
            src="/brand/logo.png"
            alt="SushiFull"
            width={648}
            height={442}
            priority
            className="mx-auto h-20 w-auto"
          />
        </Link>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-line bg-surface p-6"
        >
          <div>
            <h1 className="font-display text-xl font-black">Painel do restaurante</h1>
            <p className="mt-1 text-sm text-muted">Entre para gerenciar o cardápio e os pedidos.</p>
          </div>

          {error && <Notice tone="error">{error}</Notice>}

          <Field label="E-mail">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              autoFocus
              placeholder="voce@exemplo.com"
            />
          </Field>

          <Field label="Senha">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </Field>

          <Button type="submit" loading={loading} className="w-full">
            Entrar
          </Button>
        </form>

        <Link
          href="/"
          className="mt-6 block text-center text-sm text-muted transition hover:text-cream"
        >
          ← Voltar ao site
        </Link>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
