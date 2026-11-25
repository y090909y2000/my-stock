"use client";

import { useEffect, useRef, useState } from "react";
import { OPEN_SETTINGS_EVENT, maskKey, setApiKey, useApiKey } from "@/lib/apiKey";

// 頁首的「設定」按鈕 + 設定視窗（輸入自己的 OpenAI API key）
export default function Settings() {
  const saved = useApiKey();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const open = () => {
    setDraft("");
    setShow(false);
    setError("");
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  // 其他元件（例如按下「AI 分析」但還沒設定 key）可以用事件叫出這個視窗
  useEffect(() => {
    const handler = () => open();
    window.addEventListener(OPEN_SETTINGS_EVENT, handler);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, handler);
  }, []);

  function save() {
    const key = draft.trim();
    if (!/^sk-[\w-]{10,}$/.test(key)) return setError("格式不正確，OpenAI API key 應以 sk- 開頭。");
    setApiKey(key);
    close();
  }

  return (
    <>
      <button
        onClick={open}
        className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted transition hover:border-faint hover:text-fg"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
        設定
        <span className={`h-1.5 w-1.5 rounded-full ${saved ? "bg-accent" : "bg-faint"}`} title={saved ? "已設定 OpenAI API key" : "尚未設定 OpenAI API key"} />
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && close()} // 點背景關閉
        className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">設定</h2>
              <p className="mt-1 text-sm text-muted">AI 分析使用你自己的 OpenAI API key（BYOK）。</p>
            </div>
            <button onClick={close} aria-label="關閉" className="rounded-full p-1 text-faint transition hover:bg-white/5 hover:text-fg">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <label className="mt-6 block text-sm font-medium" htmlFor="openai-key">OpenAI API key</label>
          {saved && (
            <p className="mt-1 text-xs text-muted">
              目前已儲存：<span className="font-mono text-accent">{maskKey(saved)}</span>（輸入新的 key 會覆蓋）
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-bg px-3 transition focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/10">
            <input
              id="openai-key"
              type={show ? "text" : "password"}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent py-2.5 font-mono text-sm outline-none placeholder:text-faint"
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="shrink-0 text-xs text-muted hover:text-fg">
              {show ? "隱藏" : "顯示"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-up">{error}</p>}

          <div className="mt-4 rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            <p>• key 只會儲存在<b className="text-fg">這個瀏覽器的 localStorage</b>，不會存進資料庫。</p>
            <p>• 按下「AI 分析」時，key 會經由我們的後端轉發給 OpenAI，後端不會保存或記錄它。</p>
            <p>• 請不要在公用電腦上儲存 key；不用時可按「清除」。</p>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => { setApiKey(""); close(); }}
              disabled={!saved}
              className="text-sm text-muted transition hover:text-up disabled:opacity-30 disabled:hover:text-muted"
            >
              清除已儲存的 key
            </button>
            <div className="flex gap-2">
              <button onClick={close} className="rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:text-fg">取消</button>
              <button
                onClick={save}
                disabled={!draft.trim()}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:brightness-110 disabled:opacity-40"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
