import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { contentSchema, publicContent } from "./schema.js";
const digest = (value) => createHash("sha256").update(value).digest("hex");
export const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};
const matches = (password, hash) => {
  const [salt, key] = hash.split(":");
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(key, "hex"),
  );
};
export async function initialize(db, { username, password }) {
  const schema = `CREATE TABLE IF NOT EXISTS admins (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES admins(username), expires_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS content (id INTEGER PRIMARY KEY CHECK (id=1), draft JSONB NOT NULL, published JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS enquiries (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, message TEXT NOT NULL, property_id TEXT, status TEXT NOT NULL DEFAULT 'New', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`;
  for (const sql of schema.split(";").filter((s) => s.trim()))
    await db.query(sql);
  const admins = await db.query("SELECT username FROM admins LIMIT 1");
  if (!admins.rows.length) {
    if (!password || password.length < 12)
      throw new Error(
        "Set ADMIN_PASSWORD to at least 12 characters for initial setup",
      );
    await db.query("INSERT INTO admins VALUES ($1,$2) ON CONFLICT DO NOTHING", [
      username || "admin",
      hashPassword(password),
    ]);
  }
  const seed = contentSchema.parse(
    JSON.parse(readFileSync(new URL("./seed.json", import.meta.url), "utf8")),
  );
  await db.query(
    "INSERT INTO content (id,draft,published) VALUES (1,$1,$1) ON CONFLICT DO NOTHING",
    [JSON.stringify(seed)],
  );
}
export function createApp(
  db,
  { origins = ["http://localhost:5173"], trustProxy = false } = {},
) {
  const app = express();
  app.set("trust proxy", trustProxy);
  app.use(helmet());
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin))
      return res.status(403).json({ error: "Origin not allowed" });
    if (origin) {
      res.set("Access-Control-Allow-Origin", origin);
      res.vary("Origin");
    }
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    if (req.method === "OPTIONS") return res.sendStatus(204);
    if (!req.path.startsWith("/api/media/"))
      res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "6mb" }));
  const limited = (limit, windowMs) =>
    rateLimit({
      windowMs,
      limit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many attempts. Please try again later." },
    });
  app.get("/api/health", async (req, res) => {
    await db.query("SELECT 1");
    res.json({ ok: true });
  });
  app.get("/api/content", async (req, res) => {
    const { rows } = await db.query("SELECT published FROM content WHERE id=1");
    res.json(publicContent(rows[0].published));
  });
  app.post(
    "/api/admin/login",
    limited(10, 15 * 60 * 1000),
    async (req, res) => {
      const { username, password } = z
        .object({
          username: z.string().max(100),
          password: z.string().max(200),
        })
        .parse(req.body);
      const { rows } = await db.query(
        "SELECT password_hash FROM admins WHERE username=$1",
        [username],
      );
      const hash =
        rows[0]?.password_hash || `${"0".repeat(32)}:${"0".repeat(128)}`;
      if (!matches(password, hash) || !rows.length)
        return res
          .status(401)
          .json({ error: "Incorrect username or password" });
      const token = randomBytes(32).toString("hex");
      await db.query("DELETE FROM sessions WHERE expires_at < NOW()");
      await db.query(
        "INSERT INTO sessions VALUES ($1,$2,NOW() + INTERVAL '8 hours')",
        [digest(token), username],
      );
      res.json({ token });
    },
  );
  app.use("/api/admin", async (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, "") || "";
    if (!/^[a-f0-9]{64}$/.test(token))
      return res.status(401).json({ error: "Please sign in again" });
    const { rows } = await db.query(
      "SELECT username FROM sessions WHERE token_hash=$1 AND expires_at>NOW()",
      [digest(token)],
    );
    if (!rows.length)
      return res
        .status(401)
        .json({ error: "Your session expired. Please sign in again." });
    req.admin = rows[0].username;
    req.tokenHash = digest(token);
    next();
  });
  app.get("/api/admin/content", async (req, res) => {
    const { rows } = await db.query(
      "SELECT draft,version FROM content WHERE id=1",
    );
    res.json(rows[0]);
  });
  app.put("/api/admin/content", async (req, res) => {
    const { content, version, publish } = z
      .object({
        content: contentSchema,
        version: z.number().int(),
        publish: z.boolean(),
      })
      .parse(req.body);
    const result = await db.query(
      `UPDATE content SET draft=$1, published=CASE WHEN $2 THEN $1::jsonb ELSE published END, version=version+1 WHERE id=1 AND version=$3 RETURNING version`,
      [JSON.stringify(content), publish, version],
    );
    if (!result.rows.length)
      return res
        .status(409)
        .json({
          error:
            "Another administrator saved changes. Reload before editing again.",
        });
    res.json(result.rows[0]);
  });
  app.post("/api/admin/logout", async (req, res) => {
    await db.query("DELETE FROM sessions WHERE token_hash=$1", [req.tokenHash]);
    res.json({ ok: true });
  });
  app.post(
    "/api/admin/password",
    limited(10, 15 * 60 * 1000),
    async (req, res) => {
      const { currentPassword, newPassword } = z
        .object({
          currentPassword: z.string().max(200),
          newPassword: z.string().min(12).max(200),
        })
        .parse(req.body);
      const { rows } = await db.query(
        "SELECT password_hash FROM admins WHERE username=$1",
        [req.admin],
      );
      if (!matches(currentPassword, rows[0].password_hash))
        return res.status(400).json({ error: "Current password is incorrect" });
      await db.transaction(async (tx) => {
        await tx.query("UPDATE admins SET password_hash=$1 WHERE username=$2", [
          hashPassword(newPassword),
          req.admin,
        ]);
        await tx.query("DELETE FROM sessions WHERE username=$1", [req.admin]);
      });
      res.json({ ok: true });
    },
  );
  app.post("/api/enquiries", limited(8, 60 * 60 * 1000), async (req, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2).max(100),
        email: z.email().max(254),
        phone: z.string().trim().min(6).max(30),
        message: z.string().trim().min(5).max(4000),
        propertyId: z.string().max(100).nullable().optional(),
        website: z.string().max(100).optional(),
      })
      .parse(req.body);
    if (data.website) return res.json({ ok: true });
    if (data.propertyId) {
      const { rows } = await db.query(
        "SELECT published FROM content WHERE id=1",
      );
      if (
        !rows[0].published.properties.some(
          (p) => p.id === data.propertyId && p.published,
        )
      )
        return res
          .status(400)
          .json({ error: "Property is no longer available" });
    }
    await db.query(
      "INSERT INTO enquiries (id,name,email,phone,message,property_id) VALUES ($1,$2,$3,$4,$5,$6)",
      [
        randomUUID(),
        data.name,
        data.email,
        data.phone,
        data.message,
        data.propertyId || null,
      ],
    );
    res.status(201).json({ ok: true });
  });
  app.get("/api/admin/enquiries", async (req, res) => {
    const { rows } = await db.query(
      "SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 1000",
    );
    res.json(rows);
  });
  app.patch("/api/admin/enquiries/:id", async (req, res) => {
    const { status } = z
      .object({ status: z.enum(["New", "Contacted", "Closed"]) })
      .parse(req.body);
    const { rows } = await db.query(
      "UPDATE enquiries SET status=$1 WHERE id=$2 RETURNING id",
      [status, req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Enquiry not found" });
    res.json({ ok: true });
  });
  app.post("/api/admin/media", async (req, res) => {
    const { data } = z
      .object({ data: z.string().max(5600000) })
      .parse(req.body);
    const bytes = Buffer.from(data, "base64");
    let mime;
    if (
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      mime = "image/png";
    else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
      mime = "image/jpeg";
    else if (
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    )
      mime = "image/webp";
    if (!mime || bytes.length > 4 * 1024 * 1024)
      return res
        .status(400)
        .json({ error: "Upload a PNG, JPEG or WebP image under 4 MB" });
    const id = randomUUID();
    await db.query("INSERT INTO media (id,mime,bytes) VALUES ($1,$2,$3)", [
      id,
      mime,
      bytes,
    ]);
    res.status(201).json({ url: `/api/media/${id}` });
  });
  app.get("/api/media/:id", async (req, res) => {
    const { rows } = await db.query(
      "SELECT mime,bytes FROM media WHERE id=$1",
      [req.params.id],
    );
    if (!rows.length) return res.sendStatus(404);
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    res
      .set("Cache-Control", "public, max-age=31536000, immutable")
      .type(rows[0].mime)
      .send(Buffer.from(rows[0].bytes));
  });
  app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
  app.use((error, req, res, next) => {
    if (error instanceof z.ZodError)
      return res
        .status(400)
        .json({
          error: error.issues
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join("; "),
        });
    if (error.type === "entity.too.large")
      return res.status(413).json({ error: "Upload or content is too large" });
    if (error instanceof SyntaxError && error.status === 400)
      return res.status(400).json({ error: "Invalid JSON" });
    console.error("API request failed:", error.message);
    res
      .status(500)
      .json({ error: "Unable to complete this request. Please try again." });
  });
  return app;
}
