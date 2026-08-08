"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

/** Erros por campo devolvidos pelas rotas (422). */
export type FieldErrors = Record<string, string[] | undefined>;

export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-cream placeholder:text-faint focus:border-brand focus:outline-none disabled:opacity-50";

export function Field({
  label,
  hint,
  optional,
  error,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string[];
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">
        {label}
        {optional && <span className="ml-1 font-normal text-faint">(opcional)</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-faint">{hint}</span>}
      {error?.length ? (
        <span className="mt-1 block text-xs text-danger">{error[0]}</span>
      ) : null}
    </label>
  );
}

export function TextInput({
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: string[] }) {
  return (
    <input
      {...props}
      className={`${inputClass} ${error?.length ? "border-danger" : ""} ${props.className ?? ""}`}
    />
  );
}

export function Select({
  error,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: string[] }) {
  return (
    <select
      {...props}
      className={`${inputClass} ${error?.length ? "border-danger" : ""} ${props.className ?? ""}`}
    >
      {children}
    </select>
  );
}

/** Interruptor com rótulo — mais legível que checkbox numa tela de config. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 h-6 w-11 shrink-0 rounded-full p-0.5 transition ${
          checked ? "bg-brand" : "bg-surface-3"
        }`}
      >
        <span
          className={`block size-5 rounded-full bg-white transition ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Button({
  loading,
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
  children: ReactNode;
}) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-strong",
    ghost: "border border-line text-cream hover:border-brand hover:text-brand",
    danger: "border border-danger/40 text-danger hover:bg-danger/10",
  }[variant];

  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** Aviso de sucesso ou erro no topo de um formulário. */
export function Notice({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  const Icon = tone === "success" ? Check : AlertCircle;
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${
        tone === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-black">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line bg-surface/50 p-8 text-center text-sm text-muted">
      {children}
    </p>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "brand";
  children: ReactNode;
}) {
  const styles = {
    neutral: "bg-surface-3 text-muted",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
    brand: "bg-brand/15 text-brand",
  }[tone];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}
