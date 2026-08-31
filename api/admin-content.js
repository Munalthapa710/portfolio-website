const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const COOKIE_NAME = "portfolio_admin";
const CONTENT_PATH = "data/site-content.json";

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function getCookie(request, name) {
  const cookie = request.headers.cookie || "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function sign(value) {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function isAuthenticated(request) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const value = `${parts[0]}.${parts[1]}`;
  const expected = sign(value);
  const received = parts[2];
  const validSignature =
    expected.length === received.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));

  return validSignature && Number(parts[0]) > Date.now();
}

function getBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2e6) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => resolve(body ? JSON.parse(body) : {}));
    request.on("error", reject);
  });
}

function validateContent(content) {
  const required = ["meta", "profile", "hero", "socials", "about", "skills", "resume", "projects", "contact"];
  for (const key of required) {
    if (!content || typeof content !== "object" || !(key in content)) {
      throw new Error(`Missing required content section: ${key}`);
    }
  }
}

async function readLocalContent() {
  const localPath = path.join(process.cwd(), CONTENT_PATH);
  return JSON.parse(fs.readFileSync(localPath, "utf8"));
}

async function readGitHubFile() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !owner || !repo) return null;

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${CONTENT_PATH}?ref=${encodeURIComponent(branch)}`;
  const result = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "portfolio-admin"
    }
  });

  if (!result.ok) throw new Error(`GitHub content read failed with ${result.status}`);
  return result.json();
}

async function writeGitHubContent(content) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !owner || !repo) {
    throw new Error("GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO are required to save changes.");
  }

  const current = await readGitHubFile();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${CONTENT_PATH}`;
  const body = {
    message: "Update portfolio content from admin panel",
    content: Buffer.from(`${JSON.stringify(content, null, 2)}\n`, "utf8").toString("base64"),
    branch,
    sha: current.sha
  };

  const result = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "portfolio-admin"
    },
    body: JSON.stringify(body)
  });

  const payload = await result.json().catch(() => ({}));
  if (!result.ok) {
    throw new Error(payload?.message || `GitHub content write failed with ${result.status}`);
  }

  return payload;
}

module.exports = async function handler(request, response) {
  if (!isAuthenticated(request)) {
    return sendJson(response, 401, { message: "Unauthorized." });
  }

  try {
    if (request.method === "GET") {
      const remote = await readGitHubFile();
      if (remote) {
        const content = JSON.parse(Buffer.from(remote.content, "base64").toString("utf8"));
        return sendJson(response, 200, content);
      }
      return sendJson(response, 200, await readLocalContent());
    }

    if (request.method === "PUT") {
      const body = await getBody(request);
      validateContent(body);
      const saved = await writeGitHubContent(body);
      return sendJson(response, 200, { ok: true, commit: saved?.commit?.sha });
    }

    response.setHeader("Allow", "GET, PUT");
    return sendJson(response, 405, { message: "Method not allowed" });
  } catch (error) {
    console.error("Admin content error:", error);
    return sendJson(response, 500, { message: error.message || "Content request failed." });
  }
};
