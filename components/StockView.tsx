"use client";

import { useEffect, useId, useState } from "react";
import { arrow, bgOf, colorOf, fmt, signed } from "@/lib/format";

type Realtime = {
  code: string; name: string; date: string; time: string;
  price: number | null; prevClose: number | null; change: number | null; changePercent: number | null;
  open: number | null; high: number | null; low: number | null; volume: number | null;
  bids: number[]; asks: number[];
};
type Bar = { date: string; close: number };
type Inst = { date: string; foreign: number; trust: number; dealer: number; total: number };
type MarginShort = { date: string; marginBalance: number; marginChange: number; shortBalance: number; shortChange: number };
type Chips = { institutional: Inst[]; marginShort: MarginShort[]; foreignHolding: { date: string; ratio: number }[] };

const REFRESH_MS = 5000;

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-line bg-surface p-5 sm:p-6 ${className}`}>{children}</div>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-faint">{children}</p>
);

function Stat({ label, value, sub, subClass = "text-muted" }: { label: string; value: string; sub?: string; subClass?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
      {sub && <div className={`mt-0.5 text-xs ${subClass}`}>{sub}</div>}
    </div>
  );
}

// 歷史收盤價走勢圖：滑鼠移過去會顯示當天價格
function LineChart({ data }: { data: Bar[] }) {
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 800, H = 300, PL = 48, PR = 16, PT = 16, PB = 32;
  const closes = data.map((d) => d.close);
  const min = Math.min(...closes), max = Math.max(...closes);
  const pad = (max - min) * 0.08 || 1;
  const lo = min - pad, hi = max + pad;
  const x = (i: number) => PL + (i / (data.length - 1)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
  const line = data.map((d, i) => `${x(i)},${y(d.close)}`).join(" ");
  const area = `${x(0)},${H - PB} ${line} ${x(data.length - 1)},${H - PB}`;
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const up = closes[closes.length - 1] >= closes[0];
  const color = up ? "var(--color-up)" : "var(--color-down)";
  const h = hover !== null ? data[hover] : null;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PL) / (W - PL - PR)) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="近半年收盤價走勢圖">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} className="stroke-line" strokeDasharray="3 5" />
            <text x={PL - 8} y={y(t) + 4} textAnchor="end" className="fill-faint text-[11px]">{Math.round(t).toLocaleString()}</text>
          </g>
        ))}
        <polygon points={area} fill={`url(#${gid})`} />
        <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <text x={PL} y={H - 8} className="fill-faint text-[11px]">{data[0].date}</text>
        <text x={W - PR} y={H - 8} textAnchor="end" className="fill-faint text-[11px]">{data[data.length - 1].date}</text>
        {hover !== null && h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H - PB} className="stroke-faint" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.close)} r="5" fill={color} className="stroke-bg" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && h && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-line bg-surface-2/95 px-3 py-1.5 text-xs shadow-xl backdrop-blur"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: hover > data.length / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
        >
          <div className="text-muted">{h.date}</div>
          <div className="text-base font-semibold">{h.close.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

// 三大法人買賣超長條圖（正：買超，紅；負：賣超，綠）
function NetBars({ data }: { data: Inst[] }) {
  const W = 800, H = 180, P = 16;
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.total)), 1);
  const mid = H / 2;
  const slot = (W - P * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="三大法人買賣超長條圖">
      <line x1={P} x2={W - P} y1={mid} y2={mid} className="stroke-line" />
      {data.map((d, i) => {
        const bh = Math.max((Math.abs(d.total) / maxAbs) * (mid - 14), 1);
        return (
          <rect key={d.date} x={P + i * slot + slot * 0.18} width={slot * 0.64} rx="3"
            y={d.total >= 0 ? mid - bh : mid} height={bh}
            className={d.total >= 0 ? "fill-up" : "fill-down"} fillOpacity="0.85">
            <title>{`${d.date} 合計 ${signed(d.total)} 張`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export default function StockView({ code = "2330" }: { code?: string }) {
  const [rt, setRt] = useState<Realtime | null>(null);
  const [history, setHistory] = useState<Bar[] | null>(null);
  const [chips, setChips] = useState<Chips | null>(null);
  const [error, setError] = useState("");
  const [rtError, setRtError] = useState("");

  // 歷史線圖與籌碼：載入一次
  useEffect(() => {
    fetch(`/api/finmind/history?code=${code}&days=180`)
      .then((r) => r.json())
      .then((h) => (h.error ? Promise.reject(new Error(h.error)) : setHistory(h.data)))
      .catch((e) => setError(e.message));
    fetch(`/api/finmind/chips?code=${code}&days=30`)
      .then((r) => r.json())
      .then((c) => (c.error ? Promise.reject(new Error(c.error)) : setChips(c)))
      .catch((e) => setError(e.message));
  }, [code]);

  // 即時股價：每 5 秒輪詢我們自己的後端 API
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/twse/realtime?code=${code}`)
        .then((r) => r.json())
        .then((q) => {
          if (!alive) return;
          if (q.error) setRtError(q.error);
          else { setRt(q); setRtError(""); }
        })
        .catch((e) => alive && setRtError(e.message));
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, [code]);

  const c = colorOf(rt?.change ?? null);
  const latestInst = chips?.institutional.at(-1);
  const latestMargin = chips?.marginShort.at(-1);
  const latestHolding = chips?.foreignHolding.at(-1);

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="rounded-lg border border-up/30 bg-up/10 px-3 py-2 text-sm text-up">部分資料載入失敗：{error}</p>}

      {/* 即時報價 */}
      <Card>
        {!rt ? (
          <p className={rtError ? "text-up" : "animate-pulse text-muted"}>{rtError ? `即時報價失敗：${rtError}` : "載入即時報價…"}</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{rt.name}</h3>
                <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-xs text-muted">{rt.code}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                <span className={`text-6xl font-bold leading-none tracking-tight ${c}`}>{fmt(rt.price)}</span>
                {rt.change !== null && (
                  <span className={`mb-1 rounded-lg px-2.5 py-1 text-sm font-semibold ${bgOf(rt.change)}`}>
                    {arrow(rt.change)} {Math.abs(rt.change)}　{rt.changePercent}%
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs text-faint">
                更新時間 {rt.time} · 每 {REFRESH_MS / 1000} 秒自動刷新
                {rtError && <span className="text-up">　更新失敗：{rtError}</span>}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Stat label="開盤" value={fmt(rt.open)} />
                <Stat label="最高" value={fmt(rt.high)} />
                <Stat label="最低" value={fmt(rt.low)} />
                <Stat label="昨收" value={fmt(rt.prevClose)} />
                <Stat label="成交量" value={`${fmt(rt.volume)} 張`} />
              </div>
            </div>

            {/* 五檔 */}
            <div className="min-w-56 rounded-xl bg-surface-2 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-faint">最佳五檔</p>
              <div className="grid grid-cols-2 gap-x-6 text-sm">
                <div>
                  <div className="mb-2 text-xs text-muted">委買</div>
                  {rt.bids.map((p, i) => <div key={i} className="py-0.5 font-medium text-up">{p.toLocaleString()}</div>)}
                </div>
                <div className="text-right">
                  <div className="mb-2 text-xs text-muted">委賣</div>
                  {rt.asks.map((p, i) => <div key={i} className="py-0.5 font-medium text-down">{p.toLocaleString()}</div>)}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 歷史走勢 */}
      <Card>
        <Label>近半年收盤價</Label>
        {history === null ? (
          <div className="h-[300px] animate-pulse rounded-xl bg-white/[0.03]" />
        ) : history.length > 1 ? (
          <LineChart data={history} />
        ) : (
          <p className="text-muted">沒有歷史資料</p>
        )}
      </Card>

      {/* 籌碼面 */}
      <Card>
        <Label>籌碼面 · 近 30 天</Label>
        {!chips ? (
          <div className="h-48 animate-pulse rounded-xl bg-white/[0.03]" />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {latestMargin && (
                <>
                  <Stat label="融資餘額（張）" value={latestMargin.marginBalance.toLocaleString()}
                    sub={`較前日 ${signed(latestMargin.marginChange)}`} subClass={colorOf(latestMargin.marginChange)} />
                  <Stat label="融券餘額（張）" value={latestMargin.shortBalance.toLocaleString()}
                    sub={`較前日 ${signed(latestMargin.shortChange)}`} subClass={colorOf(latestMargin.shortChange)} />
                </>
              )}
              {latestHolding && <Stat label="外資持股比例" value={`${latestHolding.ratio}%`} />}
            </div>

            <div>
              <p className="mb-2 text-sm text-muted">三大法人合計買賣超（張）</p>
              {chips.institutional.length > 0 && <NetBars data={chips.institutional} />}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-right text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-faint">
                      <th className="py-2 text-left font-medium">日期</th>
                      <th className="py-2 font-medium">外資</th>
                      <th className="py-2 font-medium">投信</th>
                      <th className="py-2 font-medium">自營商</th>
                      <th className="py-2 font-medium">合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chips.institutional.slice(-7).reverse().map((d) => (
                      <tr key={d.date} className="border-b border-line/50 last:border-0">
                        <td className="py-2 text-left text-muted">{d.date}</td>
                        {[d.foreign, d.trust, d.dealer, d.total].map((v, i) => (
                          <td key={i} className={`py-2 ${colorOf(v)} ${i === 3 ? "font-semibold" : ""}`}>{signed(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {latestInst && <p className="text-xs text-faint">籌碼資料更新至 {latestInst.date}（盤後公布）</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
