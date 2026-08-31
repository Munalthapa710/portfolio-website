const {
  STATE_PATH,
  json,
  getBody,
  isAuthenticated,
  hasValidCsrf,
  readJsonFile,
  writeJsonFile,
  writeGitHubFile,
  safeFileName
} = require("./_admin-utils");

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "application/pdf"]);

module.exports = async function handler(request, response) {
  if (!isAuthenticated(request)) return json(response, 401, { message: "Unauthorized." });

  try {
    if (request.method === "GET") {
      const state = await readJsonFile(STATE_PATH);
      return json(response, 200, state.media || []);
    }

    if (request.method === "POST") {
      if (!hasValidCsrf(request)) return json(response, 403, { message: "Invalid admin session token." });
      const body = await getBody(request, 12e6);
      const dataUrl = String(body.dataUrl || "");
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return json(response, 400, { message: "Invalid upload data." });
      const mimeType = match[1];
      if (!ALLOWED_TYPES.has(mimeType)) return json(response, 400, { message: "Unsupported file type." });

      const buffer = Buffer.from(match[2], "base64");
      if (buffer.length > 5 * 1024 * 1024) return json(response, 400, { message: "Upload must be 5MB or smaller." });

      const fileName = `${Date.now()}-${safeFileName(body.fileName)}`;
      const filePath = `assets/uploads/${fileName}`;
      const saved = await writeGitHubFile(filePath, buffer, `Upload portfolio media ${fileName}`);

      const state = await readJsonFile(STATE_PATH);
      const media = {
        id: saved?.content?.sha || `${Date.now()}`,
        title: body.title || body.fileName || fileName,
        url: `/${filePath}`,
        type: mimeType,
        size: buffer.length,
        createdAt: new Date().toISOString()
      };
      state.media = [media, ...(state.media || [])].slice(0, 200);
      state.activity = [{ type: "media", message: `Uploaded ${media.title}`, commit: saved?.commit?.sha, at: new Date().toISOString() }, ...(state.activity || [])].slice(0, 100);
      await writeJsonFile(STATE_PATH, state, "Record uploaded portfolio media");
      return json(response, 200, media);
    }

    response.setHeader("Allow", "GET, POST");
    return json(response, 405, { message: "Method not allowed" });
  } catch (error) {
    console.error("Admin media error:", error);
    return json(response, 500, { message: error.message || "Media request failed." });
  }
};
