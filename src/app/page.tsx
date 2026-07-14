import Link from "next/link";
import { AuthStatus } from "@/components/auth/auth-status";

const features = [
  { number: "01", title: "仲間を見つける", description: "プレイスタイルや目的の合うプレイヤーと、安心してチームを組めます。" },
  { number: "02", title: "信頼を確認する", description: "コミュニティの評価をもとに、マッチ前にプレイヤーの信頼性を確認できます。" },
  { number: "03", title: "健全な環境を育てる", description: "適切な報告と透明性のある仕組みで、悪意ある行動や誤報を抑えます。" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#071019] text-[#f4f1e8]">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_72%_18%,rgba(21,112,128,0.24),transparent_30%),radial-gradient(circle_at_15%_55%,rgba(201,155,63,0.10),transparent_25%)]" />
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-[#e7d19a] uppercase">
            <span className="grid size-10 place-items-center rounded-xl border border-[#c99b3f]/40 bg-[#c99b3f]/10 text-lg">R</span>
            <span className="hidden sm:inline">Rift Trust</span>
          </Link>
          <AuthStatus />
        </nav>

        <section className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:py-24">
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] text-[#3fb6c5] uppercase">League of Legends JP community</p>
            <h1 className="mt-6 max-w-3xl text-5xl leading-[1.08] font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              信頼できる仲間と、<br /><span className="text-[#e7d19a]">もっと良い一戦を。</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-slate-400 sm:text-lg">
              Rift Trustは、プレイヤー同士の信頼を可視化し、安心して仲間を探せるLoLコミュニティです。
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="flex h-13 items-center justify-center rounded-xl bg-[#c99b3f] px-7 text-sm font-bold text-[#071019] transition hover:bg-[#dfb756]">無料で始める</Link>
              <Link href="/login" className="flex h-13 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-7 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.06]">ログインする</Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute inset-6 rounded-full bg-[#147383]/15 blur-3xl" />
            <div className="relative aspect-square rounded-full border border-[#c99b3f]/15 p-7">
              <div className="grid h-full place-items-center rounded-full border border-[#3fb6c5]/20 bg-[#0b1722]/70 p-8 backdrop-blur-sm">
                <div className="text-center">
                  <p className="text-xs tracking-[0.3em] text-slate-500 uppercase">Community trust</p>
                  <p className="mt-4 text-7xl font-light tracking-tight text-[#e7d19a]">100</p>
                  <p className="mt-2 text-sm text-slate-400">信頼は、良いプレイから育つ。</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="border-t border-white/10 bg-[#09131d]">
        <div className="mx-auto grid max-w-7xl divide-y divide-white/10 px-5 sm:px-8 lg:grid-cols-3 lg:divide-x lg:divide-y-0 lg:px-12">
          {features.map((feature) => (
            <article key={feature.number} className="py-10 lg:px-9 lg:py-14 first:lg:pl-0 last:lg:pr-0">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#3fb6c5]">{feature.number}</p>
              <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
