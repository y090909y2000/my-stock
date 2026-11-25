// 我們自己的 API：向 TWSE MIS 取得盤中即時報價
// 單檔：?code=2330  →  回傳一個物件
// 多檔：?codes=2330,0050  →  回傳 { quotes: [...] }
import { fetchMis, isValidCode, toQuote, type MisMsg } from "@/lib/twse";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const multi = params.get("codes");
  const codes = (multi ?? params.get("code") ?? "2330")
    .split(",")
    .map((c) => c.trim())
    .filter(isValidCode)
    .slice(0, 20);
  if (codes.length === 0) return Response.json({ error: "股票代號格式不正確" }, { status: 400 });

  try {
    const msgs = await fetchMis(codes);
    if (multi !== null) {
      // 依請求順序回傳
      const quotes = codes
        .map((c) => msgs.find((m) => m.c === c))
        .filter((m): m is MisMsg => Boolean(m))
        .map(toQuote);
      return Response.json({ quotes });
    }
    const m = msgs.find((x) => x.c === codes[0]);
    if (!m) return Response.json({ error: `找不到股票 ${codes[0]}` }, { status: 404 });
    return Response.json(toQuote(m));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
