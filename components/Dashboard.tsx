"use client";

import { useCallback, useEffect, useId, useState } from "react";
import StockView from "@/components/StockView";
import NewsList from "@/components/NewsList";
import AiAnalysis from "@/components/AiAnalysis";
import { arrow, bgOf, colorOf, fmt } from "@/lib/format";

const REFRESH_MS = 5000;

type WatchItem = { code: string; name: string };
type Quote = {
  code: string; name: string; time: string;
  price: number | null; prevClose: number | null; change: number | null; changePercent: number | null;
  high: number | null; low: number | null; volume: number | null;
};
type Bar = { date: string; close: number };

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-4 w-1 rounded-full bg-accent" />
      <h2 className="text-sm font-semibold tracking-wide">{children}</h2>
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </div>
  );
}

function Sparkline({ data, up }: { data: Bar[]; up: boolean }) {
  const id = useId();
  if (data.length < 2) return <div className="h-14 animate-pulse rounded-lg bg-white/[0.03]" />;
  const W = 200, H = 56;
  const closes = data.map((d) => d.close);
  const min = Math.min(...closes), max = Math.max(...closes);
  const pts = closes.map((v, i) => [(i / (closes.length - 1)) * W, H - 6 - ((v - min) / (max - min || 1)) * (H - 12)]);
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  const color = up ? "var(--color-up)" : "var(--color-down)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Dashboard() {
  const [list, setList] = useState<WatchItem[] | null>(null); // null = 還在載入
  const [listError, setListError] = useState("");
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [spark, setSpark] = useState<Record<string, Bar[]>>({});
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");

  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // 從資料庫載入追蹤清單
  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) return setListError(j.error);
        setList(j.items);
        setSelected((s) => s || j.items[0]?.code || "");
      })
      .catch((e) => setListError(e.message));
  }, []);

  const codes = list?.map((w) => w.code).join(",") ?? "";

  // 即時報價：整份清單一次查，每 5 秒輪詢我們自己的後端 API
  useEffect(() => {
    if (!codes) return;
    let alive = true;
    const load = () =>
      fetch(`/api/twse/realtime?codes=${codes}`)
        .then((r) => r.json())
        .then((j) => {
          if (!alive) return;
          if (j.error) return setError(j.error);
          setQuotes(Object.fromEntries((j.quotes as Quote[]).map((q) => [q.code, q])));
          setError("");
        })
        .catch((e) => alive && setError(e.message));
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, [codes]);

  // 迷你走勢圖：近 60 天收盤價，每檔只載入一次
  useEffect(() => {
    list?.forEach(({ code }) => {
      if (spark[code]) return;
      fetch(`/api/finmind/history?code=${code}&days=60`)
        .then((r) => r.json())
        .then((h) => !h.error && setSpark((s) => ({ ...s, [code]: h.data })))
        .catch(() => {});
    });
  }, [list, spark]);

  const addStock = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const code = input.trim();
    if (!code) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "新增失敗");
      setList((l) => [...(l ?? []), j]);
      setSelected(j.code);
      setInput("");
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }, [input]);

  async function removeStock(code: string) {
    setAddError("");
    try {
      const res = await fetch(`/api/watchlist/${code}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "移除失敗");
      const rest = (list ?? []).filter((w) => w.code !== code);
      setList(rest);
      if (selected === code) setSelected(rest[0]?.code ?? "");
    } catch (err) {
      setAddError((err as Error).message);
    }
  }

  const latestTime = Object.values(quotes)[0]?.time;
  const selectedName = list?.find((w) => w.code === selected)?.name;

  return (
    <div className="flex flex-col gap-12">
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionTitle>監控清單</SectionTitle>
            <p className="-mt-2 ml-4 text-xs text-faint">
              {latestTime ? `最後更新 ${latestTime} · 每 ${REFRESH_MS / 1000} 秒自動刷新` : " "}
              {error && <span className="text-up">　報價更新失敗：{error}</span>}
            </p>
          </div>

          <form onSubmit={addStock} className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 transition focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/10">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-faint" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="輸入股票代號，如 2330"
                maxLength={6}
                aria-label="股票代號"
                className="w-44 bg-transparent py-2.5 text-sm outline-none placeholder:text-faint"
              />
            </div>
            <button
              type="submit"
              disabled={adding || !input.trim()}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {adding ? "新增中…" : "加入追蹤"}
            </button>
          </form>
        </div>

        {addError && (
          <p className="mb-4 rounded-lg border border-up/30 bg-up/10 px-3 py-2 text-sm text-up">{addError}</p>
        )}

        {listError ? (
          <p className="rounded-xl border border-up/30 bg-up/10 p-4 text-up">追蹤清單載入失敗：{listError}</p>
        ) : list === null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl border border-line bg-surface" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
            <p className="text-lg font-medium">還沒有追蹤任何股票</p>
            <p className="mt-1 text-sm text-muted">在右上方輸入股票代號（例如 2330、0050），就能加入追蹤清單。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(({ code, name }, i) => {
              const q = quotes[code];
              const active = code === selected;
              return (
                <div key={code} className="fade-up group relative" style={{ animationDelay: `${i * 50}ms` }}>
                  <button
                    onClick={() => setSelected(code)}
                    aria-pressed={active}
                    className={`w-full rounded-2xl border p-5 text-left transition duration-200 ${
                      active
                        ? "border-accent/60 bg-gradient-to-b from-surface-2 to-surface shadow-[0_8px_32px_-12px_rgba(212,182,118,0.35)]"
                        : "border-line bg-surface hover:-translate-y-0.5 hover:border-faint/60 hover:bg-surface-2"
                    }`}
                  >
                    <div className="flex items-center gap-2 pr-7">
                      <span className="font-semibold">{q?.name ?? name}</span>
                      <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-muted">{code}</span>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <span className={`text-[2rem] font-bold leading-none tracking-tight ${colorOf(q?.change ?? null)}`}>
                        {fmt(q?.price ?? null)}
                      </span>
                      {q?.change != null && (
                        <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${bgOf(q.change)}`}>
                          {arrow(q.change)} {Math.abs(q.change)}　{q.changePercent}%
                        </span>
                      )}
                    </div>
                    <div className="mt-4"><Sparkline data={spark[code] ?? []} up={(q?.change ?? 0) >= 0} /></div>
                    <div className="mt-3 flex justify-between border-t border-line/70 pt-3 text-xs text-muted">
                      <span>高 <b className="font-medium text-fg">{fmt(q?.high ?? null)}</b></span>
                      <span>低 <b className="font-medium text-fg">{fmt(q?.low ?? null)}</b></span>
                      <span>量 <b className="font-medium text-fg">{fmt(q?.volume ?? null)}</b> 張</span>
                    </div>
                  </button>
                  <button
                    onClick={() => removeStock(code)}
                    aria-label={`移除 ${name}`}
                    title="從追蹤清單移除"
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-faint opacity-0 transition hover:bg-up/15 hover:text-up focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                  <AiAnalysis code={code} name={q?.name ?? name} quote={q} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selected && (
        <>
          <section>
            <SectionTitle hint="點上方卡片切換">個股詳情 · {selectedName}</SectionTitle>
            <StockView key={selected} code={selected} />
          </section>

          <section>
            <SectionTitle>相關新聞</SectionTitle>
            <NewsList key={selected} code={selected} />
          </section>
        </>
      )}
    </div>
  );
}
