(function () {
  "use strict";

  const sections = [
    ["overview", "Overview", "bi-bar-chart"],
    ["basics", "Basics", "bi-person-badge"],
    ["hero", "Hero", "bi-house"],
    ["about", "About", "bi-info-circle"],
    ["skills", "Skills", "bi-stars"],
    ["resume", "Resume", "bi-file-earmark-text"],
    ["projects", "Projects", "bi-grid"],
    ["services", "Services", "bi-layers"],
    ["testimonials", "Testimonials", "bi-chat-square-quote"],
    ["blog", "Blog", "bi-journal-text"],
    ["contact", "Contact", "bi-envelope"],
    ["media", "Media", "bi-image"],
    ["messages", "Messages", "bi-inbox"],
    ["analytics", "Analytics", "bi-graph-up"],
    ["theme", "Theme", "bi-palette"],
    ["json", "JSON", "bi-code-square"]
  ];

  let content = null;
  let adminState = { media: [], messages: [], activity: [], analytics: {} };
  let csrfToken = localStorage.getItem("portfolio_admin_csrf") || "";
  let activeSection = "overview";

  const loginView = document.querySelector("#loginView");
  const editorView = document.querySelector("#editorView");
  const sectionNav = document.querySelector("#sectionNav");
  const panels = document.querySelector("#editorPanels");
  const activeTitle = document.querySelector("#activeTitle");
  const editorStatus = document.querySelector("#editorStatus");

  function requestWithTimeout(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => window.clearTimeout(timeout));
  }

  function requestError(error, fallback) {
    if (error?.name === "AbortError") return "The server took too long to respond. Please try again.";
    return error?.message || fallback;
  }

  function setStatus(message, type = "") {
    editorStatus.textContent = message;
    editorStatus.className = `status ${type}`.trim();
  }

  function pathGet(target, path) {
    return path.split(".").reduce((value, key) => value?.[key], target);
  }

  function pathSet(target, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    const parent = keys.reduce((object, key) => object[key], target);
    parent[last] = value;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function field(label, path, type = "text", className = "") {
    const value = pathGet(content, path) ?? "";
    const id = `field-${path.replace(/[^a-z0-9]/gi, "-")}`;
    const checked = path.endsWith(".isPublished") ? value !== false : value === true;
    const input =
      type === "textarea"
        ? `<textarea id="${id}" data-path="${path}">${escapeHtml(value)}</textarea>`
        : type === "checkbox"
          ? `<label class="toggle-field"><input id="${id}" data-path="${path}" type="checkbox" ${checked ? "checked" : ""} /> <span>${escapeHtml(label)}</span></label>`
        : `<input id="${id}" data-path="${path}" type="${type}" value="${escapeHtml(value)}" />`;
    if (type === "checkbox") return `<div class="${className}">${input}</div>`;
    return `<div class="${className}"><label for="${id}">${escapeHtml(label)}</label>${input}</div>`;
  }

  function splitValue(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function bindFields(root = panels) {
    root.querySelectorAll("[data-path]").forEach((input) => {
      input.addEventListener("input", () => {
        const value = input.type === "checkbox" ? input.checked : input.type === "number" ? Number(input.value) : input.value;
        pathSet(content, input.dataset.path, value);
        renderJsonPanel();
      });
    });
  }

  function renderNav() {
    sectionNav.innerHTML = sections
      .map(
        ([key, label, icon]) =>
          `<button type="button" data-section="${key}" class="${key === activeSection ? "active" : ""}"><i class="bi ${icon}"></i> ${label}</button>`
      )
      .join("");

    sectionNav.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        activeSection = button.dataset.section;
        showSection();
      });
    });
  }

  function repeatCard(title, html, onRemove) {
    return `<article class="repeat-card"><div class="repeat-header"><h3>${escapeHtml(title)}</h3><button type="button" class="remove-button" data-remove="${onRemove}"><i class="bi bi-trash"></i></button></div>${html}</article>`;
  }

  function panel(key, html) {
    return `<section class="panel ${key === activeSection ? "active" : ""}" data-panel="${key}">${html}</section>`;
  }

  function renderBasics() {
    return panel(
      "basics",
      `<div class="group"><div class="group-header"><h3>Site Identity</h3></div><div class="field-grid">
        ${field("Browser title", "meta.title", "text", "full")}
        ${field("Meta description", "meta.description", "textarea", "full")}
        ${field("Meta keywords", "meta.keywords", "textarea", "full")}
        ${field("Site URL", "meta.siteUrl")}
        ${field("Open Graph image", "meta.ogImage")}
        ${field("First name", "profile.firstName")}
        ${field("Last name", "profile.lastName")}
        ${field("Site name", "profile.siteName")}
        ${field("Portrait path", "profile.portrait")}
        ${field("CV path", "profile.cv")}
      </div></div>
      <div class="group"><div class="group-header"><h3>Social Links</h3><button type="button" data-add="socials"><i class="bi bi-plus-lg"></i> Add</button></div>
        ${(content.socials || [])
          .map((item, index) =>
            repeatCard(
              item.label || `Social ${index + 1}`,
              `<div class="field-grid">${field("Label", `socials.${index}.label`)}${field("Icon class", `socials.${index}.icon`)}${field("URL", `socials.${index}.url`, "text", "full")}</div>`,
              `socials.${index}`
            )
          )
          .join("")}
      </div>`
    );
  }

  function renderOverview() {
    const mainProjects = content.projects?.main?.length || 0;
    const freelanceProjects = content.projects?.freelance?.length || 0;
    const publishedProjects = [...(content.projects?.main || []), ...(content.projects?.freelance || [])].filter((item) => item.isPublished !== false).length;
    const analytics = adminState.analytics || {};
    return panel(
      "overview",
      `<div class="overview-grid">
        <article class="stat-card"><span>Total projects</span><strong>${mainProjects + freelanceProjects}</strong></article>
        <article class="stat-card"><span>Published projects</span><strong>${publishedProjects}</strong></article>
        <article class="stat-card"><span>Messages</span><strong>${(adminState.messages || []).length}</strong></article>
        <article class="stat-card"><span>Page views</span><strong>${analytics.views || 0}</strong></article>
      </div>
      <div class="group"><div class="group-header"><h3>Last activity</h3></div>
        <div class="activity-list">${(adminState.activity || []).slice(0, 8).map((item) => `<p><strong>${escapeHtml(item.message)}</strong><br><span>${escapeHtml(item.at || "")}</span>${item.commit ? `<code>${escapeHtml(item.commit)}</code>` : ""}</p>`).join("") || "<p>No activity yet.</p>"}</div>
      </div>`
    );
  }

  function renderHero() {
    return panel(
      "hero",
      `<div class="group"><div class="group-header"><h3>Hero Copy</h3></div><div class="field-grid">
        ${field("Roles, comma separated", "hero.rolesText", "textarea", "full")}
        ${field("Primary label", "hero.primaryAction.label")}
        ${field("Primary URL", "hero.primaryAction.url")}
        ${field("Secondary label", "hero.secondaryAction.label")}
        ${field("Secondary URL", "hero.secondaryAction.url")}
        ${field("Ticker, comma separated", "hero.tickerText", "textarea", "full")}
      </div></div>
      <div class="group"><div class="group-header"><h3>Hero Cards</h3><button type="button" data-add="hero.metaCards"><i class="bi bi-plus-lg"></i> Add</button></div>
        ${(content.hero.metaCards || [])
          .map((item, index) => repeatCard(item.label || `Card ${index + 1}`, `<div class="field-grid">${field("Label", `hero.metaCards.${index}.label`)}${field("Value", `hero.metaCards.${index}.value`)}</div>`, `hero.metaCards.${index}`))
          .join("")}
      </div>`
    );
  }

  function renderAbout() {
    return panel(
      "about",
      `<div class="group"><div class="group-header"><h3>Story</h3></div><div class="field-grid">
        ${field("Lead", "about.lead", "textarea", "full")}
        ${field("Body", "about.body", "textarea", "full")}
      </div></div>
      <div class="group"><div class="group-header"><h3>Details</h3><button type="button" data-add="about.details"><i class="bi bi-plus-lg"></i> Add</button></div>${(content.about.details || [])
        .map((item, index) => repeatCard(item.label || `Detail ${index + 1}`, `<div class="field-grid">${field("Label", `about.details.${index}.label`)}${field("Value", `about.details.${index}.value`)}</div>`, `about.details.${index}`))
        .join("")}</div>
      <div class="group"><div class="group-header"><h3>Focus Cards</h3><button type="button" data-add="about.focus"><i class="bi bi-plus-lg"></i> Add</button></div>${(content.about.focus || [])
        .map((item, index) => repeatCard(item.title || `Focus ${index + 1}`, `<div class="field-grid">${field("Icon class", `about.focus.${index}.icon`)}${field("Title", `about.focus.${index}.title`)}${field("Description", `about.focus.${index}.description`, "textarea", "full")}</div>`, `about.focus.${index}`))
        .join("")}</div>`
    );
  }

  function renderSkills() {
    return panel(
      "skills",
      `<div class="group"><div class="group-header"><h3>Skill Bars</h3><button type="button" data-add="skills.items"><i class="bi bi-plus-lg"></i> Add</button></div>
        <div class="field-grid">${field("Core title", "skills.coreTitle")}${field("Strengths title", "skills.strengthsTitle")}${field("Strengths, comma separated", "skills.strengthsText", "textarea", "full")}${field("Quote", "skills.quote", "textarea", "full")}</div>
        ${(content.skills.items || [])
          .map((item, index) => repeatCard(item.name || `Skill ${index + 1}`, `<div class="field-grid">${field("Name", `skills.items.${index}.name`)}${field("Level", `skills.items.${index}.level`, "number")}</div>`, `skills.items.${index}`))
          .join("")}
      </div>`
    );
  }

  function renderResume() {
    return panel(
      "resume",
      `<div class="group"><div class="group-header"><h3>Experience</h3><button type="button" data-add="resume.experiences"><i class="bi bi-plus-lg"></i> Add</button></div>${(content.resume.experiences || [])
        .map((item, index) => repeatCard(item.role || `Experience ${index + 1}`, `<div class="field-grid">${field("Role", `resume.experiences.${index}.role`)}${field("Period", `resume.experiences.${index}.period`)}${field("Company", `resume.experiences.${index}.company`)}${field("Logo", `resume.experiences.${index}.logo`)}${field("Description", `resume.experiences.${index}.description`, "textarea", "full")}</div>`, `resume.experiences.${index}`))
        .join("")}</div>
      <div class="group"><div class="group-header"><h3>Education</h3><button type="button" data-add="resume.education"><i class="bi bi-plus-lg"></i> Add</button></div>${(content.resume.education || [])
        .map((item, index) => repeatCard(item.title || `Education ${index + 1}`, `<div class="field-grid">${field("Title", `resume.education.${index}.title`)}${field("Period", `resume.education.${index}.period`)}${field("Place", `resume.education.${index}.place`)}${field("Description", `resume.education.${index}.description`, "textarea", "full")}</div>`, `resume.education.${index}`))
        .join("")}</div>
      <div class="group"><div class="group-header"><h3>Snapshot and Process</h3><button type="button" data-add="resume.snapshot"><i class="bi bi-plus-lg"></i> Snapshot</button></div>
        <div class="field-grid">${field("Process title", "resume.processTitle")}${field("Process", "resume.process", "textarea", "full")}</div>
        ${(content.resume.snapshot || []).map((item, index) => repeatCard(item.label || `Snapshot ${index + 1}`, `<div class="field-grid">${field("Label", `resume.snapshot.${index}.label`)}${field("Value", `resume.snapshot.${index}.value`)}</div>`, `resume.snapshot.${index}`)).join("")}
      </div>`
    );
  }

  function projectFields(path) {
    return `<div class="field-grid">${field("Published", `${path}.isPublished`, "checkbox")}${field("Featured", `${path}.featured`, "checkbox")}${field("Tag", `${path}.tag`)}${field("Title", `${path}.title`)}${field("Image path", `${path}.image`)}${field("Image alt", `${path}.imageAlt`)}${field("Extra image class", `${path}.imageClass`)}${field("Tech, comma separated", `${path}.techText`)}${field("Description", `${path}.description`, "textarea", "full")}${field("Links as label|url per line", `${path}.linksText`, "textarea", "full")}</div>`;
  }

  function renderProjects() {
    return panel(
      "projects",
      `<div class="group"><div class="group-header"><h3>Main Projects</h3><button type="button" data-add="projects.main"><i class="bi bi-plus-lg"></i> Add</button></div>${(content.projects.main || [])
        .map((item, index) => repeatCard(item.title || `Project ${index + 1}`, projectFields(`projects.main.${index}`), `projects.main.${index}`))
        .join("")}</div>
      <div class="group"><div class="group-header"><h3>Freelance Projects</h3><button type="button" data-add="projects.freelance"><i class="bi bi-plus-lg"></i> Add</button></div>
        <div class="field-grid">${field("Freelance heading", "projects.freelanceTitle", "text", "full")}</div>
        ${(content.projects.freelance || []).map((item, index) => repeatCard(item.title || `Freelance ${index + 1}`, projectFields(`projects.freelance.${index}`), `projects.freelance.${index}`)).join("")}
      </div>`
    );
  }

  function serviceFields(path) {
    return `<div class="field-grid">${field("Published", `${path}.isPublished`, "checkbox")}${field("Icon class", `${path}.icon`)}${field("Title", `${path}.title`)}${field("Price", `${path}.price`)}${field("Description", `${path}.description`, "textarea", "full")}</div>`;
  }

  function renderServices() {
    content.services = content.services || { title: "Services", items: [] };
    return panel(
      "services",
      `<div class="group"><div class="group-header"><h3>Services</h3><button type="button" data-add="services.items"><i class="bi bi-plus-lg"></i> Add</button></div>
        <div class="field-grid">${field("Section title", "services.title", "text", "full")}</div>
        ${(content.services.items || []).map((item, index) => repeatCard(item.title || `Service ${index + 1}`, serviceFields(`services.items.${index}`), `services.items.${index}`)).join("")}
      </div>`
    );
  }

  function renderTestimonials() {
    content.testimonials = content.testimonials || { title: "Testimonials", items: [] };
    return panel(
      "testimonials",
      `<div class="group"><div class="group-header"><h3>Testimonials</h3><button type="button" data-add="testimonials.items"><i class="bi bi-plus-lg"></i> Add</button></div>
        <div class="field-grid">${field("Section title", "testimonials.title", "text", "full")}</div>
        ${(content.testimonials.items || []).map((item, index) => repeatCard(item.name || `Testimonial ${index + 1}`, `<div class="field-grid">${field("Published", `testimonials.items.${index}.isPublished`, "checkbox")}${field("Name", `testimonials.items.${index}.name`)}${field("Role", `testimonials.items.${index}.role`)}${field("Quote", `testimonials.items.${index}.quote`, "textarea", "full")}</div>`, `testimonials.items.${index}`)).join("")}
      </div>`
    );
  }

  function renderBlog() {
    content.blog = content.blog || { title: "Notes", items: [] };
    return panel(
      "blog",
      `<div class="group"><div class="group-header"><h3>Blog / Notes</h3><button type="button" data-add="blog.items"><i class="bi bi-plus-lg"></i> Add</button></div>
        <div class="field-grid">${field("Section title", "blog.title", "text", "full")}</div>
        ${(content.blog.items || []).map((item, index) => repeatCard(item.title || `Post ${index + 1}`, `<div class="field-grid">${field("Published", `blog.items.${index}.isPublished`, "checkbox")}${field("Title", `blog.items.${index}.title`)}${field("Date", `blog.items.${index}.date`, "date")}${field("URL", `blog.items.${index}.url`, "text", "full")}${field("Excerpt", `blog.items.${index}.excerpt`, "textarea", "full")}</div>`, `blog.items.${index}`)).join("")}
      </div>`
    );
  }

  function renderContact() {
    return panel(
      "contact",
      `<div class="group"><div class="group-header"><h3>Contact Details</h3></div><div class="field-grid">
        ${field("Address", "contact.address")}
        ${field("Phone", "contact.phone")}
        ${field("Phone link", "contact.phoneLink")}
        ${field("Email", "contact.email")}
        ${field("Email link", "contact.emailLink")}
        ${field("Footer text", "contact.footerText", "textarea", "full")}
      </div></div>`
    );
  }

  function renderMedia() {
    return panel(
      "media",
      `<div class="group"><div class="group-header"><h3>Upload Media</h3></div>
        <label for="mediaUpload">Image, SVG, PDF, or CV file</label>
        <input id="mediaUpload" type="file" accept="image/*,.svg,.pdf" />
        <p class="status">Uploaded files are committed to <code>assets/uploads</code>. Use the returned path in image or CV fields.</p>
      </div>
      <div class="media-grid">${(adminState.media || []).map((item) => `<article class="group media-item">${item.type?.startsWith("image/") ? `<img src="${escapeHtml(item.url)}" alt="">` : `<div class="file-tile"><i class="bi bi-file-earmark-pdf"></i></div>`}<h3>${escapeHtml(item.title)}</h3><code>${escapeHtml(item.url)}</code><button type="button" class="admin-button-secondary copy-path" data-copy="${escapeHtml(item.url)}"><i class="bi bi-copy"></i> Copy path</button></article>`).join("") || '<div class="group"><p>No uploads yet.</p></div>'}</div>`
    );
  }

  function renderMessages() {
    return panel(
      "messages",
      `<div class="message-grid">${(adminState.messages || []).map((item) => `<article class="group"><h3>${escapeHtml(item.subject)}</h3><p><strong>${escapeHtml(item.name)}</strong><br><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a></p><p>${escapeHtml(item.message)}</p><span>${escapeHtml(item.createdAt || "")}</span></article>`).join("") || '<div class="group"><p>No contact messages yet.</p></div>'}</div>`
    );
  }

  function renderAnalytics() {
    const analytics = adminState.analytics || {};
    return panel(
      "analytics",
      `<div class="overview-grid">
        <article class="stat-card"><span>Views</span><strong>${analytics.views || 0}</strong></article>
        <article class="stat-card"><span>Contact clicks</span><strong>${analytics.contactClicks || 0}</strong></article>
        <article class="stat-card"><span>CV downloads</span><strong>${analytics.cvDownloads || 0}</strong></article>
        <article class="stat-card"><span>Project clicks</span><strong>${analytics.projectClicks || 0}</strong></article>
      </div>
      <div class="group"><div class="group-header"><h3>Recent events</h3></div>${(analytics.events || []).slice(0, 20).map((item) => `<p><strong>${escapeHtml(item.type)}</strong> ${escapeHtml(item.label || "")}<br><span>${escapeHtml(item.at || "")}</span></p>`).join("") || "<p>No analytics yet.</p>"}</div>`
    );
  }

  function renderTheme() {
    content.theme = content.theme || { mode: "dark", accentColor: "#ff7a18", accentSecondary: "#ffd35f" };
    return panel(
      "theme",
      `<div class="group"><div class="group-header"><h3>Theme and SEO</h3></div><div class="field-grid">
        ${field("Theme mode", "theme.mode")}
        ${field("Accent color", "theme.accentColor", "color")}
        ${field("Secondary accent", "theme.accentSecondary", "color")}
        ${field("Open Graph image", "meta.ogImage")}
        ${field("Site URL", "meta.siteUrl")}
      </div></div>`
    );
  }

  function renderJsonPanel() {
    const json = document.querySelector("#rawJson");
    if (json && document.activeElement !== json) {
      json.value = JSON.stringify(toSaveableContent(), null, 2);
    }
  }

  function renderJson() {
    return panel("json", `<div class="group"><div class="group-header"><h3>Raw JSON</h3></div><label for="rawJson">Full content file</label><textarea id="rawJson" class="full-json">${escapeHtml(JSON.stringify(toSaveableContent(), null, 2))}</textarea></div>`);
  }

  function prepareEditorContent(data) {
    const copy = structuredClone(data);
    copy.hero.rolesText = (copy.hero.roles || []).join(", ");
    copy.hero.tickerText = (copy.hero.ticker || []).join(", ");
    copy.skills.strengthsText = (copy.skills.strengths || []).join(", ");
    for (const group of [copy.projects.main, copy.projects.freelance]) {
      (group || []).forEach((project) => {
        project.techText = (project.tech || []).join(", ");
        project.linksText = (project.links || []).map((link) => `${link.label}|${link.url}`).join("\n");
      });
    }
    return copy;
  }

  function toSaveableContent() {
    const copy = structuredClone(content);
    copy.hero.roles = splitValue(copy.hero.rolesText);
    copy.hero.ticker = splitValue(copy.hero.tickerText);
    copy.skills.strengths = splitValue(copy.skills.strengthsText);
    delete copy.hero.rolesText;
    delete copy.hero.tickerText;
    delete copy.skills.strengthsText;

    for (const group of [copy.projects.main, copy.projects.freelance]) {
      (group || []).forEach((project) => {
        project.tech = splitValue(project.techText);
        project.links = String(project.linksText || "")
          .split("\n")
          .map((line) => {
            const [label, ...urlParts] = line.split("|");
            return { label: label?.trim(), url: urlParts.join("|").trim() };
          })
          .filter((link) => link.label && link.url);
        delete project.techText;
        delete project.linksText;
      });
    }
    return copy;
  }

  function isValidLink(value) {
    if (!value) return true;
    return /^(https?:\/\/|mailto:|tel:|#|\/|\.\/)/i.test(String(value));
  }

  function validateBeforeSave(next) {
    const errors = [];
    if (!next.profile?.siteName) errors.push("Site name is required.");
    if (next.contact?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.contact.email)) errors.push("Contact email is invalid.");

    for (const skill of next.skills?.items || []) {
      if (Number(skill.level) < 0 || Number(skill.level) > 100) errors.push(`${skill.name || "Skill"} level must be between 0 and 100.`);
    }

    const projectGroups = [...(next.projects?.main || []), ...(next.projects?.freelance || [])];
    for (const project of projectGroups) {
      if (!project.title) errors.push("Every project needs a title.");
      for (const link of project.links || []) {
        if (!isValidLink(link.url)) errors.push(`${project.title || "Project"} has an invalid link: ${link.url}`);
      }
    }

    for (const link of next.socials || []) {
      if (!isValidLink(link.url)) errors.push(`${link.label || "Social link"} has an invalid URL.`);
    }

    if (errors.length) throw new Error(errors.slice(0, 4).join(" "));
  }

  function showSection() {
    renderNav();
    activeTitle.textContent = sections.find(([key]) => key === activeSection)?.[1] || "Admin";
    panels.querySelectorAll(".panel").forEach((panelElement) => {
      panelElement.classList.toggle("active", panelElement.dataset.panel === activeSection);
    });
  }

  function renderEditor() {
    panels.innerHTML = [renderOverview(), renderBasics(), renderHero(), renderAbout(), renderSkills(), renderResume(), renderProjects(), renderServices(), renderTestimonials(), renderBlog(), renderContact(), renderMedia(), renderMessages(), renderAnalytics(), renderTheme(), renderJson()].join("");
    bindFields();
    bindRepeatActions();
    bindRawJson();
    renderNav();
    showSection();
  }

  function emptyItem(path) {
    if (path === "socials") return { label: "New Link", icon: "bi-link-45deg", url: "#" };
    if (path === "hero.metaCards") return { label: "Label", value: "Value" };
    if (path === "about.details") return { label: "Label", value: "Value" };
    if (path === "about.focus") return { icon: "bi-star", title: "Focus", description: "Description" };
    if (path === "skills.items") return { name: "Skill", level: 80 };
    if (path === "resume.experiences") return { role: "Role", period: "Period", company: "Company", logo: "assets/img/logobits.png", description: "Description" };
    if (path === "resume.education") return { title: "Degree", period: "Period", place: "School", description: "Description" };
    if (path === "resume.snapshot") return { label: "Label", value: "Value" };
    if (path === "services.items") return { icon: "bi-star", title: "Service", description: "Description", price: "Custom quote", isPublished: true };
    if (path === "testimonials.items") return { name: "Client", role: "Project", quote: "Quote", isPublished: true };
    if (path === "blog.items") return { title: "New note", date: new Date().toISOString().slice(0, 10), excerpt: "Excerpt", url: "#contact", isPublished: true };
    return { tag: "Tag", title: "Project", description: "Description", image: "assets/img/munal-portrait-2026.jpg", imageAlt: "Project preview", imageClass: "", featured: false, isPublished: true, techText: "HTML, CSS", linksText: "Live Site|#" };
  }

  function bindRepeatActions() {
    panels.querySelectorAll("[data-add]").forEach((button) => {
      button.addEventListener("click", () => {
        pathGet(content, button.dataset.add).push(emptyItem(button.dataset.add));
        renderEditor();
      });
    });

    panels.querySelectorAll("[data-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        const parts = button.dataset.remove.split(".");
        const index = Number(parts.pop());
        const list = pathGet(content, parts.join("."));
        list.splice(index, 1);
        renderEditor();
      });
    });
  }

  function bindRawJson() {
    const json = document.querySelector("#rawJson");
    if (!json) return;
    json.addEventListener("input", () => {
      try {
        content = prepareEditorContent(JSON.parse(json.value));
        setStatus("JSON is valid.", "success");
      } catch (error) {
        setStatus(error.message, "error");
      }
    });
  }

  async function loadContent() {
    const response = await requestWithTimeout("/api/admin-content");
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "Could not load content.");
    content = prepareEditorContent(await response.json());
    await loadAdminState();
    loginView.hidden = true;
    editorView.hidden = false;
    renderEditor();
  }

  async function loadAdminState() {
    const response = await requestWithTimeout("/api/admin-state");
    adminState = response.ok ? await response.json() : { media: [], messages: [], activity: [], analytics: {} };
  }

  document.querySelector("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.querySelector("#loginStatus");
    const submitButton = event.currentTarget.querySelector("button[type=submit]");
    status.textContent = "Signing in...";
    status.className = "status";
    submitButton.disabled = true;

    try {
      const response = await requestWithTimeout("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: document.querySelector("#adminPassword").value })
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "Login failed.");
      const result = await response.json();
      csrfToken = result.csrfToken || "";
      localStorage.setItem("portfolio_admin_csrf", csrfToken);
      status.textContent = "Loading dashboard...";
      await loadContent();
    } catch (error) {
      status.textContent = requestError(error, "Login failed.");
      status.className = "status error";
    } finally {
      submitButton.disabled = false;
    }
  });

  document.querySelector("#saveButton").addEventListener("click", async () => {
    setStatus("Saving...");
    try {
      const saveContent = toSaveableContent();
      validateBeforeSave(saveContent);
      const response = await fetch("/api/admin-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify(saveContent)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Save failed.");
      setStatus(result.commit ? `Saved. Commit ${result.commit.slice(0, 7)} created.` : "Saved.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  document.querySelector("#previewButton").addEventListener("click", () => {
    localStorage.setItem("portfolio_preview_content", JSON.stringify(toSaveableContent()));
    window.open("/?adminPreview=1", "_blank", "noopener");
  });

  document.querySelector("#logoutButton").addEventListener("click", async () => {
    await fetch("/api/admin-logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("portfolio_admin_csrf");
    loginView.hidden = false;
    editorView.hidden = true;
  });

  document.querySelector("#exportButton").addEventListener("click", () => {
    const blob = new Blob([`${JSON.stringify(toSaveableContent(), null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "site-content.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  panels.addEventListener("change", async (event) => {
    if (event.target.id !== "mediaUpload") return;
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("Uploading media...");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const response = await fetch("/api/admin-media", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
          body: JSON.stringify({ fileName: file.name, title: file.name, dataUrl: reader.result })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "Upload failed.");
        await loadAdminState();
        renderEditor();
        activeSection = "media";
        showSection();
        setStatus(`Uploaded ${result.url}`, "success");
      } catch (error) {
        setStatus(error.message, "error");
      }
    };
    reader.readAsDataURL(file);
  });

  panels.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy]");
    if (!button) return;
    await navigator.clipboard.writeText(button.dataset.copy);
    setStatus("Path copied.", "success");
  });

  document.querySelector("#importFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      content = prepareEditorContent(JSON.parse(await file.text()));
      renderEditor();
      setStatus("Imported content. Save to publish it.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  loadContent().catch(() => {
    loginView.hidden = false;
    editorView.hidden = true;
  });
})();
