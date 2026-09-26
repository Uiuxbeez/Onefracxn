import pg from "pg";
export async function openDatabase() {
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 15000,
    });
    return {
      query: (sql, args) => pool.query(sql, args),
      async transaction(fn) {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const out = await fn(c);
          await c.query("COMMIT");
          return out;
        } catch (e) {
          await c.query("ROLLBACK");
          throw e;
        } finally {
          c.release();
        }
      },
      close: () => pool.end(),
    };
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("DATABASE_URL is required in production");
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(process.env.LOCAL_DB_PATH || ".local/postgres");
  await db.waitReady;
  return db;
}
