// DELETE /api/watchlist/2330 → 從追蹤清單移除
import { connectDB } from "@/lib/mongodb";
import { isValidCode } from "@/lib/twse";
import WatchlistItem from "@/models/WatchlistItem";

export async function DELETE(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isValidCode(code)) return Response.json({ error: "股票代號格式不正確" }, { status: 400 });

  try {
    await connectDB();
    const result = await WatchlistItem.deleteOne({ code: code.toUpperCase() });
    if (result.deletedCount === 0) return Response.json({ error: `清單裡沒有 ${code}` }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
