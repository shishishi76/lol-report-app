"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Field, FormMessage, PasswordField, SubmitButton } from "./form-controls";
import {
  confirmUserRegistration,
  getAuthErrorMessage,
  registerUser,
  resendRegistrationCode,
} from "@/services/auth.service";

type Step = "register" | "confirm" | "complete";

const PASSWORD_REQUIREMENTS = [
  "8文字以上",
  "英大文字を1文字以上",
  "英小文字を1文字以上",
  "数字を1文字以上",
  "記号を1文字以上",
];

function meetsPasswordRequirements(password: string) {
  return password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

export function SignupForm() {
  const [step, setStep] = useState<Step>("register");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const nextEmail = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const passwordConfirmation = String(form.get("passwordConfirmation") ?? "");

    if (!meetsPasswordRequirements(password)) {
      setMessage("パスワードが下記の要件を満たしているか確認してください。");
      setPending(false);
      return;
    }

    if (password !== passwordConfirmation) {
      setMessage("確認用パスワードが一致しません。");
      setPending(false);
      return;
    }

    try {
      const result = await registerUser(nextEmail, password);
      setEmail(nextEmail.trim().toLowerCase());

      if (result.isSignUpComplete) {
        setStep("complete");
      } else {
        setStep("confirm");
        setSuccessMessage("確認コードをメールで送信しました。");
      }
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccessMessage("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const code = String(form.get("confirmationCode") ?? "");

    try {
      const result = await confirmUserRegistration(email, code);
      if (result.isSignUpComplete) setStep("complete");
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    setMessage("");
    setSuccessMessage("");
    setPending(true);

    try {
      await resendRegistrationCode(email);
      setSuccessMessage("新しい確認コードを送信しました。");
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (step === "complete") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
          <p className="font-semibold text-emerald-200">登録が完了しました</p>
          <p className="mt-2 text-sm leading-6 text-emerald-100/70">アカウントが有効になりました。ログインしてRift Trustを始めましょう。</p>
        </div>
        <Link href="/login" className="flex h-12 w-full items-center justify-center rounded-xl bg-[#c99b3f] text-sm font-bold text-[#09131d] transition hover:bg-[#dfb756]">ログインへ進む</Link>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <form onSubmit={handleConfirm} className="space-y-5">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
          送信先 <span className="ml-1 font-medium text-slate-200">{email}</span>
        </div>
        <Field id="confirmationCode" name="confirmationCode" type="text" inputMode="numeric" label="確認コード" hint="メールに記載されたコード" placeholder="123456" autoComplete="one-time-code" required disabled={pending} />
        {successMessage && <FormMessage tone="success">{successMessage}</FormMessage>}
        {message && <FormMessage>{message}</FormMessage>}
        <SubmitButton pending={pending}>メールアドレスを確認</SubmitButton>
        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={() => setStep("register")} disabled={pending} className="text-slate-500 hover:text-slate-300 disabled:opacity-50">入力をやり直す</button>
          <button type="button" onClick={handleResend} disabled={pending} className="font-semibold text-[#e7d19a] hover:underline disabled:opacity-50">コードを再送</button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-5">
      <Field id="email" name="email" type="email" label="メールアドレス" placeholder="you@example.com" autoComplete="email" required disabled={pending} />
      <PasswordField id="password" name="password" label="パスワード" hint="すべて必須" placeholder="パスワードを入力" autoComplete="new-password" minLength={8} aria-describedby="password-requirements" required disabled={pending} />
      <div id="password-requirements" className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
        <p className="text-xs font-medium text-slate-400">パスワードの要件</p>
        <ul className="mt-2 grid gap-x-4 gap-y-1.5 text-xs text-slate-500 sm:grid-cols-2">
          {PASSWORD_REQUIREMENTS.map((requirement) => (
            <li key={requirement} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[#3fb6c5]" />
              {requirement}
            </li>
          ))}
        </ul>
      </div>
      <PasswordField id="passwordConfirmation" name="passwordConfirmation" label="パスワード（確認）" placeholder="もう一度入力" autoComplete="new-password" minLength={8} required disabled={pending} />
      {message && <FormMessage>{message}</FormMessage>}
      <SubmitButton pending={pending}>アカウントを作成</SubmitButton>
      <p className="pt-2 text-center text-sm text-slate-500">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="font-semibold text-[#e7d19a] underline-offset-4 hover:underline">ログイン</Link>
      </p>
    </form>
  );
}
