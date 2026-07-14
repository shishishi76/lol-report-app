import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export function AuthShell({ children, eyebrow, title, description }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071019] px-5 py-12 text-[#f4f1e8]">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_20%_15%,rgba(21,112,128,0.28),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(201,155,63,0.16),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:48px_48px]" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1722]/95 shadow-2xl shadow-black/50 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden min-h-[680px] flex-col justify-between overflow-hidden border-r border-white/10 bg-[#09131d] p-12 lg:flex">
          <div className="absolute -left-28 top-36 h-80 w-80 rounded-full border border-[#c99b3f]/20" />
          <div className="absolute -left-16 top-48 h-56 w-56 rounded-full border border-[#c99b3f]/15" />
          <Link href="/" className="relative flex items-center gap-3 text-sm font-semibold tracking-[0.22em] text-[#e7d19a] uppercase">
            <span className="grid size-10 place-items-center rounded-xl border border-[#c99b3f]/40 bg-[#c99b3f]/10 text-lg">R</span>
            Rift Trust
          </Link>

          <div className="relative">
            <p className="mb-5 text-xs font-semibold tracking-[0.28em] text-[#3fb6c5] uppercase">Play with confidence</p>
            <p className="max-w-sm text-4xl leading-tight font-semibold tracking-tight">
              信頼できる仲間と、<br />次の一戦へ。
            </p>
            <p className="mt-6 max-w-sm text-sm leading-7 text-slate-400">
              プレイヤー同士の健全なつながりを育て、安心してチームを組める場所をつくります。
            </p>
          </div>

          <p className="relative text-xs text-slate-600">League of Legends JP community service</p>
        </aside>

        <div className="flex min-h-[680px] items-center px-6 py-12 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <Link href="/" className="mb-12 inline-flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-[#e7d19a] uppercase lg:hidden">
              <span className="grid size-9 place-items-center rounded-xl border border-[#c99b3f]/40 bg-[#c99b3f]/10">R</span>
              Rift Trust
            </Link>
            <p className="text-xs font-semibold tracking-[0.25em] text-[#3fb6c5] uppercase">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-4 text-sm leading-6 text-slate-400">{description}</p>
            <div className="mt-9">{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
