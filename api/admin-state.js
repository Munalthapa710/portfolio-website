const { STATE_PATH, json, isAuthenticated, readJsonFile } = require("./_admin-utils");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { message: "Method not allowed" });
  }

  if (!isAuthenticated(request)) return json(response, 401, { message: "Unauthorized." });

  try {
    return json(response, 200, await readJsonFile(STATE_PATH));
  } catch (error) {
    console.error("Admin state error:", error);
    return json(response, 500, { message: error.message || "Could not load admin state." });
  }
};
