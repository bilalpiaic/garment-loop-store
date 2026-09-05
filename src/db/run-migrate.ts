import { existsSync, readFileSync } from "node:fs";
import { migrateDatabase } from "@/db/migrate";

function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    return;
  }
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.DATABASE_URL?.trim()) {
  console.error("DATABASE_URL is required to migrate.");
  process.exit(1);
}

await migrateDatabase();
console.log("Neon schema, place_order function, and inventory seed are ready.");
