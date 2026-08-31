const { json, clearCookies } = require("./_admin-utils");

module.exports = function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { message: "Method not allowed" });
  }

  response.setHeader("Set-Cookie", clearCookies());
  return json(response, 200, { ok: true });
};
