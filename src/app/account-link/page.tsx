import type { Metadata } from "next";
import Link from "next/link";
import { AccountLinkPanel } from "@/components/account-link/account-link-panel";

export const metadata: Metadata = { title: "LoLアカウント連携" };

export default function AccountLinkPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071019] px-5 py-8 text-[#f4f1e8] sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_70%_10%,rgba(21,112,128,0.24),transparent_32%),radial-gradient(circle_at_15%_80%,rgba(201,155,63,0.12),transparent_28%)]" />
      <div className="relative mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-[#e7d19a] uppercase">
            <span className="grid size-10 place-items-center rounded-xl border border-[#c99b3f]/40 bg-[#c99b3f]/10 text-lg">R</span>
            <span className="hidden sm:inline">Rift Trust</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-400 transition hover:text-white">トップへ戻る</Link>
        </header>

        <section className="mx-auto max-w-2xl py-16 sm:py-24">
          <p className="text-xs font-semibold tracking-[0.25em] text-[#3fb6c5] uppercase">Account verification</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">LoLアカウント連携</h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
            レポートを投稿するには、Rift Trustアカウントと本人所有のLoLアカウントを連携してください。
          </p>
          <div className="mt-10">
            <AccountLinkPanel />
          </div>
        </section>
      </div>
    </main>
  );
}
