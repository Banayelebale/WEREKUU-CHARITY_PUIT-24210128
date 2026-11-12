import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest, ensureDatabaseReady } from "./api-handler.js";
import db from "./db.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDirectory = path.join(projectRoot, "public");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

  if (pathname.startsWith("/api/")) {
    return handleApiRequest(request, response);
  }

  if (request.method === "GET" || request.method === "HEAD") {
    const appRoutes = new Set(["/", "/dashboard", "/reports", "/admin", "/implementation-report"]);
    const dashboardDetailRoute = /^\/dashboard\/(?:check-ins|pending|check-outs|available-beds|occupancy|rooms\/\d+)$/.test(pathname);
    const fileName = appRoutes.has(pathname) || dashboardDetailRoute ? "index.html" : pathname.slice(1);
    if (!["index.html", "styles.css", "app.js"].includes(fileName)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    const filePath = path.join(publicDirectory, fileName);
    fs.readFile(filePath, (error, content) => {
      if (error) {
        console.error(`Failed to serve ${fileName}:`, error);
        response.writeHead(500);
        response.end("Internal server error");
        return;
      }
      response.writeHead(200, {
        "Content-Type": contentTypes[path.extname(filePath)],
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer"
      });
      response.end(request.method === "HEAD" ? undefined : content);
    });
    return;
  }

  response.writeHead(405, { Allow: "GET, HEAD, POST, PATCH" });
  response.end();
});

await ensureDatabaseReady();
server.listen(port, host, () => {
  console.log(`Hostel Management System is running on http://${host}:${port}`);
});

function closeServer() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
