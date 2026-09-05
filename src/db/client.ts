import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  sql?: NeonQueryFunction<false, false>;
  db?: Database;
};

export function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || undefined;
}

export function getSql() {
  const url = databaseUrl();
  if (!url) {
    return null;
  }
  if (!globalForDb.sql) {
    globalForDb.sql = neon(url);
  }
  return globalForDb.sql;
}

export function getDb() {
  const sql = getSql();
  if (!sql) {
    return null;
  }
  if (!globalForDb.db) {
    globalForDb.db = drizzle(sql, { schema });
  }
  return globalForDb.db;
}
