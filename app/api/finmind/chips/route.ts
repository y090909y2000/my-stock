// 我們自己的 API：向 FinMind 取得籌碼面（三大法人、融資融券、外資持股）
import { daysAgo, fetchFinMind } from "@/lib/finmind";

type Inst = { date: string; name: string; buy: number; sell: number };
type Margin = {
  date: string;
  MarginPurchaseTodayBalance: number; MarginPurchaseYesterdayBalance: number;
  ShortSaleTodayBalance: number; ShortSaleYesterdayBalance: number;
};
type Holding = { date: string; ForeignInvestmentSharesRatio: number };

const lots = (shares: number) => Math.round(shares / 1000); // 股 -> 張

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code") ?? "2330";
  const days = Math.min(Number(params.get("days") ?? 30) || 30, 365);
  const start = daysAgo(days);

  try {
    const [inst, margin, holding] = await Promise.all([
      fetchFinMind<Inst>("TaiwanStockInstitutionalInvestorsBuySell", code, start),
      fetchFinMind<Margin>("TaiwanStockMarginPurchaseShortSale", code, start),
      fetchFinMind<Holding>("TaiwanStockShareholding", code, start),
    ]);

    // 三大法人：每天彙整成 外資 / 投信 / 自營商 買賣超（張）
    const byDate = new Map<string, { foreign: number; trust: number; dealer: number }>();
    for (const r of inst) {
      const d = byDate.get(r.date) ?? { foreign: 0, trust: 0, dealer: 0 };
      const net = r.buy - r.sell;
      if (r.name.startsWith("Foreign")) d.foreign += net;
      else if (r.name === "Investment_Trust") d.trust += net;
      else if (r.name.startsWith("Dealer")) d.dealer += net;
      byDate.set(r.date, d);
    }
    const institutional = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date, foreign: lots(d.foreign), trust: lots(d.trust), dealer: lots(d.dealer),
        total: lots(d.foreign + d.trust + d.dealer),
      }));

    const marginShort = margin.map((r) => ({
      date: r.date,
      marginBalance: r.MarginPurchaseTodayBalance,
      marginChange: r.MarginPurchaseTodayBalance - r.MarginPurchaseYesterdayBalance,
      shortBalance: r.ShortSaleTodayBalance,
      shortChange: r.ShortSaleTodayBalance - r.ShortSaleYesterdayBalance,
    }));

    const foreignHolding = holding.map((r) => ({ date: r.date, ratio: r.ForeignInvestmentSharesRatio }));

    return Response.json({ source: "FinMind", code, institutional, marginShort, foreignHolding });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
