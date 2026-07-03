"use client";

import { useState } from "react";
import { signIn, signOut, getCurrentUser } from "aws-amplify/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");

  const handleSignIn = async () => {
    try {
      const result = await signIn({
        username: email,
        password,
      });

      setMessage(`ログイン成功: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error(error);
      setMessage("ログイン失敗");
    }
  };

  const handleCheckUser = async () => {
    try {
      const user = await getCurrentUser();
      setMessage(`ログイン中: ${user.username}`);
    } catch {
      setMessage("未ログインです");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setMessage("ログアウトしました");
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-2xl font-bold">ログイン</h1>

      <input
        className="mb-3 w-full rounded border p-2"
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="mb-3 w-full rounded border p-2"
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="mb-3 w-full rounded bg-blue-600 p-2 text-white" onClick={handleSignIn}>
        ログイン
      </button>

      <button className="mb-3 w-full rounded border p-2" onClick={handleCheckUser}>
        ログイン状態確認
      </button>

      <button className="w-full rounded border p-2" onClick={handleSignOut}>
        ログアウト
      </button>

      {message && <p className="mt-4 break-all">{message}</p>}
    </main>
  );
}