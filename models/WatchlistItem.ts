import mongoose, { Schema, type InferSchemaType } from "mongoose";

// 追蹤清單：每筆是一支股票
const WatchlistItemSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true }, // 股票代號，例如 2330
    name: { type: String, required: true, trim: true }, // 股票名稱，例如 台積電
  },
  { timestamps: true, collection: "watchlist" }
);

export type WatchlistItemDoc = InferSchemaType<typeof WatchlistItemSchema>;

// 避免 hot-reload 重複註冊 model
export default mongoose.models.WatchlistItem ?? mongoose.model("WatchlistItem", WatchlistItemSchema);
