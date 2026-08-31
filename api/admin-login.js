const crypto = require("crypto");

const COOKIE_NAME = "portfolio_admin";
const ONE_WEEK = 60 * 60 * 24 * 7;

function sendJson(response, status, body, headers = {}) {
  response.statusCode = status;
  Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function getBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => resolve(body ? JSON.parse(body) : {}));
    request.on("error", reject);
  });
}

function sign(value) {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function makeToken() {
  const expires = Date.now() + ONE_WEEK * 1000;
  const nonce = crypto.randomBytes(16).toString("hex");
  const value = `${expires}.${nonce}`;
  return `${value}.${sign(value)}`;
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { message: "Method not allowed" });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return sendJson(response, 500, { message: "ADMIN_PASSWORD is not configured." });
  }

  try {
    const body = await getBody(request);
    if (body.password !== process.env.ADMIN_PASSWORD) {
      return sendJson(response, 401, { message: "Invalid password." });
    }

    const secure = request.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
    const cookie = `${COOKIE_NAME}=${makeToken()}; Path=/; Max-Age=${ONE_WEEK}; HttpOnly; SameSite=Lax${secure}`;
    return sendJson(response, 200, { ok: true }, { "Set-Cookie": cookie });
  } catch (error) {
    return sendJson(response, 400, { message: error.message || "Login failed." });
  }
};
