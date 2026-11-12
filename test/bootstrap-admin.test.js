import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createDatabase } from "../src/db.js";
import { bootstrapInitialAdmin } from "../src/bootstrap-admin.js";

const envBase = {
  AUTH_PEPPER: "test-only-pepper-with-at-least-32-bytes",
  INITIAL_ADMIN_USERNAME: "initial_admin",
  INITIAL_ADMIN_EMAIL: "admin@example.test",
  INITIAL_ADMIN_PASSWORD: "long-enough-initial-password"
};

async function createDb() {
  const db = createDatabase(":memory:");
  await db.exec(readFileSync(new URL("../src/schema.sql", import.meta.url), "utf8"));
  return db;
}

test("deployment bootstrap creates a salted Main Admin only when none exists", async () => {
  const db = await createDb();
  try {
    assert.equal(await bootstrapInitialAdmin(db, envBase), true);
    const admin = await db.prepare(
      "SELECT username, email, password_hash, password_salt, role, role_code FROM users"
    ).get();
    assert.equal(admin.username, "initial_admin");
    assert.equal(admin.email, "admin@example.test");
    assert.equal(admin.role, "admin");
    assert.equal(admin.role_code, "main_admin");
    assert.ok(admin.password_hash);
    assert.ok(admin.password_salt);
    assert.equal(await bootstrapInitialAdmin(db, {
      ...envBase,
      INITIAL_ADMIN_PASSWORD: "another-initial-password"
    }), false);
    const countRow = await db.prepare("SELECT COUNT(*) AS count FROM users").get();
    assert.equal(countRow.count, 1);
  } finally {
    db.close();
  }
});

test("deployment bootstrap is disabled when its variables are absent", async () => {
  const db = await createDb();
  try {
    assert.equal(await bootstrapInitialAdmin(db, { AUTH_PEPPER: envBase.AUTH_PEPPER }), false);
    const countRow = await db.prepare("SELECT COUNT(*) AS count FROM users").get();
    assert.equal(countRow.count, 0);
  } finally {
    db.close();
  }
});

test("deployment bootstrap rejects incomplete configuration and conflicting identities", async () => {
  const db = await createDb();
  try {
    await assert.rejects(
      bootstrapInitialAdmin(db, { ...envBase, INITIAL_ADMIN_PASSWORD: "" }),
      /Set all INITIAL_ADMIN_USERNAME/
    );
    await db.prepare(
      `INSERT INTO users (username, email, password_hash, password_salt, role)
       VALUES ('initial_admin', 'other@example.test', 'hash', 'salt', 'student')`
    ).run();
    await assert.rejects(
      bootstrapInitialAdmin(db, envBase),
      /username or email is already used/
    );
  } finally {
    db.close();
  }
});
