const { STATE_PATH, json, getBody, readJsonFile, writeJsonFile, hasGitHubConfig } = require("./_admin-utils");

const ALLOWED_EVENTS = new Set(["view", "contact_click", "cv_download", "project_click"]);

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { message: "Method not allowed" });
  }

  try {
    if (!hasGitHubConfig()) return json(response, 200, { ok: true, skipped: true });

    const body = await getBody(request, 100000);
    const type = ALLOWED_EVENTS.has(body.type) ? body.type : "view";
    const state = await readJsonFile(STATE_PATH);
    state.analytics = state.analytics || { views: 0, contactClicks: 0, cvDownloads: 0, projectClicks: 0, events: [] };

    if (type === "view") state.analytics.views = Number(state.analytics.views || 0) + 1;
    if (type === "contact_click") state.analytics.contactClicks = Number(state.analytics.contactClicks || 0) + 1;
    if (type === "cv_download") state.analytics.cvDownloads = Number(state.analytics.cvDownloads || 0) + 1;
    if (type === "project_click") state.analytics.projectClicks = Number(state.analytics.projectClicks || 0) + 1;

    state.analytics.events = [
      {
        type,
        label: String(body.label || "").slice(0, 120),
        path: String(body.path || "").slice(0, 180),
        at: new Date().toISOString()
      },
      ...(state.analytics.events || [])
    ].slice(0, 200);

    await writeJsonFile(STATE_PATH, state, "Record portfolio analytics event");
    return json(response, 200, { ok: true });
  } catch (error) {
    console.error("Analytics error:", error);
    return json(response, 200, { ok: false });
  }
};
