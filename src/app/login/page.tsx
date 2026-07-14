import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="おかえりなさい"
      description="登録したメールアドレスとパスワードでログインしてください。"
    >
      <LoginForm />
    </AuthShell>
  );
}
