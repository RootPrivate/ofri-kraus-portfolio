const CMS_SECTIONS = ["hero", "discipline", "work", "stills", "about", "contact"];

function select(selector, parent = document) {
  return parent.querySelector(selector);
}

function setText(selector, value, parent = document) {
  const element = select(selector, parent);
  if (element && typeof value === "string") element.textContent = value;
}

function setImage(image, source, alt = "") {
  if (!image || !source) return;
  image.removeAttribute("srcset");
  image.removeAttribute("sizes");
  image.src = source;
  image.alt = alt;
}

function mixHex(hex, amount) {
  const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16));
  if (!channels || channels.some(Number.isNaN)) return hex;
  return `#${channels.map((channel) => Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, "0")).join("")}`;
}

function darkenHex(hex, amount) {
  const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16));
  if (!channels || channels.some(Number.isNaN)) return hex;
  return `#${channels.map((channel) => Math.round(channel * (1 - amount)).toString(16).padStart(2, "0")).join("")}`;
}

function applyAppearance(appearance) {
  if (!appearance) return;
  const root = document.documentElement;
  root.style.setProperty("--color-accent", appearance.accent);
  root.style.setProperty("--color-accent-hover", mixHex(appearance.accent, 0.18));
  root.style.setProperty("--color-bg", appearance.background);
  root.style.setProperty("--color-bg-soft", mixHex(appearance.background, 0.04));
  root.style.setProperty("--color-surface", appearance.surface);
  root.style.setProperty("--color-surface-strong", mixHex(appearance.surface, 0.08));
  root.style.setProperty("--color-text", appearance.text);
  root.style.setProperty("--radius-media", `${appearance.radius}px`);
  root.style.setProperty("--radius-control", `${Math.max(4, Math.round(appearance.radius * 0.75))}px`);
  root.style.setProperty("--shadow-button", `0 3px 0 ${darkenHex(appearance.accent, 0.32)}, 0 16px 34px ${appearance.accent}33`);
  document.body.dataset.fontPreset = appearance.fontPreset;
  document.body.dataset.density = appearance.density;
  document.body.classList.toggle("cms-motion-off", appearance.motion === false);
}

function updateMetadata(content) {
  document.title = content.site.pageTitle;
  document.documentElement.style.colorScheme = "dark";
  select('meta[name="description"]')?.setAttribute("content", content.site.metaDescription);
  select('meta[name="theme-color"]')?.setAttribute("content", content.appearance.background);
  select('meta[property="og:title"]')?.setAttribute("content", content.site.pageTitle);
  select('meta[property="og:description"]')?.setAttribute("content", content.site.metaDescription);
  select('meta[name="twitter:title"]')?.setAttribute("content", content.site.pageTitle);
  select('meta[name="twitter:description"]')?.setAttribute("content", content.site.metaDescription);

  const structuredData = select("#person-structured-data");
  if (structuredData) {
    structuredData.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      name: content.site.brandName,
      jobTitle: "מפיק, צלם ועורך וידאו",
      email: `mailto:${content.contact.email}`,
      telephone: content.contact.phoneHref.replace(/^tel:/, ""),
      sameAs: [content.footer.instagramUrl]
    });
  }
}

function updateNavigation(content) {
  const brand = select(".brand");
  if (brand) {
    brand.textContent = content.site.brandName;
    brand.setAttribute("aria-label", `${content.site.brandName}, חזרה לראש העמוד`);
  }
  const labels = content.site.nav;
  const links = {
    work: select('#primary-nav a[href="#work"]'),
    stills: select('#primary-nav a[href="#stills"]'),
    about: select('#primary-nav a[href="#about"]'),
    contact: select('#primary-nav a[href="#contact"]')
  };
  Object.entries(links).forEach(([section, link]) => {
    if (!link) return;
    link.textContent = labels[section];
    link.hidden = content.sectionVisibility[section] === false;
  });
}

function updateHero(content) {
  const hero = content.hero;
  setText("#hero-title", hero.title);
  setText(".hero-content > p", hero.description);
  const actions = document.querySelectorAll(".hero-actions a");
  if (actions[0]) {
    actions[0].textContent = hero.primaryCta.label;
    actions[0].href = hero.primaryCta.href;
  }
  if (actions[1]) {
    actions[1].textContent = hero.secondaryCta.label;
    actions[1].href = hero.secondaryCta.href;
  }
  setImage(select(".hero-media img"), hero.backgroundImage);
  setImage(select(".hero-stage-main img"), hero.mainImage);
  setImage(select(".hero-stage-float-one img"), hero.topImage);
  setImage(select(".hero-stage-float-two img"), hero.bottomImage);
}

