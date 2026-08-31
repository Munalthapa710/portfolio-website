/**
 * Template Name: MyResume
 * Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
 * Updated: Jun 29 2024 with Bootstrap v5.3.3
 * Author: BootstrapMade.com
 * License: https://bootstrapmade.com/license/
 */

(async function () {
  "use strict";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function loadSiteContent() {
    try {
      const response = await fetch("/api/content", { cache: "no-store" });
      if (!response.ok) throw new Error("Content request failed");
      return response.json();
    } catch (error) {
      console.warn("Using embedded portfolio content.", error);
      return null;
    }
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element && value !== undefined) element.textContent = value;
  }

  function setLink(selector, url, label) {
    const element = document.querySelector(selector);
    if (!element) return;
    if (url !== undefined) element.href = url;
    if (label !== undefined) element.textContent = label;
  }

  function renderSocials(socials) {
    if (!Array.isArray(socials)) return;
    const html = socials
      .map(
        (social) =>
          `<a href="${escapeHtml(social.url)}" aria-label="${escapeHtml(social.label)}"><i class="bi ${escapeHtml(social.icon)}"></i></a>`
      )
      .join("");

    document.querySelectorAll(".social-links").forEach((container) => {
      container.innerHTML = html;
    });
  }

  function renderHero(content) {
    if (!content?.hero || !content?.profile) return;
    const heroTitle = document.querySelector(".hero-copy h1");
    if (heroTitle) {
      heroTitle.innerHTML = `${escapeHtml(content.profile.firstName)} <span>${escapeHtml(content.profile.lastName)}</span>`;
    }

    const typed = document.querySelector(".typed");
    if (typed && Array.isArray(content.hero.roles)) {
      typed.setAttribute("data-typed-items", content.hero.roles.join(","));
    }

    setLink(".hero-actions .btn-primary-solid", content.hero.primaryAction?.url, content.hero.primaryAction?.label);
    setLink(".hero-actions .btn-secondary-ghost", content.hero.secondaryAction?.url, content.hero.secondaryAction?.label);

    const meta = document.querySelector(".hero-meta");
    if (meta && Array.isArray(content.hero.metaCards)) {
      meta.innerHTML = content.hero.metaCards
        .map(
          (card) =>
            `<div class="hero-meta-card"><span class="meta-label">${escapeHtml(card.label)}</span><strong>${escapeHtml(card.value)}</strong></div>`
        )
        .join("");
    }

    const portrait = document.querySelector(".portrait-frame img");
    if (portrait) {
      portrait.src = content.profile.portrait;
      portrait.alt = `${content.profile.siteName} portrait`;
    }

    const ticker = document.querySelector(".ticker-track");
    if (ticker && Array.isArray(content.hero.ticker)) {
      const items = [...content.hero.ticker, ...content.hero.ticker];
      ticker.innerHTML = items.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
    }
  }

  function renderAbout(content) {
    if (!content?.about) return;
    setText(".about-story .story-lead", content.about.lead);
    setText(".about-story p:not(.story-lead)", content.about.body);

    const details = document.querySelector(".about-details");
    if (details && Array.isArray(content.about.details)) {
      details.innerHTML = content.about.details
        .map((item) => `<div class="detail-row"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`)
        .join("");
    }

    const focusGrid = document.querySelector(".focus-grid");
    if (focusGrid && Array.isArray(content.about.focus)) {
      focusGrid.innerHTML = content.about.focus
        .map(
          (item) =>
            `<article class="focus-card"><i class="bi ${escapeHtml(item.icon)}"></i><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`
        )
        .join("");
    }
  }

  function renderSkills(content) {
    if (!content?.skills) return;
    setText(".skills-card h3", content.skills.coreTitle);

    const skills = document.querySelector(".skills-content");
    if (skills && Array.isArray(content.skills.items)) {
      skills.innerHTML = content.skills.items
        .map((item) => {
          const level = Math.max(0, Math.min(100, Number(item.level) || 0));
          return `<div class="progress"><span class="skill"><span>${escapeHtml(item.name)}</span> <i class="val">${level}%</i></span><div class="progress-bar-wrap"><div class="progress-bar" role="progressbar" aria-valuenow="${level}" aria-valuemin="0" aria-valuemax="100"></div></div></div>`;
        })
        .join("");
    }

    setText(".strengths-card h3", content.skills.strengthsTitle);
    const strengths = document.querySelector(".skill-chip-grid");
    if (strengths && Array.isArray(content.skills.strengths)) {
      strengths.innerHTML = content.skills.strengths.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
    }
    setText(".quote-card p", content.skills.quote);
  }

  function renderResume(content) {
    if (!content?.resume) return;
    const timeline = document.querySelector(".timeline-card");
    if (timeline) {
      const experiences = (content.resume.experiences || [])
        .map(
          (item) =>
            `<div class="experience-item"><div class="experience-logo"><img src="${escapeHtml(item.logo)}" alt="${escapeHtml(item.company)} logo" /></div><div class="experience-content"><h4>${escapeHtml(item.role)}</h4><h5>${escapeHtml(item.period)}</h5><p><em>${escapeHtml(item.company)}</em></p><p>${escapeHtml(item.description)}</p></div></div>`
        )
        .join("");
      const education = (content.resume.education || [])
        .map(
          (item) =>
            `<div class="resume-item"><h4>${escapeHtml(item.title)}</h4><h5>${escapeHtml(item.period)}</h5><p><em>${escapeHtml(item.place)}</em></p><p>${escapeHtml(item.description)}</p></div>`
        )
        .join("");
      timeline.innerHTML = `<h3 class="resume-title">Experience</h3>${experiences}<h3 class="resume-title">Education</h3>${education}`;
    }

    const snapshot = document.querySelector(".snapshot-list");
    if (snapshot && Array.isArray(content.resume.snapshot)) {
      snapshot.innerHTML = content.resume.snapshot
        .map((item) => `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</li>`)
        .join("");
    }
    setLink(".resume-side-card .btn-primary-solid", content.profile?.cv, "Download CV");
    setText(".process-card h3", content.resume.processTitle);
    setText(".process-card p", content.resume.process);
  }

  function projectCard(project, index) {
    const tech = (project.tech || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("");
    const links = (project.links || []).map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`).join("");
    const delay = 100 + index * 60;
    const imageClass = `project-image${project.imageClass ? ` ${escapeHtml(project.imageClass)}` : ""}`;

    return `<article class="project-card" data-aos="fade-up" data-aos-delay="${delay}"><img src="${escapeHtml(project.image)}" class="${imageClass}" alt="${escapeHtml(project.imageAlt || project.title)}" /><div class="project-body"><span class="project-tag">${escapeHtml(project.tag)}</span><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.description)}</p><div class="project-tech">${tech}</div><div class="project-links">${links}</div></div></article>`;
  }

  function renderProjects(content) {
    if (!content?.projects) return;
    const grids = document.querySelectorAll(".portfolio .project-grid");
    if (grids[0] && Array.isArray(content.projects.main)) {
      grids[0].innerHTML = content.projects.main.map(projectCard).join("");
    }
    setText(".freelance-heading .section-kicker", content.projects.freelanceTitle);
    if (grids[1] && Array.isArray(content.projects.freelance)) {
      grids[1].innerHTML = content.projects.freelance.map(projectCard).join("");
    }
  }

  function renderContact(content) {
    if (!content?.contact) return;
    const items = document.querySelectorAll(".contact-panel .info-item");
    if (items[0]) items[0].querySelector("p").textContent = content.contact.address;
    if (items[1]) {
      const phone = items[1].querySelector("a");
      phone.href = content.contact.phoneLink;
      phone.textContent = content.contact.phone;
    }
    if (items[2]) {
      const email = items[2].querySelector("a");
      email.href = content.contact.emailLink;
      email.textContent = content.contact.email;
    }
    setText(".footer .sitename", content.profile?.siteName);
    setText(".footer p", content.contact.footerText);
    setText(".copyright .px-1", content.profile?.siteName);
  }

  function renderMeta(content) {
    if (!content?.meta) return;
    document.title = content.meta.title || document.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", content.meta.description || "");
    document.querySelector('meta[name="keywords"]')?.setAttribute("content", content.meta.keywords || "");
  }

  function renderSiteContent(content) {
    if (!content) return;
    renderMeta(content);
    renderHero(content);
    renderSocials(content.socials);
    renderAbout(content);
    renderSkills(content);
    renderResume(content);
    renderProjects(content);
    renderContact(content);
  }

  renderSiteContent(await loadSiteContent());

  /**
   * Header toggle
   */
  const headerToggleBtn = document.querySelector(".header-toggle");

  function headerToggle() {
    document.querySelector("#header").classList.toggle("header-show");
    headerToggleBtn.classList.toggle("bi-list");
    headerToggleBtn.classList.toggle("bi-x");
  }
  if (headerToggleBtn) {
    headerToggleBtn.addEventListener("click", headerToggle);
  }

  /**
   * Hide mobile nav on same-page/hash links
   */
  document.querySelectorAll("#navmenu a, .mobile-bottom-nav a").forEach((navmenuLink) => {
    navmenuLink.addEventListener("click", () => {
      if (document.querySelector(".header-show")) {
        headerToggle();
      }
    });
  });

  /**
   * Toggle mobile nav dropdowns
   */
  document.querySelectorAll(".navmenu .toggle-dropdown").forEach((navmenu) => {
    navmenu.addEventListener("click", function (e) {
      e.preventDefault();
      this.parentNode.classList.toggle("active");
      this.parentNode.nextElementSibling.classList.toggle("dropdown-active");
      e.stopImmediatePropagation();
    });
  });

  /**
   * Preloader
   */
  const preloader = document.querySelector("#preloader");
  if (preloader) {
    window.addEventListener("load", () => {
      preloader.remove();
    });
  }

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector(".scroll-top");

  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100
        ? scrollTop.classList.add("active")
        : scrollTop.classList.remove("active");
    }
  }
  if (scrollTop) {
    scrollTop.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }

  window.addEventListener("load", toggleScrollTop);
  document.addEventListener("scroll", toggleScrollTop);

  /**
   * Animation on scroll function and init
   */
  function aosInit() {
    if (typeof AOS === "undefined") return;

    AOS.init({
      duration: 700,
      easing: "ease-out-cubic",
      once: true,
      mirror: false,
    });
  }
  window.addEventListener("load", aosInit);

  /**
   * Init typed.js
   */
  const selectTyped = document.querySelector(".typed");
  if (selectTyped) {
    let typed_strings = selectTyped.getAttribute("data-typed-items");
    typed_strings = typed_strings.split(",");
    new Typed(".typed", {
      strings: typed_strings,
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000,
    });
  }

  /**
   * Initiate Pure Counter
   */
  if (typeof PureCounter !== "undefined") {
    new PureCounter();
  }

  /**
   * Animate the skills items on reveal
   */
  let skillsAnimation = document.querySelectorAll(".skills-animation");
  skillsAnimation.forEach((item) => {
    new Waypoint({
      element: item,
      offset: "80%",
      handler: function (direction) {
        let progress = item.querySelectorAll(".progress .progress-bar");
        progress.forEach((el) => {
          el.style.width = el.getAttribute("aria-valuenow") + "%";
        });
      },
    });
  });

  /**
   * Initiate glightbox
   */
  if (typeof GLightbox !== "undefined") {
    GLightbox({
      selector: ".glightbox",
    });
  }

  /**
   * Init isotope layout and filters
   */
  if (
    typeof imagesLoaded !== "undefined" &&
    typeof Isotope !== "undefined"
  ) {
    document.querySelectorAll(".isotope-layout").forEach(function (isotopeItem) {
      let layout = isotopeItem.getAttribute("data-layout") ?? "masonry";
      let filter = isotopeItem.getAttribute("data-default-filter") ?? "*";
      let sort = isotopeItem.getAttribute("data-sort") ?? "original-order";

      let initIsotope;
      imagesLoaded(isotopeItem.querySelector(".isotope-container"), function () {
        initIsotope = new Isotope(
          isotopeItem.querySelector(".isotope-container"),
          {
            itemSelector: ".isotope-item",
            layoutMode: layout,
            filter: filter,
            sortBy: sort,
          }
        );
      });

      isotopeItem
        .querySelectorAll(".isotope-filters li")
        .forEach(function (filters) {
          filters.addEventListener(
            "click",
            function () {
              isotopeItem
                .querySelector(".isotope-filters .filter-active")
                .classList.remove("filter-active");
              this.classList.add("filter-active");
              initIsotope.arrange({
                filter: this.getAttribute("data-filter"),
              });
              if (typeof aosInit === "function") {
                aosInit();
              }
            },
            false
          );
        });
    });
  }

  /**
   * Init swiper sliders
   */
  function initSwiper() {
    if (typeof Swiper === "undefined") return;

    document.querySelectorAll(".init-swiper").forEach(function (swiperElement) {
      let config = JSON.parse(
        swiperElement.querySelector(".swiper-config").innerHTML.trim()
      );

      if (swiperElement.classList.contains("swiper-tab")) {
        initSwiperWithCustomPagination(swiperElement, config);
      } else {
        new Swiper(swiperElement, config);
      }
    });
  }

  window.addEventListener("load", initSwiper);

  /**
   * Correct scrolling position upon page load for URLs containing hash links.
   */
  window.addEventListener("load", function (e) {
    if (window.location.hash) {
      if (document.querySelector(window.location.hash)) {
        setTimeout(() => {
          let section = document.querySelector(window.location.hash);
          let scrollMarginTop = getComputedStyle(section).scrollMarginTop;
          window.scrollTo({
            top: section.offsetTop - parseInt(scrollMarginTop),
            behavior: "smooth",
          });
        }, 100);
      }
    }
  });

  /**
   * Navmenu Scrollspy
   */
  let navmenulinks = document.querySelectorAll(".navmenu a, .mobile-bottom-nav a");

  function navmenuScrollspy() {
    navmenulinks.forEach((navmenulink) => {
      if (!navmenulink.hash) return;
      let section = document.querySelector(navmenulink.hash);
      if (!section) return;
      let position = window.scrollY + 200;
      if (
        position >= section.offsetTop &&
        position <= section.offsetTop + section.offsetHeight
      ) {
        document
          .querySelectorAll(".navmenu a.active")
          .forEach((link) => link.classList.remove("active"));
        navmenulink.classList.add("active");
      } else {
        navmenulink.classList.remove("active");
      }
    });
  }
  window.addEventListener("load", navmenuScrollspy);
  document.addEventListener("scroll", navmenuScrollspy);

  /**
   * Contact form
   */
  const contactForm = document.querySelector("#contact-form");
  const statusBox = document.querySelector("#form-status");
  const submitButton = document.querySelector("#contactSubmit");

  function setFormStatus(type, message) {
    if (!statusBox) return;

    statusBox.className = "form-status is-visible";
    if (type) {
      statusBox.classList.add(`is-${type}`);
    }
    statusBox.textContent = message;
  }

  async function sendContactForm(event) {
    event.preventDefault();

    if (!contactForm) return;

    const payload = {
      from_name: document.querySelector("#contactName")?.value.trim(),
      from_email: document.querySelector("#contactEmail")?.value.trim(),
      subject: document.querySelector("#contactSubject")?.value.trim(),
      message: document.querySelector("#contactMessage")?.value.trim(),
    };

    if (
      !payload.from_name ||
      !payload.from_email ||
      !payload.subject ||
      !payload.message
    ) {
      setFormStatus("error", "Please fill in all fields before sending.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }
    setFormStatus("loading", "Sending your message...");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message || "Message could not be sent right now."
        );
      }

      contactForm.reset();
      setFormStatus("success", "Message sent successfully. I will get back to you soon.");
    } catch (error) {
      setFormStatus(
        "error",
        error?.message ||
          "Message could not be sent right now. Please email thapamunal710@gmail.com directly."
      );
      console.error("Contact form error:", error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send Message";
      }
    }
  }

  if (contactForm) {
    contactForm.addEventListener("submit", sendContactForm);
  }
})();
