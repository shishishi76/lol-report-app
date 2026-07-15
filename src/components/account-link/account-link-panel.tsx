"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  getMyAccountLink,
  startAccountLink,
  verifyAccountLink,
  type AccountLink,
} from "@/services/account-link.service";

const WAITING_MESSAGE =
  "変更の反映には最大2分ほどかかる場合があります。少々お待ちください。";

export function AccountLinkPanel() {
  const [accountLink, setAccountLink] = useState<AccountLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const verificationController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getMyAccountLink(controller.signal)
      .then(setAccountLink)
      .catch((cause) => {
        if (!isAbortError(cause)) {
          setError(getErrorMessage(cause, "連携状態を取得できませんでした。"));
        }
      })
      .finally(() => setLoading(false));

    return () => {
      controller.abort();
      verificationController.current?.abort();
    };
  }, []);

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStarting(true);
    setError("");
    setMessage("");

    const form = new FormData(event.currentTarget);

    try {
      const result = await startAccountLink(
        String(form.get("gameName") ?? ""),
        String(form.get("tagLine") ?? ""),
      );
      setAccountLink(result);
    } catch (cause) {
      setError(getErrorMessage(cause, "本人確認を開始できませんでした。"));
    } finally {
      setStarting(false);
    }
  }

  async function handleVerify() {
    if (!accountLink || accountLink.status !== "PENDING") return;

    if (Date.now() >= Date.parse(accountLink.expiresAt)) {
      setError("本人確認の有効期限が切れました。もう一度やり直してください。");
      setAccountLink({ status: "UNLINKED" });
      return;
    }

    const controller = new AbortController();
    verificationController.current?.abort();
    verificationController.current = controller;
    setVerifying(true);
    setError("");
    setMessage(WAITING_MESSAGE);

    try {
      while (!controller.signal.aborted) {
        const result = await verifyAccountLink(
          accountLink.challengeId,
          controller.signal,
        );

        if (result.status === "VERIFIED") {
          setAccountLink(result);
          setMessage("");
          return;
        }

        setMessage(WAITING_MESSAGE);

        if (Date.now() >= Date.parse(result.expiresAt)) {
          setError("本人確認の有効期限が切れました。もう一度やり直してください。");
          setMessage("");
          return;
        }

        await wait(result.retryAfterSeconds * 1000, controller.signal);
      }
    } catch (cause) {
      if (!isAbortError(cause)) {
        setError(getErrorMessage(cause, "本人確認に失敗しました。"));
        setMessage("");
        if (cause instanceof ApiError && cause.status === 410) {
          setAccountLink({ status: "UNLINKED" });
        }
      }
    } finally {
      if (!controller.signal.aborted) setVerifying(false);
      if (verificationController.current === controller) {
        verificationController.current = null;
      }
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1722]/90 p-7" aria-label="連携状態を確認中">
        <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
        <div className="mt-5 h-12 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  if (accountLink?.status === "VERIFIED") {
    return (
      <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-emerald-300 uppercase">Verified account</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          {accountLink.gameName}
          <span className="ml-2 text-base font-normal text-slate-400">#{accountLink.tagLine}</span>
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          LoLアカウントの本人確認が完了しています。このアカウントでレポートを投稿できます。
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {accountLink?.status === "PENDING" ? (
        <section className="rounded-2xl border border-[#3fb6c5]/20 bg-[#0b1722]/90 p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#3fb6c5] uppercase">Verification challenge</p>
          <h2 className="mt-3 text-xl font-semibold text-white">
            {accountLink.gameName}
            <span className="ml-2 text-sm font-normal text-slate-400">#{accountLink.tagLine}</span>
          </h2>
          <ol className="mt-6 space-y-3 text-sm leading-7 text-slate-300">
            <li>1. LoLクライアントを開きます。</li>
            <li>2. 現在とは異なるプロフィールアイコンへ変更します。</li>
            <li>3. 下のボタンを押すと、変更を自動で確認します。</li>
          </ol>
          <p className="mt-5 text-xs text-slate-500">
            有効期限: {new Date(accountLink.expiresAt).toLocaleString("ja-JP")}
          </p>
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c99b3f] text-sm font-bold text-[#071019] transition hover:bg-[#dfb756] disabled:cursor-wait disabled:opacity-70"
          >
            {verifying && <span className="size-4 animate-spin rounded-full border-2 border-[#071019]/30 border-t-[#071019]" />}
            {verifying ? "変更を確認しています..." : "変更を確認する"}
          </button>
        </section>
      ) : (
        <form onSubmit={handleStart} className="rounded-2xl border border-white/10 bg-[#0b1722]/90 p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-[1fr_0.42fr]">
            <label className="block text-sm font-medium text-slate-200">
              ゲーム名
              <input name="gameName" required disabled={starting} autoComplete="off" placeholder="Faker" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#3fb6c5]/70 focus:ring-4 focus:ring-[#3fb6c5]/10 disabled:opacity-60" />
            </label>
            <label className="block text-sm font-medium text-slate-200">
              タグライン
              <input name="tagLine" required disabled={starting} autoComplete="off" placeholder="JP1" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#3fb6c5]/70 focus:ring-4 focus:ring-[#3fb6c5]/10 disabled:opacity-60" />
            </label>
          </div>
          <button type="submit" disabled={starting} className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#c99b3f] text-sm font-bold text-[#071019] transition hover:bg-[#dfb756] disabled:cursor-wait disabled:opacity-60">
            {starting ? "本人確認を準備しています..." : "LoLアカウントを確認する"}
          </button>
        </form>
      )}

      {message && (
        <p role="status" className="rounded-xl border border-[#3fb6c5]/20 bg-[#3fb6c5]/10 px-4 py-3 text-sm leading-6 text-[#bdebf0]">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-200">
          {error}
        </p>
      )}
    </div>
  );
}

function getErrorMessage(cause: unknown, fallback: string) {
  return cause instanceof ApiError ? cause.message : fallback;
}

function isAbortError(cause: unknown) {
  return cause instanceof DOMException && cause.name === "AbortError";
}

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);

    signal.addEventListener("abort", handleAbort, { once: true });
  });
}
