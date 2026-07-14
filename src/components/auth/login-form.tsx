"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Field, FormMessage, PasswordField, SubmitButton } from "./form-controls";
import { getAuthErrorMessage, loginUser } from "@/services/auth.service";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const result = await loginUser(email, password);

      if (result.isSignedIn) {
        router.push("/");
        router.refresh();
        return;
      }

      if (result.nextStep.signInStep === "CONFIRM_SIGN_UP") {
        setMessage("メールアドレスの確認が必要です。新規登録画面で確認コードを入力してください。");
      } else if (result.nextStep.signInStep === "RESET_PASSWORD") {
        setMessage("パスワードの再設定が必要です。管理者にお問い合わせください。");
      } else {
        setMessage("追加の認証操作が必要です。現在この認証方式には対応していません。");
      }
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field id="email" name="email" type="email" label="メールアドレス" placeholder="you@example.com" autoComplete="email" required disabled={pending} />
      <PasswordField id="password" name="password" label="パスワード" placeholder="パスワードを入力" autoComplete="current-password" required disabled={pending} />
      {message && <FormMessage>{message}</FormMessage>}
      <SubmitButton pending={pending}>ログイン</SubmitButton>
      <p className="pt-2 text-center text-sm text-slate-500">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="font-semibold text-[#e7d19a] underline-offset-4 hover:underline">新規登録</Link>
      </p>
    </form>
  );
}
