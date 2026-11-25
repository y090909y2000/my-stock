// 我們自己的 API：向 FinMind 取得個股歷史日線
import { daysAgo, fetchFinMind } from "@/lib/finmind";

type Row = { date: string; open: number; max: number; min: number; close: number; Trading_Volume: number };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code") ?? "2330";
  const days = Math.min(Number(params.get("days") ?? 180) || 180, 1000);
  try {
    const rows = await fetchFinMind<Row>("TaiwanStockPrice", code, daysAgo(days));
    const data = rows.map((r) => ({
      date: r.date, open: r.open, high: r.max, low: r.min, close: r.close, volume: r.Trading_Volume,
    }));
    return Response.json({ source: "FinMind", code, data });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
