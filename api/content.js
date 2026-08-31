const { CONTENT_PATH, json, readJsonFile, localJson } = require("./_admin-utils");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { message: "Method not allowed" });
  }

  try {
    const content = await readJsonFile(CONTENT_PATH);
    response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return json(response, 200, content);
  } catch (error) {
    console.error("Remote content unavailable:", error);
    return json(response, 200, localJson(CONTENT_PATH));
  }
};
