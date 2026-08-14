import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { access, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { pipeline } from "node:stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "dist");
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

// ─── MIME types (Google-friendly content types) ──────────────────────────────
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".map": "application/json; charset=utf-8",
};

// Files Google bots crawl directly — must always be reachable
const wellKnownFiles = new Set([
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-index.xml",
  "/sitemap-pages.xml",
  "/sitemap-tools.xml",
  "/sitemap-categories.xml",
  "/sitemap-blog.xml",
  "/sitemap-images.xml",
  "/site.webmanifest",
  "/manifest.json",
  "/humans.txt",
  "/security.txt",
  "/ads.txt",
  "/browserconfig.xml",
  "/favicon.ico",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/og-image.png",
  "/.well-known/security.txt",
]);

// ─── Rate limiting (per IP, sliding window) ──────────────────────────────────
const rateWindowMs = 60_000;
const maxRequestsPerWindow = 300;
const requestBuckets = new Map();

function getClientId(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return request.socket.remoteAddress ?? "unknown";
}

function allowRequest(clientId) {
  const now = Date.now();
  const bucket = requestBuckets.get(clientId) ?? [];
  const fresh = bucket.filter((stamp) => now - stamp < rateWindowMs);
  if (fresh.length >= maxRequestsPerWindow) {
    requestBuckets.set(clientId, fresh);
    return false;
  }
  fresh.push(now);
  requestBuckets.set(clientId, fresh);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [clientId, stamps] of requestBuckets.entries()) {
    const fresh = stamps.filter((stamp) => now - stamp < rateWindowMs);
    if (fresh.length === 0) requestBuckets.delete(clientId);
    else requestBuckets.set(clientId, fresh);
  }
}, rateWindowMs).unref();

// Don't rate-limit known good crawlers
function isCrawler(userAgent = "") {
  return /googlebot|bingbot|duckduckbot|yandex|baiduspider|slurp|facebookexternalhit|twitterbot|linkedinbot|pinterestbot|whatsapp|telegram/i.test(
    userAgent
  );
}

// ─── Security headers (production-grade, but crawler-friendly) ───────────────
function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // CSP that allows Google services (Analytics, AdSense, Identity, Fonts)
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://scripts.clarity.ms https://pagead2.googlesyndication.com https://accounts.google.com https://*.googlesyndication.com https://*.google.com https://*.gstatic.com https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "worker-src 'self' blob: https://cdn.jsdelivr.net",
      "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://*.analytics.google.com https://www.clarity.ms https://*.clarity.ms https://*.googleapis.com https://accounts.google.com https://api.qrserver.com https://i.ytimg.com https://cdn.jsdelivr.net https://unpkg.com https://static.imgly.com https://text.pollinations.ai",
      "frame-src 'self' https://accounts.google.com https://*.google.com https://*.googlesyndication.com",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ")
  );
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
}

function setCacheHeaders(res, ext, urlPath) {
  if (urlPath === "/robots.txt" || urlPath.startsWith("/sitemap") || urlPath === "/ads.txt") {
    res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
    return;
  }
  if (urlPath === "/site.webmanifest" || urlPath === "/manifest.json" || urlPath === "/browserconfig.xml") {
    res.setHeader("Cache-Control", "public, max-age=86400");
    return;
  }
  if (ext === ".html" || urlPath === "/") {
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    return;
  }
  if ([".js", ".css", ".woff", ".woff2", ".ttf"].includes(ext)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }
  if ([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg", ".ico"].includes(ext)) {
    res.setHeader("Cache-Control", "public, max-age=2592000");
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=86400");
}

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

async function fileExists(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

function toSafePath(requestPath) {
  // Decode + normalize, prevent path traversal
  const decoded = decodeURIComponent(requestPath);
  const resolved = path.resolve(distDir, "." + decoded);
  return resolved.startsWith(distDir) ? resolved : null;
}

const COMPRESSIBLE = new Set([".html", ".js", ".css", ".svg", ".xml", ".txt", ".json", ".webmanifest", ".map"]);

function shouldCompress(req, ext) {
  if (!COMPRESSIBLE.has(ext)) return false;
  const ae = req.headers["accept-encoding"] ?? "";
  return /\b(br|gzip)\b/i.test(String(ae));
}

function pickEncoding(req) {
  const ae = String(req.headers["accept-encoding"] ?? "");
  if (/\bbr\b/i.test(ae)) return "br";
  if (/\bgzip\b/i.test(ae)) return "gzip";
  return null;
}

async function serveFile(req, res, filePath, urlPath) {
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", mimeTypes[ext] ?? "application/octet-stream");
  res.setHeader("Vary", "Accept-Encoding");
  setCacheHeaders(res, ext, urlPath);

  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("error", reject);

    if (shouldCompress(req, ext)) {
      const enc = pickEncoding(req);
      if (enc === "br") {
        res.setHeader("Content-Encoding", "br");
        pipeline(stream, zlib.createBrotliCompress(), res, (err) => (err ? reject(err) : resolve()));
        return;
      }
      if (enc === "gzip") {
        res.setHeader("Content-Encoding", "gzip");
        pipeline(stream, zlib.createGzip(), res, (err) => (err ? reject(err) : resolve()));
        return;
      }
    }

    stream.on("end", resolve);
    stream.pipe(res);
  });
}

async function ensureDistExists() {
  try {
    await access(distDir);
  } catch {
    await mkdir(distDir, { recursive: true });
  }
}

await ensureDistExists();

const server = createServer(async (request, response) => {
  applySecurityHeaders(response);

  // Always allow important SEO files even if rate-limited
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const requestPath = url.pathname;
  const isWellKnown = wellKnownFiles.has(requestPath);
  const ua = String(request.headers["user-agent"] ?? "");

  if (!isWellKnown && !isCrawler(ua)) {
    const clientId = getClientId(request);
    if (!allowRequest(clientId)) {
      send(response, 429, { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "60" }, "Rate limit exceeded.");
      return;
    }
  }

  // Health check endpoint (good for Hostinger / uptime monitors)
  if (requestPath === "/healthz") {
    send(response, 200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, ts: Date.now() }));
    return;
  }

  const safePath = toSafePath(requestPath);
  if (!safePath) {
    send(response, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Invalid request path.");
    return;
  }

  // File-with-extension request → serve from disk
  if (path.extname(requestPath)) {
    if (await fileExists(safePath)) {
      try {
        await serveFile(request, response, safePath, requestPath);
      } catch {
        if (!response.writableEnded) send(response, 500, { "Content-Type": "text/plain" }, "Server error.");
      }
      return;
    }
    send(response, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found.");
    return;
  }

  // SPA fallback → serve index.html for all other routes
  const htmlPath = path.join(distDir, "index.html");
  if (await fileExists(htmlPath)) {
    try {
      await serveFile(request, response, htmlPath, "/");
    } catch {
      if (!response.writableEnded) send(response, 500, { "Content-Type": "text/plain" }, "Server error.");
    }
    return;
  }

  send(response, 503, { "Content-Type": "text/plain; charset=utf-8" }, "Build the app first with `npm run build`.");
});

server.listen(port, () => {
  console.log(`🚀 Logoviking server running on http://localhost:${port}`);
  console.log(`📄 Sitemap index: http://localhost:${port}/sitemap-index.xml`);
  console.log(`🤖 Robots: http://localhost:${port}/robots.txt`);
  console.log(`✅ Health check: http://localhost:${port}/healthz`);
});
