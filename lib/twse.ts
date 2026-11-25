// TWSE MIS 即時報價共用邏輯（非官方文件端點，不需 Token）
const MIS_URL = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp";

export type MisMsg = Record<string, string | undefined> & { n?: string };

const num = (v: string | undefined) => {
  const n = Number(v);
  return v && v !== "-" && Number.isFinite(n) ? n : null;
};

export function toQuote(m: MisMsg) {
  const prevClose = num(m.y);
  const bids = String(m.b ?? "").split("_").filter(Boolean);
  const asks = String(m.a ?? "").split("_").filter(Boolean);
  // 還沒成交時 z 是 "-"，改用最佳買價；都沒有就用昨收
  const price = num(m.z) ?? num(bids[0]) ?? prevClose;
  const change = price !== null && prevClose !== null ? Number((price - prevClose).toFixed(2)) : null;
  return {
    source: "TWSE MIS",
    code: m.c,
    name: m.n,
    date: m.d, // 20261125
    time: m.t, // 10:12:00
    price,
    prevClose,
    change,
    changePercent: change !== null && prevClose ? Number(((change / prevClose) * 100).toFixed(2)) : null,
    open: num(m.o),
    high: num(m.h),
    low: num(m.l),
    volume: num(m.v), // 累計成交量（張）
    bids: bids.slice(0, 5).map(Number),
    asks: asks.slice(0, 5).map(Number),
  };
}

export async function fetchMis(codes: string[]) {
  // 每檔同時查上市 (tse) 與上櫃 (otc)，有資料的那個就是
  const exCh = codes.flatMap((c) => [`tse_${c}.tw`, `otc_${c}.tw`]).join("|");
  const res = await fetch(`${MIS_URL}?ex_ch=${exCh}&json=1&delay=0`, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://mis.twse.com.tw/stock/fibest.jsp" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`TWSE MIS 回應 ${res.status}`);
  const json = await res.json();
  return ((json.msgArray ?? []) as MisMsg[]).filter((x) => x.n);
}

// 股票代號格式：4~6 碼英數字（例如 2330、0050、00878、00981A）
export const isValidCode = (c: string) => /^[0-9A-Za-z]{4,6}$/.test(c);
