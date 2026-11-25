"use client";

import { useState } from "react";
import { getApiKey, openSettings } from "@/lib/apiKey";

type Quote = {
  price: number | null; prevClose: number | null; change: number | null; changePercent: number | null;
  open?: number | null; high: number | null; low: number | null; volume: number | null;
};
type Result = { verdict: "利多" | "利空" | "中立"; summary: string; bullish: string[]; bearish: string[]; model: string };

// 台股慣例：利多＝紅、利空＝綠
const verdictStyle = {
  利多: "bg-up/15 text-up border-up/30",
  利空: "bg-down/15 text-down border-down/30",
  中立: "bg-white/5 text-muted border-line",
} as const;

export default function AiAnalysis({ code, name, quote }: { code: string; name: string; quote?: Quote }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function analyze() {
    const key = getApiKey();
    if (!key) return openSettings(); // 還沒設定 key：直接叫出設定視窗
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-openai-key": key },
        body: JSON.stringify({ code, name, quote }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "AI 分析失敗");
      setResult(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={analyze}
        disabled={loading || !quote}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface py-2.5 text-sm font-medium text-muted transition hover:border-accent/50 hover:text-accent active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {loading ? <path d="M21 12a9 9 0 1 1-6.2-8.6" /> : <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />}
        </svg>
        {loading ? "AI 分析中…" : result ? "重新分析" : "AI 分析"}
      </button>

      {error && (
        <p className="mt-2 rounded-lg border border-up/30 bg-up/10 px-3 py-2 text-xs leading-relaxed text-up">{error}</p>
      )}

      {result && (
        <div className="fade-up mt-2 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className={`rounded-lg border px-2.5 py-1 text-sm font-bold ${verdictStyle[result.verdict]}`}>{result.verdict}</span>
            <button onClick={() => setResult(null)} aria-label="收起分析" className="text-xs text-faint hover:text-fg">收起</button>
          </div>
          <p className="mt-3 leading-relaxed">{result.summary}</p>

          {result.bullish.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-up">利多因素</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-muted">{result.bullish.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          {result.bearish.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-down">利空因素</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-muted">{result.bearish.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-faint">
            由 {result.model} 根據報價、走勢、籌碼與新聞產生，僅供參考，不構成投資建議。
          </p>
        </div>
      )}
    </div>
  );
}
