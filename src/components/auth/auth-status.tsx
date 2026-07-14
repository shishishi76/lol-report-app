"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuthenticatedUser, logoutUser } from "@/services/auth.service";

type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; label: string };

export function AuthStatus() {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    getAuthenticatedUser()
      .then((user) => {
        if (active) setAuthState({ status: "authenticated", label: user.email ?? user.username });
      })
      .catch(() => {
        if (active) setAuthState({ status: "guest" });
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await logoutUser();
    setAuthState({ status: "guest" });
  }

  if (authState.status === "loading") {
    return <div className="h-10 w-32 animate-pulse rounded-xl bg-white/5" aria-label="認証状態を確認中" />;
  }

  if (authState.status === "authenticated") {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden max-w-48 truncate text-xs text-slate-400 sm:block">{authState.label}</span>
        <Link href="/players" className="rounded-xl bg-[#c99b3f] px-4 py-2.5 text-sm font-bold text-[#071019] transition hover:bg-[#dfb756]">
          プレイヤー検索
        </Link>
        <button onClick={handleLogout} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5">
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white">ログイン</Link>
      <Link href="/signup" className="rounded-xl bg-[#c99b3f] px-4 py-2.5 text-sm font-bold text-[#071019] transition hover:bg-[#dfb756]">新規登録</Link>
    </div>
  );
}
