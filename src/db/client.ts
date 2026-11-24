import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import mysql, { type Pool } from "mysql2/promise";
import * as pgSchema from "@/db/schema";
import * as mysqlSchema from "@/db/schema-mysql";

export type DbDialect = "postgres" | "mysql";

export type PgDatabase = ReturnType<typeof drizzleNeon<typeof pgSchema>>;
export type MysqlDatabase = ReturnType<typeof drizzleMysql<typeof mysqlSchema>>;
export type Database = PgDatabase | MysqlDatabase;

const globalForDb = globalThis as unknown as {
  sql?: NeonQueryFunction<false, false>;
  mysqlPool?: Pool;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pgDb?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mysqlDb?: any;
};

/** Build DATABASE_URL from DATABASE_URL or MYSQL_* (cPanel). Never log the result. */
export function databaseUrl() {
  const raw = process.env.DATABASE_URL?.trim();
  if (raw) {
    try {
      const parsed = new URL(raw);
      parsed.searchParams.delete("channel_binding");
      return parsed.toString();
    } catch {
      return raw;
    }
  }

  const host = process.env.MYSQL_HOST?.trim();
  const user = process.env.MYSQL_USER?.trim();
  const database = process.env.MYSQL_DATABASE?.trim();
  const password = process.env.MYSQL_PASSWORD ?? "";
  if (!host || !user || !database) {
    return undefined;
  }
  const port = process.env.MYSQL_PORT?.trim() || "3306";
  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
  return `mysql://${auth}@${host}:${port}/${encodeURIComponent(database)}`;
}

export function getDialect(): DbDialect | null {
  const url = databaseUrl();
  if (!url) return null;
  if (url.startsWith("mysql://") || url.startsWith("mysql2://")) return "mysql";
  return "postgres";
}

export function getSql() {
  if (getDialect() !== "postgres") {
    return null;
  }
  const url = databaseUrl();
  if (!url) {
    return null;
  }
  if (!globalForDb.sql) {
    globalForDb.sql = neon(url);
  }
  return globalForDb.sql;
}

export function getMysqlPool() {
  if (getDialect() !== "mysql") {
    return null;
  }
  const url = databaseUrl();
  if (!url) {
    return null;
  }
  if (!globalForDb.mysqlPool) {
    globalForDb.mysqlPool = mysql.createPool(url);
  }
  return globalForDb.mysqlPool;
}

export function getDb() {
  const dialect = getDialect();
  if (dialect === "mysql") {
    const pool = getMysqlPool();
    if (!pool) return null;
    if (!globalForDb.mysqlDb) {
      globalForDb.mysqlDb = drizzleMysql(pool, { schema: mysqlSchema, mode: "default" });
    }
    return globalForDb.mysqlDb;
  }
  if (dialect === "postgres") {
    const sql = getSql();
    if (!sql) return null;
    if (!globalForDb.pgDb) {
      globalForDb.pgDb = drizzleNeon(sql, { schema: pgSchema });
    }
    return globalForDb.pgDb;
  }
  return null;
}

export function databaseAvailable() {
  return getDialect() !== null;
}
