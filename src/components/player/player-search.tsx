"use client";

import { FormEvent, useState } from "react";
import { ApiError } from "@/lib/api";
import { getPlayer, type Player } from "@/services/player.service";

export function PlayerSearch() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPlayer(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const gameName = String(form.get("gameName") ?? "");
    const tagLine = String(form.get("tagLine") ?? "");

    try {
      setPlayer(await getPlayer(gameName, tagLine));
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("プレイヤーの取得に失敗しました。時間をおいてもう一度お試しください。");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-[#0b1722]/90 p-5 shadow-xl shadow-black/20 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-[1fr_0.42fr]">
          <label className="block text-sm font-medium text-slate-200">
            ゲーム名
            <input
              name="gameName"
              placeholder="Faker"
              autoComplete="off"
              required
              disabled={pending}
              className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#3fb6c5]/70 focus:ring-4 focus:ring-[#3fb6c5]/10 disabled:opacity-60"
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            タグライン
            <input
              name="tagLine"
              placeholder="JP1"
              autoComplete="off"
              required
              disabled={pending}
              className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm uppercase text-white outline-none transition placeholder:text-slate-600 focus:border-[#3fb6c5]/70 focus:ring-4 focus:ring-[#3fb6c5]/10 disabled:opacity-60"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#c99b3f] text-sm font-bold text-[#071019] transition hover:bg-[#dfb756] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "検索中..." : "プレイヤーを検索"}
        </button>
      </form>

      {message && (
        <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-200">{message}</p>
      )}

      {player && (
        <article className="rounded-2xl border border-[#c99b3f]/20 bg-[#0b1722]/90 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-[#3fb6c5] uppercase">Player found</p>
              <h2 className="mt-3 text-2xl font-semibold">{player.gameName}<span className="ml-2 text-base font-normal text-slate-500">#{player.tagLine}</span></h2>
            </div>
            {typeof player.trustScore === "number" && (
              <div className="text-right">
                <p className="text-xs text-slate-500">Trust score</p>
                <p className="mt-1 text-3xl font-light text-[#e7d19a]">{player.trustScore}</p>
              </div>
            )}
          </div>
          <dl className="mt-7 border-t border-white/10 pt-5">
            <dt className="text-xs text-slate-500">PUUID</dt>
            <dd className="mt-2 break-all font-mono text-xs leading-6 text-slate-300">{player.puuid}</dd>
          </dl>
        </article>
      )}
    </div>
  );
}