function updateDiscipline(content) {
  const container = select(".discipline-inner");
  if (!container) return;
  container.replaceChildren(...content.discipline.items.map((label) => {
    const item = document.createElement("span");
    item.textContent = label;
    return item;
  }));
}

function createMediaFigure(item, isWide = false) {
  const figure = document.createElement("figure");
  figure.className = isWide ? "wide-project" : "project-card";
  if (isWide) figure.dataset.reveal = "";
  else figure.setAttribute("role", "listitem");

  const button = document.createElement("button");
  button.className = "media-button";
  button.type = "button";
  button.dataset.mediaType = item.mediaType;
  button.dataset.mediaSrc = item.mediaSrc;
  button.dataset.mediaPoster = item.poster;
  button.dataset.mediaTitle = item.title;
  button.setAttribute("aria-label", `${item.mediaType === "video" ? "ניגון" : "פתיחת"} ${item.title}`);

  const image = document.createElement("img");
  image.src = item.poster;
  image.alt = item.alt;
  image.width = isWide ? 1440 : 810;
  image.height = isWide ? 810 : 1440;
  image.loading = "lazy";
  image.decoding = "async";
  button.append(image);

  if (item.mediaType === "video") {
    const play = document.createElement("span");
    play.className = "play-control";
    play.setAttribute("aria-hidden", "true");
    play.textContent = "▶";
    button.append(play);
  }

  const caption = document.createElement("figcaption");
  caption.textContent = item.title;
  figure.append(button, caption);
  return figure;
}

function updateProjects(content) {
  const section = select("#work");
  setText("#work-title", content.work.title);
  setText(".section-intro > p", content.work.description, section);
  const rail = select("#project-rail");
  const wide = select(".wide-projects", section);
  if (!rail || !wide) return;

  const verticalProjects = content.work.projects.filter((project) => project.format === "vertical");
  const wideProjects = content.work.projects.filter((project) => project.format === "wide");
  rail.replaceChildren(...verticalProjects.map((project) => createMediaFigure(project)));
  wide.replaceChildren(...wideProjects.map((project) => createMediaFigure(project, true)));
  rail.hidden = verticalProjects.length === 0;
  wide.hidden = wideProjects.length === 0;
}

function createStillFigure(still) {
  const figure = document.createElement("figure");
  figure.className = "still-tile";
  figure.dataset.reveal = "";
  const button = document.createElement("button");
  button.className = "media-button";
  button.type = "button";
  button.dataset.mediaType = "image";
  button.dataset.mediaSrc = still.src;
  button.dataset.mediaTitle = still.title;
  button.setAttribute("aria-label", `פתיחת ${still.title}`);
  const image = document.createElement("img");
  image.src = still.src;
  image.alt = still.alt;
  image.width = 1067;
  image.height = 1600;
  image.loading = "lazy";
  image.decoding = "async";
  button.append(image);
  figure.append(button);
  return figure;
}

function updateStills(content) {
  const section = select("#stills");
  setText("#stills-title", content.stills.title);
  setText(".section-intro > p", content.stills.description, section);
  const grid = select(".stills-grid", section);
  if (grid) grid.replaceChildren(...content.stills.items.map(createStillFigure));
}

function updateAbout(content) {
  const section = select("#about");
  setText("#about-title", content.about.title);
  setImage(select(".about-media img", section), content.about.image, content.about.imageAlt);
  const copy = select(".about-copy", section);
  if (!copy) return;
  copy.querySelectorAll(":scope > p").forEach((paragraph) => paragraph.remove());
  copy.append(...content.about.paragraphs.map((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  }));
}

