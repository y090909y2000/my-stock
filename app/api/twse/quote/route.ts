// 我們自己的 API：向 TWSE OpenAPI 取得個股「最新交易日」行情（盤後日資料，不需 Token）
const TWSE_URL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";

type TwseRow = {
  Date: string; // 民國年，例如 1151124
  Code: string;
  Name: string;
  TradeVolume: string;
  OpeningPrice: string;
  HighestPrice: string;
  LowestPrice: string;
  ClosingPrice: string;
  Change: string;
};

// 民國 1151124 -> 2026-11-24
function rocToIso(d: string) {
  const y = Number(d.slice(0, d.length - 4)) + 1911;
  return `${y}-${d.slice(-4, -2)}-${d.slice(-2)}`;
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "2330";
  try {
    const res = await fetch(TWSE_URL, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`TWSE 回應 ${res.status}`);
    const rows: TwseRow[] = await res.json();
    const row = rows.find((r) => r.Code === code);
    if (!row) return Response.json({ error: `找不到股票 ${code}` }, { status: 404 });

    const close = Number(row.ClosingPrice);
    const change = Number(row.Change);
    return Response.json({
      source: "TWSE OpenAPI",
      code: row.Code,
      name: row.Name,
      date: rocToIso(row.Date),
      open: Number(row.OpeningPrice),
      high: Number(row.HighestPrice),
      low: Number(row.LowestPrice),
      close,
      change,
      changePercent: Number(((change / (close - change)) * 100).toFixed(2)),
      volume: Number(row.TradeVolume),
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
