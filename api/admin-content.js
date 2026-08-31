const {
  CONTENT_PATH,
  STATE_PATH,
  json,
  getBody,
  isAuthenticated,
  hasValidCsrf,
  readJsonFile,
  writeJsonFile
} = require("./_admin-utils");

function validateContent(content) {
  const required = ["meta", "profile", "hero", "socials", "about", "skills", "resume", "projects", "contact"];
  for (const key of required) {
    if (!content || typeof content !== "object" || !(key in content)) {
      throw new Error(`Missing required content section: ${key}`);
    }
  }
}

async function appendActivity(entry) {
  const state = await readJsonFile(STATE_PATH);
  state.activity = [{ ...entry, at: new Date().toISOString() }, ...(state.activity || [])].slice(0, 100);
  await writeJsonFile(STATE_PATH, state, "Record portfolio admin activity");
}

module.exports = async function handler(request, response) {
  if (!isAuthenticated(request)) {
    return json(response, 401, { message: "Unauthorized." });
  }

  try {
    if (request.method === "GET") {
      return json(response, 200, await readJsonFile(CONTENT_PATH));
    }

    if (request.method === "PUT") {
      if (!hasValidCsrf(request)) return json(response, 403, { message: "Invalid admin session token." });
      const body = await getBody(request, 4e6);
      validateContent(body);
      body.updatedAt = new Date().toISOString();
      const saved = await writeJsonFile(CONTENT_PATH, body, "Update portfolio content from admin panel");
      await appendActivity({ type: "content", message: "Updated website content", commit: saved?.commit?.sha });
      return json(response, 200, { ok: true, commit: saved?.commit?.sha });
    }

    response.setHeader("Allow", "GET, PUT");
    return json(response, 405, { message: "Method not allowed" });
  } catch (error) {
    console.error("Admin content error:", error);
    return json(response, 500, { message: error.message || "Content request failed." });
  }
};
