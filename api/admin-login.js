const {
  json,
  getBody,
  clientIp,
  makeSessionToken,
  makeCsrfToken,
  sessionCookie,
  csrfCookie
} = require("./_admin-utils");

const attempts = new Map();
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, first: now };
  if (now - record.first > WINDOW_MS) {
    attempts.set(ip, { count: 0, first: now });
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, first: now };
  attempts.set(ip, { count: record.count + 1, first: record.first });
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { message: "Method not allowed" });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return json(response, 500, { message: "ADMIN_PASSWORD is not configured." });
  }

  const ip = clientIp(request);
  if (isRateLimited(ip)) {
    return json(response, 429, { message: "Too many login attempts. Try again later." });
  }

  try {
    const body = await getBody(request, 1e6);
    if (body.password !== process.env.ADMIN_PASSWORD) {
      recordFailure(ip);
      return json(response, 401, { message: "Invalid password." });
    }

    attempts.delete(ip);
    const secure = request.headers["x-forwarded-proto"] === "https";
    const csrf = makeCsrfToken();
    response.setHeader("Set-Cookie", [sessionCookie(makeSessionToken(60 * 60 * 24 * 7), secure), csrfCookie(csrf, secure)]);
    return json(response, 200, { ok: true, csrfToken: csrf });
  } catch (error) {
    return json(response, 400, { message: error.message || "Login failed." });
  }
};
