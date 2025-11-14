import { createClient } from "redis";

export const redis = createClient({
  url: "redis://localhost:6379",
});

redis.on("connect", () => console.log("Redis connected ✓"));
redis.on("error", (err) => console.log("Redis Error:", err));

await redis.connect();
