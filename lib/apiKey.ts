// BYOK：使用者自己的 OpenAI API key，只存在這個瀏覽器的 localStorage
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "mystock.openaiKey";
const CHANGE_EVENT = "mystock:apikey-change";
export const OPEN_SETTINGS_EVENT = "mystock:open-settings";

export function getApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setApiKey(value: string) {
  if (value) localStorage.setItem(STORAGE_KEY, value);
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT)); // 同一個分頁內的其他元件也要同步
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb); // 其他分頁修改時
  window.addEventListener(CHANGE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE_EVENT, cb);
  };
}

// 伺服器端渲染時沒有 localStorage，回傳空字串
export const useApiKey = () => useSyncExternalStore(subscribe, getApiKey, () => "");

export const openSettings = () => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));

export const maskKey = (k: string) => (k.length > 10 ? `${k.slice(0, 3)}…${k.slice(-4)}` : "已儲存");
