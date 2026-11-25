import Dashboard from "@/components/Dashboard";
import Settings from "@/components/Settings";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line/70 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {/* 品牌標誌：金色底的迷你走勢線 */}
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-[#a8884a] shadow-[0_4px_16px_-4px_rgba(212,182,118,0.6)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#0b0d12" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 17l5-6 4 3 8-9" />
                <path d="M15 5h5v5" />
              </svg>
            </span>
            <div className="leading-tight">
              <h1 className="text-base font-bold tracking-wide">我的股票摘要站</h1>
              <p className="text-[11px] text-faint">即時報價 · 籌碼 · 新聞</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted sm:flex">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-down" />
              即時連線中
            </span>
            <Settings />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Dashboard />
      </main>

      <footer className="border-t border-line/70 py-6 text-center text-xs text-faint">
        資料來源：證交所 TWSE、FinMind、Yahoo奇摩股市 ｜ 僅供參考，不構成投資建議
      </footer>
    </>
  );
}
