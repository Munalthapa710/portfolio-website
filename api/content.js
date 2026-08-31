const { CONTENT_PATH, json, readJsonFile, localJson } = require("./_admin-utils");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { message: "Method not allowed" });
  }

  try {
    // Public traffic should use the deployment bundle and avoid a GitHub round trip.
    let content;
    try {
      content = localJson(CONTENT_PATH);
    } catch (localError) {
      content = await readJsonFile(CONTENT_PATH);
    }
    response.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
    return json(response, 200, content);
  } catch (error) {
    console.error("Remote content unavailable:", error);
    return json(response, 200, localJson(CONTENT_PATH));
  }
};
