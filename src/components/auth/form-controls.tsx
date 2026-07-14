"use client";

import { useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, id, ...props }: FieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 flex items-center justify-between text-sm font-medium text-slate-200">
        {label}
        {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
      </span>
      <input
        id={id}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#3fb6c5]/70 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#3fb6c5]/10 disabled:cursor-not-allowed disabled:opacity-60"
        {...props}
      />
    </label>
  );
}

type PasswordFieldProps = Omit<FieldProps, "type">;

export function PasswordField({ label, hint, id, ...props }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 flex items-center justify-between text-sm font-medium text-slate-200">
        {label}
        {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
      </span>
      <span className="relative block">
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#3fb6c5]/70 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#3fb6c5]/10 disabled:cursor-not-allowed disabled:opacity-60"
          {...props}
        />
        <button
          type="button"
          aria-label={isVisible ? `${label}を隠す` : `${label}を表示する`}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
          disabled={props.disabled}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 transition hover:text-slate-200 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-[#3fb6c5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isVisible ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.3A10.8 10.8 0 0112 4c5.5 0 9 5.5 9 5.5a15.7 15.7 0 01-2.1 2.8M6.6 6.6C4.3 8.1 3 10 3 10s3.5 5.5 9 5.5a10 10 0 003.1-.5" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          )}
        </button>
      </span>
    </label>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-[#c99b3f] px-5 text-sm font-bold text-[#09131d] transition hover:bg-[#dfb756] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfb756] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "処理中..." : children}
    </button>
  );
}

export function FormMessage({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" }) {
  const styles = tone === "success"
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
    : "border-rose-400/20 bg-rose-400/10 text-rose-200";

  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm leading-6 ${styles}`}>
      {children}
    </p>
  );
}
