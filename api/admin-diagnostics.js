const { json } = require("./_admin-utils");

module.exports = function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { message: "Method not allowed" });
  }

  return json(response, 200, {
    adminPasswordConfigured: Boolean(process.env.ADMIN_PASSWORD),
    sessionSecretConfigured: Boolean(process.env.SESSION_SECRET),
    githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN),
    githubOwnerConfigured: Boolean(process.env.GITHUB_OWNER),
    githubRepoConfigured: Boolean(process.env.GITHUB_REPO),
    githubBranch: process.env.GITHUB_BRANCH || "",
    vercelEnv: process.env.VERCEL_ENV || "",
    vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL || ""
  });
};
