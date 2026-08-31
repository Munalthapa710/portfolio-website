const { CONTENT_PATH, readJsonFile } = require("./_admin-utils");

function siteUrl(request) {
  return process.env.SITE_URL || `https://${request.headers.host || "www.munalthapa710.com.np"}`;
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.statusCode = 405;
    response.end("Method not allowed");
    return;
  }

  const base = siteUrl(request).replace(/\/$/, "");
  const content = await readJsonFile(CONTENT_PATH).catch(() => ({}));
  const urls = [
    "",
    "#about",
    "#skills",
    "#resume",
    "#portfolio",
    "#services",
    "#testimonials",
    "#blog",
    "#contact"
  ];
  const lastmod = content.updatedAt || new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${base}/${url}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`;

  response.setHeader("Content-Type", "application/xml; charset=utf-8");
  response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  response.end(xml);
};
