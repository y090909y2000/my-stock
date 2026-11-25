"use client";

import { useEffect, useState } from "react";

type NewsItem = { title: string; link: string; summary: string; publishedAt: string | null };

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} 分鐘前`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)} 小時前`;
  return new Date(iso).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" });
}

export default function NewsList({ code }: { code: string }) {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/news?code=${code}&limit=10`)
      .then((r) => r.json())
      .then((j) => (j.error ? Promise.reject(new Error(j.error)) : setItems(j.items)))
      .catch((e) => setError(e.message));
  }, [code]);

  if (error) return <p className="rounded-lg border border-up/30 bg-up/10 px-3 py-2 text-sm text-up">新聞載入失敗：{error}</p>;
  if (!items) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl border border-line bg-surface" />)}
      </div>
    );
  }
  if (items.length === 0) return <p className="text-muted">目前沒有相關新聞</p>;

  return (
    <ul className="flex flex-col gap-3">
      {items.map((n) => (
        <li key={n.link}>
          <a
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl border border-line bg-surface p-5 transition hover:border-accent/40 hover:bg-surface-2"
          >
            <h3 className="font-medium leading-snug transition group-hover:text-accent">{n.title}</h3>
            {n.summary && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{n.summary}</p>}
            <p className="mt-3 flex items-center gap-2 text-xs text-faint">
              <span>Yahoo奇摩股市</span>
              {n.publishedAt && <span aria-hidden>·</span>}
              <span>{timeAgo(n.publishedAt)}</span>
              <span className="ml-auto opacity-0 transition group-hover:opacity-100" aria-hidden>閱讀全文 →</span>
            </p>
          </a>
        </li>
      ))}
    </ul>
  );
}
