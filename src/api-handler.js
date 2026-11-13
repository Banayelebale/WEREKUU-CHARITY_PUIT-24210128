import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAuth } from "./auth.js";
import { createConfigBackupStore } from "./backups.js";
import { bootstrapInitialAdmin } from "./bootstrap-admin.js";
import { createOtpEmailSender } from "./email.js";
import { createOperations } from "./operations.js";
import db from "./db.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backupDirectory = path.resolve(projectRoot, process.env.BACKUP_DIRECTORY ?? "./backups");

const auth = createAuth(db, process.env.AUTH_PEPPER, {
  demoOtpEnabled: process.env.DEMO_OTP === "true",
  sendOtpEmail: process.env.DEMO_OTP === "true" ? undefined : createOtpEmailSender()
});
if (process.env.DEMO_OTP === "true") {
  console.warn("DEMO_OTP is enabled: OTPs are returned in API responses and email verification is bypassed.");
}
const backups = createConfigBackupStore(db, process.env.BACKUP_ENCRYPTION_KEY, backupDirectory);
const operations = createOperations(db);

let isDbReady = false;
export async function ensureDatabaseReady() {
  if (isDbReady) return;
  try {
    const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    await db.exec(schema);
    await bootstrapInitialAdmin(db);
    isDbReady = true;
  } catch (err) {
    console.error("Database ready check failed:", err);
  }
}

export function sendJson(response, result) {
  if (result.cookie) {
    response.setHeader("Set-Cookie", result.cookie);
  }
  if (typeof response.status === "function" && typeof response.json === "function") {
    response.status(result.status).json(result.body);
    return;
  }
  response.writeHead(result.status, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(result.body));
}

export async function readJson(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    return request.body;
  }
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    return { error: "Content-Type must be application/json.", status: 415 };
  }
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > 16_384) {
      return { error: "Request body is too large.", status: 413 };
    }
  }
  try {
    const data = JSON.parse(body);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Expected a JSON object.");
    return data;
  } catch {
    return { error: "Request body must be a valid JSON object.", status: 400 };
  }
}

