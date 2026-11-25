// 我們自己的 API：追蹤清單（存在 MongoDB 的 MyStock.watchlist）
// GET  /api/watchlist           → 取得清單
// POST /api/watchlist {code}    → 新增（會先向 TWSE 驗證代號並取得名稱）
import { connectDB } from "@/lib/mongodb";
import { fetchMis, isValidCode } from "@/lib/twse";
import WatchlistItem from "@/models/WatchlistItem";

const MAX_ITEMS = 20;

export async function GET() {
  try {
    await connectDB();
    const items = await WatchlistItem.find().sort({ createdAt: 1 }).lean();
    return Response.json({ items: items.map((i) => ({ code: i.code, name: i.name })) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (!isValidCode(code)) {
    return Response.json({ error: "股票代號格式不正確（4~6 碼英數字，例如 2330）" }, { status: 400 });
  }

  try {
    await connectDB();
    if (await WatchlistItem.exists({ code })) {
      return Response.json({ error: `${code} 已經在追蹤清單裡了` }, { status: 409 });
    }
    if ((await WatchlistItem.countDocuments()) >= MAX_ITEMS) {
      return Response.json({ error: `追蹤清單最多 ${MAX_ITEMS} 檔` }, { status: 400 });
    }

    // 向 TWSE 驗證代號存在，並取得股票名稱
    const msg = (await fetchMis([code])).find((m) => m.c === code);
    if (!msg?.n) return Response.json({ error: `找不到股票 ${code}` }, { status: 404 });

    const item = await WatchlistItem.create({ code, name: msg.n });
    return Response.json({ code: item.code, name: item.name }, { status: 201 });
  } catch (e) {
    // 兩個請求同時新增同一檔時，unique index 會擋下第二個
    if ((e as { code?: number }).code === 11000) {
      return Response.json({ error: `${code} 已經在追蹤清單裡了` }, { status: 409 });
    }
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
