(function () {
  "use strict";

  const sections = [
    ["basics", "Basics", "bi-person-badge"],
    ["hero", "Hero", "bi-house"],
    ["about", "About", "bi-info-circle"],
    ["skills", "Skills", "bi-stars"],
    ["resume", "Resume", "bi-file-earmark-text"],
    ["projects", "Projects", "bi-grid"],
    ["contact", "Contact", "bi-envelope"],
    ["json", "JSON", "bi-code-square"]
  ];

  let content = null;
  let activeSection = "basics";

  const loginView = document.querySelector("#loginView");
  const editorView = document.querySelector("#editorView");
  const sectionNav = document.querySelector("#sectionNav");
  const panels = document.querySelector("#editorPanels");
  const activeTitle = document.querySelector("#activeTitle");
  const editorStatus = document.querySelector("#editorStatus");

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
    const input =
      type === "textarea"
        ? `<textarea id="${id}" data-path="${path}">${escapeHtml(value)}</textarea>`
        : `<input id="${id}" data-path="${path}" type="${type}" value="${escapeHtml(value)}" />`;
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
        pathSet(content, input.dataset.path, input.type === "number" ? Number(input.value) : input.value);
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
    return `<div class="field-grid">${field("Tag", `${path}.tag`)}${field("Title", `${path}.title`)}${field("Image path", `${path}.image`)}${field("Image alt", `${path}.imageAlt`)}${field("Extra image class", `${path}.imageClass`)}${field("Tech, comma separated", `${path}.techText`)}${field("Description", `${path}.description`, "textarea", "full")}${field("Links as label|url per line", `${path}.linksText`, "textarea", "full")}</div>`;
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

  function showSection() {
    renderNav();
    activeTitle.textContent = sections.find(([key]) => key === activeSection)?.[1] || "Admin";
    panels.querySelectorAll(".panel").forEach((panelElement) => {
      panelElement.classList.toggle("active", panelElement.dataset.panel === activeSection);
    });
  }

  function renderEditor() {
    panels.innerHTML = [renderBasics(), renderHero(), renderAbout(), renderSkills(), renderResume(), renderProjects(), renderContact(), renderJson()].join("");
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
    return { tag: "Tag", title: "Project", description: "Description", image: "assets/img/munal-portrait-2026.jpg", imageAlt: "Project preview", imageClass: "", techText: "HTML, CSS", linksText: "Live Site|#" };
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
    const response = await fetch("/api/admin-content");
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "Could not load content.");
    content = prepareEditorContent(await response.json());
    loginView.hidden = true;
    editorView.hidden = false;
    renderEditor();
  }

  document.querySelector("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.querySelector("#loginStatus");
    status.textContent = "Signing in...";
    status.className = "status";

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: document.querySelector("#adminPassword").value })
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "Login failed.");
      await loadContent();
    } catch (error) {
      status.textContent = error.message;
      status.className = "status error";
    }
  });

  document.querySelector("#saveButton").addEventListener("click", async () => {
    setStatus("Saving...");
    try {
      const response = await fetch("/api/admin-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSaveableContent())
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Save failed.");
      setStatus(result.commit ? `Saved. Commit ${result.commit.slice(0, 7)} created.` : "Saved.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    }
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
