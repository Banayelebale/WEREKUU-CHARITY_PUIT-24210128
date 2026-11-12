import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(path.join(projectRoot, ".env"));
  }
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}

export class DbWrapper {
  constructor(client) {
    this.client = client;
    this.tx = null;
  }

  getRunner() {
    return this.tx || this.client;
  }

  async exec(sql) {
    const s = sql.trim().toUpperCase();
    if (s.startsWith("BEGIN")) {
      if (!this.tx) {
        this.tx = await this.client.transaction("write");
      }
      return;
    }
    if (s === "COMMIT") {
      if (this.tx) {
        await this.tx.commit();
        this.tx.close();
        this.tx = null;
      }
      return;
    }
    if (s === "ROLLBACK") {
      if (this.tx) {
        try {
          await this.tx.rollback();
        } catch {}
        this.tx.close();
        this.tx = null;
      }
      return;
    }

    const runner = this.getRunner();
    const statements = sql
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await runner.execute(stmt);
    }
  }

  async run(sql, ...args) {
    const flatArgs = args.flat();
    const runner = this.getRunner();
    const r = await runner.execute({ sql, args: flatArgs });
    return {
      lastInsertRowid: r.lastInsertRowid !== undefined ? Number(r.lastInsertRowid) : undefined,
      changes: r.rowsAffected
    };
  }

  async get(sql, ...args) {
    const flatArgs = args.flat();
    const runner = this.getRunner();
    const r = await runner.execute({ sql, args: flatArgs });
    return r.rows[0];
  }

  async all(sql, ...args) {
    const flatArgs = args.flat();
    const runner = this.getRunner();
    const r = await runner.execute({ sql, args: flatArgs });
    return r.rows;
  }

  prepare(sql) {
    return {
      get: (...args) => this.get(sql, ...args),
      all: (...args) => this.all(sql, ...args),
      run: (...args) => this.run(sql, ...args)
    };
  }

  close() {
    if (this.tx) {
      try { this.tx.close(); } catch {}
      this.tx = null;
    }
    return this.client.close();
  }
}

export function createDatabase(urlOrConfig) {
  let client;
  if (typeof urlOrConfig === "object" && urlOrConfig !== null && urlOrConfig.execute) {
    return urlOrConfig instanceof DbWrapper ? urlOrConfig : new DbWrapper(urlOrConfig);
  }
  if (typeof urlOrConfig === "string") {
    client = createClient({ url: urlOrConfig });
  } else if (urlOrConfig && typeof urlOrConfig === "object") {
    client = createClient(urlOrConfig);
  } else {
    const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;
    if (tursoUrl && (tursoUrl.startsWith("libsql://") || tursoUrl.startsWith("https://") || tursoUrl.startsWith("http://"))) {
      client = createClient({
        url: tursoUrl,
        authToken: tursoToken
      });
    } else {
      const configuredPath = process.env.DATABASE_PATH ?? "./data/hostel.sqlite";
      let databaseUrl;
      if (configuredPath === ":memory:") {
        databaseUrl = ":memory:";
      } else {
        const databasePath = path.resolve(projectRoot, configuredPath);
        try {
          fs.mkdirSync(path.dirname(databasePath), { recursive: true });
        } catch {}
        databaseUrl = `file:${databasePath.replace(/\\/g, "/")}`;
      }
      client = createClient({ url: databaseUrl });
    }
  }
  return new DbWrapper(client);
}

const db = createDatabase();
export default db;
