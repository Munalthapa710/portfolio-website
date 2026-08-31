const fs = require("fs");
const path = require("path");

const CONTENT_PATH = "data/site-content.json";

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  response.end(JSON.stringify(body));
}

async function readFromGitHub() {
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

  if (!result.ok) {
    throw new Error(`GitHub content read failed with ${result.status}`);
  }

  const payload = await result.json();
  return JSON.parse(Buffer.from(payload.content, "base64").toString("utf8"));
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, { message: "Method not allowed" });
  }

  try {
    const githubContent = await readFromGitHub();
    if (githubContent) return sendJson(response, 200, githubContent);
  } catch (error) {
    console.error("Remote content unavailable:", error);
  }

  const localPath = path.join(process.cwd(), CONTENT_PATH);
  const localContent = JSON.parse(fs.readFileSync(localPath, "utf8"));
  return sendJson(response, 200, localContent);
};
