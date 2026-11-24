/**
 * Passenger / cPanel entrypoint for GarmentLoop.
 * Respects PORT (set by Passenger) and binds 0.0.0.0.
 * Loads .env.production / .env.local / .env before Next boots (cPanel has no Vercel env UI).
 */
const { createServer } = require("http");
const { parse } = require("url");
const { existsSync, readFileSync } = require("fs");
const { join } = require("path");
const next = require("next");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const raw of readFileSync(filePath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
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

const root = __dirname;
loadEnvFile(join(root, ".env.production"));
loadEnvFile(join(root, ".env.local"));
loadEnvFile(join(root, ".env"));

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "43123", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, hostname, () => {
      console.log(`GarmentLoop ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start Next.js server", err);
    process.exit(1);
  });
