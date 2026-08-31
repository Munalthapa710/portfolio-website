const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const COOKIE_NAME = "portfolio_admin";
const CSRF_COOKIE_NAME = "portfolio_csrf";
const CONTENT_PATH = "data/site-content.json";
const STATE_PATH = "data/admin-state.json";

function json(response, status, body, headers = {}) {
  response.statusCode = status;
  Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function getBody(request, limit = 2e6) {
  if (typeof request.body === "string") return Promise.resolve(JSON.parse(request.body || "{}"));
  if (request.body && typeof request.body === "object") return Promise.resolve(request.body);

  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function getCookie(request, name) {
  const cookie = request.headers.cookie || "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function secret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "portfolio-admin-dev-secret";
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function timingEqual(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function isAuthenticated(request) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const value = `${parts[0]}.${parts[1]}`;
  return timingEqual(sign(value), parts[2]) && Number(parts[0]) > Date.now();
}

function makeSessionToken(maxAgeSeconds) {
  const expires = Date.now() + maxAgeSeconds * 1000;
  const nonce = crypto.randomBytes(16).toString("hex");
  const value = `${expires}.${nonce}`;
  return `${value}.${sign(value)}`;
}

function makeCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

function csrfCookie(token, secure) {
  return `${CSRF_COOKIE_NAME}=${token}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function sessionCookie(token, secure) {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${60 * 60 * 24 * 7}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function clearCookies() {
  return [
    `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    `${CSRF_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`
  ];
}

function hasValidCsrf(request) {
  const header = request.headers["x-csrf-token"];
  const cookie = getCookie(request, CSRF_COOKIE_NAME);
  return Boolean(header && cookie && timingEqual(String(header), String(cookie)));
}

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!token || !owner || !repo) return null;
  return { token, owner, repo, branch };
}

function hasGitHubConfig() {
  return Boolean(githubConfig());
}

async function githubRequest(url, options = {}) {
  const config = githubConfig();
  if (!config) throw new Error("GitHub persistence is not configured.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    response = await fetch(url, {
    ...options,
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "portfolio-admin",
      ...(options.headers || {})
    }
    });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("GitHub request timed out. Please try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `GitHub request failed with ${response.status}`);
  return payload;
}

async function readGitHubFile(filePath) {
  const config = githubConfig();
  if (!config) return null;
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}?ref=${encodeURIComponent(config.branch)}`;
  return githubRequest(url);
}

async function readJsonFile(filePath) {
  const remote = await readGitHubFile(filePath);
  if (remote?.content) return JSON.parse(Buffer.from(remote.content, "base64").toString("utf8"));
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), "utf8"));
}

async function writeGitHubFile(filePath, content, message) {
  const config = githubConfig();
  if (!config) throw new Error("GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO are required to save changes.");
  const current = await readGitHubFile(filePath).catch((error) => {
    if (/Not Found/i.test(error.message)) return null;
    throw error;
  });
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`;
  const body = {
    message,
    content: Buffer.isBuffer(content) ? content.toString("base64") : Buffer.from(String(content), "utf8").toString("base64"),
    branch: config.branch
  };
  if (current?.sha) body.sha = current.sha;
  return githubRequest(url, { method: "PUT", body: JSON.stringify(body) });
}

async function writeJsonFile(filePath, data, message) {
  return writeGitHubFile(filePath, `${JSON.stringify(data, null, 2)}\n`, message);
}

function localJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), "utf8"));
}

function clientIp(request) {
  return String(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function safeFileName(name) {
  return String(name || "upload")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "upload";
}

module.exports = {
  CONTENT_PATH,
  STATE_PATH,
  COOKIE_NAME,
  CSRF_COOKIE_NAME,
  json,
  getBody,
  getCookie,
  isAuthenticated,
  makeSessionToken,
  makeCsrfToken,
  csrfCookie,
  sessionCookie,
  clearCookies,
  hasValidCsrf,
  readJsonFile,
  writeJsonFile,
  writeGitHubFile,
  localJson,
  clientIp,
  safeFileName,
  hasGitHubConfig
};
