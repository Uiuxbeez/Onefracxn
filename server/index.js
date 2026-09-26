import { openDatabase } from "./db.js";
import { initialize, createApp } from "./app.js";
const production = process.env.NODE_ENV === "production";
const origins = (process.env.FRONTEND_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (production && origins.some((o) => !o.startsWith("https://")))
  throw new Error("Production FRONTEND_ORIGINS must contain HTTPS origins");
const db = await openDatabase();
await initialize(db, {
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD,
});
const server = createApp(db, {
  origins,
  trustProxy: production ? 1 : false,
}).listen(Number(process.env.PORT || 3001), "0.0.0.0", () =>
  console.log(`OneFracxn API listening on port ${process.env.PORT || 3001}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await db.close();
      process.exit(0);
    }),
  );
