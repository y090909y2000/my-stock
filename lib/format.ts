// 畫面共用的顏色與數字格式（台股慣例：紅漲綠跌）
export const colorOf = (n: number | null) =>
  n === null || n === 0 ? "text-muted" : n > 0 ? "text-up" : "text-down";

export const bgOf = (n: number | null) =>
  n === null || n === 0 ? "bg-white/5 text-muted" : n > 0 ? "bg-up/12 text-up" : "bg-down/12 text-down";

export const fmt = (n: number | null) => (n === null ? "-" : n.toLocaleString());

export const signed = (n: number) => (n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString());

export const arrow = (n: number | null) => (n === null || n === 0 ? "" : n > 0 ? "▲" : "▼");