function updateContact(content) {
  const contact = content.contact;
  const titleLines = document.querySelectorAll("#contact-title span");
  if (titleLines[0]) titleLines[0].textContent = contact.titleLineOne;
  if (titleLines[1]) titleLines[1].textContent = contact.titleLineTwo;
  setText(".contact-copy > p", contact.description);

  const whatsapp = select(".contact-whatsapp");
  if (whatsapp) {
    whatsapp.href = contact.whatsappUrl;
    setText(":scope > span:first-child", contact.whatsappLabel, whatsapp);
  }
  const directLinks = document.querySelectorAll(".contact-direct a");
  if (directLinks[0]) {
    directLinks[0].href = `mailto:${contact.email}`;
    setText(".contact-link-label", contact.emailLabel, directLinks[0]);
    setText('[dir="ltr"]', contact.email, directLinks[0]);
  }
  if (directLinks[1]) {
    directLinks[1].href = contact.phoneHref;
    setText(".contact-link-label", contact.phoneLabel, directLinks[1]);
    setText('[dir="ltr"]', contact.phoneDisplay, directLinks[1]);
  }
}

function updateFooter(content) {
  const paragraph = select(".footer-inner > p");
  if (paragraph) {
    paragraph.replaceChildren(document.createTextNode(`${content.footer.copyrightName} © `));
    const year = document.createElement("span");
    year.id = "year";
    year.textContent = String(new Date().getFullYear());
    paragraph.append(year);
  }
  const links = document.querySelectorAll(".footer-inner nav a");
  if (links[0]) {
    links[0].href = content.contact.phoneHref;
    links[0].textContent = content.contact.phoneDisplay;
  }
  if (links[1]) {
    links[1].href = content.footer.instagramUrl;
    links[1].textContent = content.footer.instagramLabel;
  }
  if (links[2]) {
    links[2].href = content.contact.whatsappUrl;
    links[2].textContent = content.footer.whatsappLabel;
  }
}

function updateSections(content) {
  const main = select("#main-content");
  if (!main) return;
  const sections = new Map(CMS_SECTIONS.map((id) => [id, select(`[data-cms-section="${id}"]`)]));
  content.sectionOrder.forEach((id) => {
    const section = sections.get(id);
    if (section) main.append(section);
  });
  sections.forEach((section, id) => {
    if (section) section.hidden = content.sectionVisibility[id] === false;
  });
}

function applyContent(content) {
  applyAppearance(content.appearance);
  updateMetadata(content);
  updateNavigation(content);
  updateHero(content);
  updateDiscipline(content);
  updateProjects(content);
  updateStills(content);
  updateAbout(content);
  updateContact(content);
  updateFooter(content);
  updateSections(content);
}

async function loadManagedContent() {
  try {
    const response = await fetch("/api/content", { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("CMS unavailable");
    const payload = await response.json();
    if (payload?.content) applyContent(payload.content);
  } catch {
    document.getElementById("year").textContent = new Date().getFullYear();
  }
}

setupMenu();
setupLightbox();
await loadManagedContent();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("cms-motion-off");
const header = document.getElementById("site-header");
const hero = document.getElementById("top");
const primaryNav = document.getElementById("primary-nav");

if (hero.hidden) {
  header.classList.add("is-compact");
} else if ("IntersectionObserver" in window) {
  const headerObserver = new IntersectionObserver(
    ([entry]) => header.classList.toggle("is-compact", !entry.isIntersecting),
    { rootMargin: "-72px 0px 0px 0px", threshold: 0 }
  );
  headerObserver.observe(hero);
}

const revealItems = document.querySelectorAll("[data-reveal]");
if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
  revealItems.forEach((item) => revealObserver.observe(item));
}

document.querySelectorAll(".media-button img").forEach((image) => {
  const markLoaded = () => image.classList.add("is-loaded");
  if (image.complete && image.naturalWidth > 0) markLoaded();
  else image.addEventListener("load", markLoaded, { once: true });
  image.addEventListener("error", () => {
    const button = image.closest(".media-button");
    if (!button) return;
    button.disabled = true;
    button.setAttribute("aria-label", "המדיה אינה זמינה כרגע");
  }, { once: true });
});

if (!reducedMotion && window.matchMedia("(hover: hover)").matches) {
  document.querySelectorAll(".hero-stage").forEach((target) => {
    const strength = 5;
    target.addEventListener("pointermove", (event) => {
      const rect = target.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      target.style.setProperty("--tilt-x", `${(-y * strength).toFixed(2)}deg`);
      target.style.setProperty("--tilt-y", `${(x * strength).toFixed(2)}deg`);
      target.classList.add("is-tilting");
    });
    target.addEventListener("pointerleave", () => {
      target.style.setProperty("--tilt-x", "0deg");
      target.style.setProperty("--tilt-y", "0deg");
      target.classList.remove("is-tilting");
    });
  });
}

const navLinks = [...primaryNav.querySelectorAll('a[href^="#"]:not([hidden])')];
const observedSections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter((section) => section && !section.hidden);
if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => {
      const isCurrent = link.getAttribute("href") === `#${visible.target.id}`;
      if (isCurrent) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }, { rootMargin: "-22% 0px -58% 0px", threshold: [0.05, 0.25, 0.5] });
  observedSections.forEach((section) => sectionObserver.observe(section));
}

