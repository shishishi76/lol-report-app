import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "新規登録" };

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Create account"
      title="Rift Trustを始める"
      description="安心して仲間を探せるコミュニティへ参加しましょう。登録後、メールで本人確認を行います。"
    >
      <SignupForm />
    </AuthShell>
  );
}
