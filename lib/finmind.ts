// FinMind 共用呼叫：Token 只在伺服器端使用（.env.local 的 FINMIND_TOKEN）
const FINMIND_URL = "https://api.finmindtrade.com/api/v4/data";

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export async function fetchFinMind<T>(dataset: string, code: string, startDate: string, revalidate = 3600) {
  const token = process.env.FINMIND_TOKEN;
  const url = `${FINMIND_URL}?dataset=${dataset}&data_id=${encodeURIComponent(code)}&start_date=${startDate}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    next: { revalidate },
  });
  const json = await res.json();
  if (!res.ok || json.status !== 200) throw new Error(json.msg ?? `FinMind 回應 ${res.status}`);
  return json.data as T[];
}