const projectRail = document.getElementById("project-rail");
const railStep = () => Math.max(280, Math.round(projectRail.clientWidth * 0.72));
const railBehavior = reducedMotion ? "auto" : "smooth";
const railNext = document.getElementById("rail-next");
const railPrevious = document.getElementById("rail-previous");
if (projectRail && railNext && railPrevious) {
  railNext.addEventListener("click", () => projectRail.scrollBy({ left: -railStep(), behavior: railBehavior }));
  railPrevious.addEventListener("click", () => projectRail.scrollBy({ left: railStep(), behavior: railBehavior }));
}

function setupMenu() {
  const header = document.getElementById("site-header");
  const menuToggle = document.getElementById("menu-toggle");
  const primaryNav = document.getElementById("primary-nav");
  const setMenuState = (isOpen) => {
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "סגירת תפריט" : "פתיחת תפריט");
    primaryNav.classList.toggle("is-open", isOpen);
    header.classList.toggle("is-menu-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
    if (isOpen) primaryNav.querySelector("a:not([hidden])")?.focus();
  };

  menuToggle.addEventListener("click", () => setMenuState(menuToggle.getAttribute("aria-expanded") !== "true"));
  primaryNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuState(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenuState(false);
      menuToggle.focus();
    }
  });
  window.matchMedia("(min-width: 961px)").addEventListener("change", (event) => {
    if (event.matches) setMenuState(false);
  });
}

function setupLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxStatus = document.getElementById("lightbox-status");
  const lightboxVideo = document.getElementById("lightbox-video");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxClose = document.getElementById("lightbox-close");
  let lastMediaTrigger = null;

  const setLightboxStatus = (message, isError = false) => {
    lightboxStatus.textContent = message;
    lightboxStatus.hidden = !message;
    lightboxStatus.classList.toggle("is-error", isError);
  };

  const resetLightboxMedia = () => {
    lightboxVideo.pause();
    lightboxVideo.removeAttribute("src");
    lightboxVideo.removeAttribute("poster");
    lightboxVideo.load();
    lightboxVideo.hidden = true;
    lightboxImage.hidden = true;
    lightboxImage.alt = "";
  };

  const openMedia = (trigger) => {
    const type = trigger.dataset.mediaType;
    const source = trigger.dataset.mediaSrc;
    const title = trigger.dataset.mediaTitle || "צפייה במדיה";
    const previewImage = trigger.querySelector("img");
    lastMediaTrigger = trigger;
    resetLightboxMedia();
    lightboxTitle.textContent = title;
    document.body.classList.add("dialog-open");
    lightbox.showModal();

    if (type === "video") {
      setLightboxStatus("טוען סרט...");
      lightboxVideo.poster = trigger.dataset.mediaPoster || "";
      lightboxVideo.src = source;
      lightboxVideo.hidden = false;
      lightboxVideo.load();
      lightboxVideo.play().catch(() => {});
      return;
    }

    setLightboxStatus("טוען תמונה...");
    lightboxImage.alt = previewImage?.alt || title;
    lightboxImage.src = source;
    lightboxImage.hidden = false;
    if (lightboxImage.complete && lightboxImage.naturalWidth > 0) setLightboxStatus("");
  };

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-media-src]");
    if (trigger && !trigger.disabled) openMedia(trigger);
  });
  lightboxVideo.addEventListener("canplay", () => setLightboxStatus(""));
  lightboxVideo.addEventListener("error", () => setLightboxStatus("לא ניתן לטעון את הסרט כרגע. אפשר לנסות שוב.", true));
  lightboxImage.addEventListener("load", () => setLightboxStatus(""));
  lightboxImage.addEventListener("error", () => setLightboxStatus("לא ניתן לטעון את התמונה כרגע. אפשר לנסות שוב.", true));
  lightboxClose.addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("close", () => {
    resetLightboxMedia();
    setLightboxStatus("");
    document.body.classList.remove("dialog-open");
    lastMediaTrigger?.focus();
  });
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
}
