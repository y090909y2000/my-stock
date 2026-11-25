// 我們自己的 API：向 Yahoo 奇摩股市 RSS 取得個股相關新聞（不需 Token）
// 用法：/api/news?code=2330&limit=10
const RSS_URL = "https://tw.stock.yahoo.com/rss";

const decodeEntities = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

// 取出 <tag>…</tag> 的文字，支援 CDATA；並移除 HTML 標籤
function tagText(xml: string, tag: string) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!m) return "";
  const raw = m[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  const text = cdata ? cdata[1] : decodeEntities(raw);
  return text.replace(/<[^>]+>/g, "").trim();
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code") ?? "2330";
  const limit = Math.min(Number(params.get("limit") ?? 10) || 10, 20);
  if (!/^[0-9A-Za-z]{4,6}$/.test(code)) return Response.json({ error: "股票代號格式不正確" }, { status: 400 });

  try {
    const res = await fetch(`${RSS_URL}?s=${code}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Yahoo RSS 回應 ${res.status}`);
    const xml = await res.text();

    const items = xml
      .split("<item>")
      .slice(1)
      .map((chunk) => {
        const pub = new Date(tagText(chunk, "pubDate"));
        return {
          title: tagText(chunk, "title"),
          link: tagText(chunk, "link"),
          summary: tagText(chunk, "description"),
          publishedAt: Number.isNaN(pub.getTime()) ? null : pub.toISOString(),
        };
      })
      // 只放行 https 連結，避免 javascript: 之類的網址被放進前端的 <a href>
      .filter((n) => n.title && n.link.startsWith("https://"))
      .slice(0, limit);

    return Response.json({ source: "Yahoo奇摩股市 RSS", code, items });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