export async function handleApiRequest(request, response) {
  await ensureDatabaseReady();

  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );

  try {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const rewrittenRoute = requestUrl.pathname === "/api/index.js"
      ? requestUrl.searchParams.get("route")
      : null;
    const pathname = rewrittenRoute
      ? `/api/${rewrittenRoute.replace(/^\/+/, "")}`
      : requestUrl.pathname;

    if (["POST", "PATCH", "DELETE"].includes(request.method) && request.headers.origin) {
      try {
        const origin = new URL(request.headers.origin);
        const host = request.headers.host || request.headers["x-forwarded-host"];
        if (host && origin.host !== host) {
          sendJson(response, { status: 403, body: { error: "Cross-origin request rejected." } });
          return;
        }
      } catch {}
    }

    if (pathname === "/api/health" && request.method === "GET") {
      await db.prepare("SELECT 1").get();
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ status: "ok", database: "connected" }));
      return;
    }

    if (request.method === "GET" && pathname === "/api/dashboard") {
      const user = await auth.currentUser(request);
      sendJson(response, user
        ? await operations.dashboard(user.id)
        : { status: 401, body: { error: "Sign in required." } });
      return;
    }

    const roomRoute = pathname.match(/^\/api\/rooms\/(\d+)$/);
    if (request.method === "GET" && roomRoute) {
      const user = await auth.currentUser(request);
      sendJson(response, user
        ? await operations.roomDetails(user.id, Number(roomRoute[1]))
        : { status: 401, body: { error: "Sign in required." } });
      return;
    }

    if (request.method === "GET" && pathname === "/api/reports") {
      const user = await auth.currentUser(request);
      sendJson(response, user
        ? await operations.reports(user.id)
        : { status: 401, body: { error: "Sign in required." } });
      return;
    }

    if (request.method === "POST" && pathname === "/api/registrations") {
      const user = await auth.currentUser(request);
      if (!user) {
        sendJson(response, { status: 401, body: { error: "Sign in required." } });
        return;
      }
      const body = await readJson(request);
      if (body.error) {
        sendJson(response, { status: body.status, body: { error: body.error } });
        return;
      }
      sendJson(response, await operations.registerResident(user.id, body));
      return;
    }

    const assignRoomRoute = pathname.match(/^\/api\/registrations\/(\d+)\/room$/);
    if (request.method === "PATCH" && assignRoomRoute) {
      const user = await auth.currentUser(request);
      if (!user) {
        sendJson(response, { status: 401, body: { error: "Sign in required." } });
        return;
      }
      const body = await readJson(request);
      if (body.error) {
        sendJson(response, { status: body.status, body: { error: body.error } });
        return;
      }
      const roomId = body.roomId === null ? null : Number(body.roomId);
      sendJson(response, await operations.assignRoom(user.id, Number(assignRoomRoute[1]), roomId));
      return;
    }

    const checkInRoute = pathname.match(/^\/api\/registrations\/(\d+)\/check-in$/);
    if (request.method === "POST" && checkInRoute) {
      const user = await auth.currentUser(request);
      sendJson(response, user
        ? await operations.checkIn(user.id, Number(checkInRoute[1]))
        : { status: 401, body: { error: "Sign in required." } });
      return;
    }

    const checkOutRoute = pathname.match(/^\/api\/registrations\/(\d+)\/check-out$/);
    if (request.method === "POST" && checkOutRoute) {
      const user = await auth.currentUser(request);
      sendJson(response, user
        ? await operations.checkOut(user.id, Number(checkOutRoute[1]))
        : { status: 401, body: { error: "Sign in required." } });
      return;
    }

    if (request.method === "POST" && pathname.startsWith("/api/auth/")) {
      const body = await readJson(request);
      if (body.error) {
        sendJson(response, { status: body.status, body: { error: body.error } });
        return;
      }

      let result;
      if (pathname === "/api/auth/register") result = await auth.register(body, request);
      else if (pathname === "/api/auth/login") result = await auth.login(body, request);
      else if (pathname === "/api/auth/resend-otp") result = await auth.resendOtp(body, request);
      else if (pathname === "/api/auth/verify-otp") result = await auth.verifyOtp(body);
      else if (pathname === "/api/auth/logout") result = await auth.logout(request);
      else {
        sendJson(response, { status: 404, body: { error: "Not found." } });
        return;
      }
      sendJson(response, result);
      return;
    }

    if (request.method === "GET" && pathname === "/api/admin/users") {
      const user = await auth.currentUser(request);
      const result = user
        ? await auth.listUsers(user.id)
        : { status: 401, body: { error: "Sign in required." } };
      sendJson(response, result);
      return;
    }

    if (request.method === "GET" && pathname === "/api/admin/security") {
      const user = await auth.currentUser(request);
      sendJson(response, user
        ? await auth.securityInfo(user.id)
        : { status: 401, body: { error: "Sign in required." } });
      return;
    }

    if (request.method === "GET" && pathname === "/api/admin/archived-users") {
      const user = await auth.currentUser(request);
      const result = user
        ? await auth.listArchivedUsers(user.id)
        : { status: 401, body: { error: "Sign in required." } };
      sendJson(response, result);
      return;
    }

    if (request.method === "GET" && pathname === "/api/admin/backups") {
      const user = await auth.currentUser(request);
      sendJson(response, user
        ? await backups.list(user.id)
        : { status: 401, body: { error: "Sign in required." } });
      return;
    }

    if (request.method === "POST" && pathname === "/api/admin/backups") {
      const user = await auth.currentUser(request);
      sendJson(response, user
        ? await backups.create(user.id)
        : { status: 401, body: { error: "Sign in required." } });
      return;
    }

    const backupRestoreRoute = pathname.match(/^\/api\/admin\/backups\/([a-f0-9-]{36})\/restore$/);
    if (request.method === "POST" && backupRestoreRoute) {
      const user = await auth.currentUser(request);
      sendJson(response, user
        ? await backups.restore(user.id, backupRestoreRoute[1])
        : { status: 401, body: { error: "Sign in required." } });
      return;
    }

    const archiveRoute = pathname.match(/^\/api\/admin\/users\/(\d+)\/archive$/);
    if (request.method === "POST" && archiveRoute) {
      const user = await auth.currentUser(request);
      if (!user) {
        sendJson(response, { status: 401, body: { error: "Sign in required." } });
        return;
      }
      sendJson(response, await auth.archiveUser(user.id, Number(archiveRoute[1])));
      return;
    }

    const deleteUserRoute = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
    if (request.method === "DELETE" && deleteUserRoute) {
      const user = await auth.currentUser(request);
      if (!user) {
        sendJson(response, { status: 401, body: { error: "Sign in required." } });
        return;
      }
      sendJson(response, await auth.deleteUser(user.id, Number(deleteUserRoute[1])));
      return;
    }

    const restoreRoute = pathname.match(/^\/api\/admin\/archived-users\/(\d+)\/restore$/);
    if (request.method === "POST" && restoreRoute) {
      const user = await auth.currentUser(request);
      if (!user) {
        sendJson(response, { status: 401, body: { error: "Sign in required." } });
        return;
      }
      sendJson(response, await auth.restoreUser(user.id, Number(restoreRoute[1])));
      return;
    }

    const roleRoute = pathname.match(/^\/api\/admin\/users\/(\d+)\/role$/);
    if (request.method === "PATCH" && roleRoute) {
      const user = await auth.currentUser(request);
      if (!user) {
        sendJson(response, { status: 401, body: { error: "Sign in required." } });
        return;
      }
      const body = await readJson(request);
      if (body.error) {
        sendJson(response, { status: body.status, body: { error: body.error } });
        return;
      }
      sendJson(response, await auth.setUserRole(user.id, Number(roleRoute[1]), body.role));
      return;
    }

    const accountRoute = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
    if (request.method === "PATCH" && accountRoute) {
      const user = await auth.currentUser(request);
      if (!user) {
        sendJson(response, { status: 401, body: { error: "Sign in required." } });
        return;
      }
      const body = await readJson(request);
      if (body.error) {
        sendJson(response, { status: body.status, body: { error: body.error } });
        return;
      }
      sendJson(response, await auth.updateUser(user.id, Number(accountRoute[1]), body));
      return;
    }

    if (request.method === "GET" && pathname === "/api/auth/me") {
      const user = await auth.currentUser(request);
      sendJson(response, { status: 200, body: { user } });
      return;
    }

    sendJson(response, { status: 404, body: { error: "API endpoint not found." } });
  } catch (error) {
    console.error("API request failed:", error);
    if (!response.headersSent) {
      sendJson(response, { status: 500, body: { error: "Internal server error." } });
    } else {
      response.destroy();
    }
  }
}
