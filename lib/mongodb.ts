import mongoose from "mongoose";
import { Resolver } from "node:dns/promises";

// MongoDB 連線字串放在 .env.local 的 MONGODB_URI
const RAW_URI = process.env.MONGODB_URI;
// 固定使用 MyStock 資料庫（不依賴連線字串路徑裡寫的資料庫名稱）
const DB_NAME = "MyStock";

if (!RAW_URI) {
  throw new Error("缺少環境變數 MONGODB_URI，請在 .env.local 設定");
}

// 這台機器預設 DNS 是 127.0.0.1，不回應 Node 的 SRV 查詢，
// 直接用 mongodb+srv:// 會出現 querySrv ECONNREFUSED。
// 解法：自己指定公開 DNS 查 SRV + TXT，手動組成一般 mongodb:// 連線字串。
async function resolveConnectionString(uri: string): Promise<string> {
  if (!uri.startsWith("mongodb+srv://")) return uri;

  const url = new URL(uri);
  const srvHost = url.hostname;

  const resolver = new Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);

  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${srvHost}`);
  const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(",");

  // TXT 記錄放額外連線參數（例如 authSource、replicaSet）
  let txtParams = "";
  try {
    const txt = await resolver.resolveTxt(srvHost);
    txtParams = txt.map((chunks) => chunks.join("")).join("&");
  } catch {
    // 沒有 TXT 記錄也沒關係
  }

  const auth = url.username ? `${url.username}:${url.password}@` : "";
  const userParams = url.search ? url.search.slice(1) : "";
  const params = ["ssl=true", txtParams, userParams].filter(Boolean).join("&");

  return `mongodb://${auth}${hosts}/?${params}`;
}

// Next.js 開發模式會不斷 hot-reload，若每次都重新連線會爆連線數。
// 因此把連線快取在 global 上，重複呼叫時直接沿用同一條連線。
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = resolveConnectionString(RAW_URI!)
      .then((uri) => mongoose.connect(uri, { dbName: DB_NAME }))
      .catch((e) => {
        cached.promise = null; // 連線失敗時清掉，下次請求才能重試
        throw e;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
