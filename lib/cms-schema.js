import { cloneDefaultContent } from "../content/default-content.js";

export const CMS_SECTIONS = ["hero", "discipline", "work", "stills", "about", "contact"];

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cleanText(value, fallback, maxLength = 500) {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, maxLength);
}

function cleanRequiredText(value, fallback, maxLength = 500) {
  return cleanText(value, fallback, maxLength) || fallback;
}

function cleanHex(value, fallback) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : fallback;
}

function cleanId(value, fallback) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(normalized) ? normalized : fallback;
}

function isSafeRelativeUrl(value) {
  return !value.startsWith("//") && !value.includes("\\") && !value.includes("..") && !/[\u0000-\u001F]/.test(value);
}

function cleanMediaUrl(value, fallback) {
  const normalized = cleanText(value, "", 1800);
  if (!normalized) return fallback;
  if (/^https:\/\//i.test(normalized)) return normalized;
  if ((normalized.startsWith("/") || /^[a-z0-9]/i.test(normalized)) && !normalized.includes(":") && isSafeRelativeUrl(normalized)) return normalized;
  return fallback;
}

function cleanHref(value, fallback) {
  const normalized = cleanText(value, "", 1800);
  if (!normalized) return fallback;
  if (/^(https:\/\/|mailto:|tel:|#[a-z0-9_-]+$)/i.test(normalized)) return normalized;
  if (normalized.startsWith("/") && isSafeRelativeUrl(normalized)) return normalized;
  return fallback;
}

function cleanBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function cleanArray(value, fallback) {
  return Array.isArray(value) ? value : fallback;
}

function cleanProject(project, fallback, index) {
  const source = asObject(project);
  return {
    id: cleanId(source.id, fallback?.id || `project-${index + 1}`),
    title: cleanRequiredText(source.title, fallback?.title || `פרויקט ${index + 1}`, 120),
    format: ["vertical", "wide"].includes(source.format) ? source.format : fallback?.format || "vertical",
    mediaType: ["video", "image"].includes(source.mediaType) ? source.mediaType : fallback?.mediaType || "video",
    mediaSrc: cleanMediaUrl(source.mediaSrc, fallback?.mediaSrc || ""),
    poster: cleanMediaUrl(source.poster, fallback?.poster || "assets/optimized/thumb-01.webp"),
    alt: cleanRequiredText(source.alt, fallback?.alt || source.title || "עבודת וידאו", 240)
  };
}

function cleanStill(item, fallback, index) {
  const source = asObject(item);
  return {
    id: cleanId(source.id, fallback?.id || `still-${index + 1}`),
    title: cleanRequiredText(source.title, fallback?.title || `צילום ${index + 1}`, 120),
    src: cleanMediaUrl(source.src, fallback?.src || "assets/optimized/photo-01.webp"),
    alt: cleanRequiredText(source.alt, fallback?.alt || source.title || "צילום סטילס", 240)
  };
}

export function normalizeContent(input) {
  const fallback = cloneDefaultContent();
  const source = asObject(input);
  const site = asObject(source.site);
  const nav = asObject(site.nav);
  const appearance = asObject(source.appearance);
  const hero = asObject(source.hero);
  const primaryCta = asObject(hero.primaryCta);
  const secondaryCta = asObject(hero.secondaryCta);
  const discipline = asObject(source.discipline);
  const work = asObject(source.work);
  const stills = asObject(source.stills);
  const about = asObject(source.about);
  const contact = asObject(source.contact);
  const footer = asObject(source.footer);
  const visibility = asObject(source.sectionVisibility);

  const requestedOrder = cleanArray(source.sectionOrder, fallback.sectionOrder)
    .filter((id) => CMS_SECTIONS.includes(id));
  const sectionOrder = [...new Set([...requestedOrder, ...CMS_SECTIONS])];

  const rawProjects = cleanArray(work.projects, fallback.work.projects).slice(0, 30);
  const rawStills = cleanArray(stills.items, fallback.stills.items).slice(0, 60);
  const rawParagraphs = cleanArray(about.paragraphs, fallback.about.paragraphs).slice(0, 8);
  const rawDisciplines = cleanArray(discipline.items, fallback.discipline.items).slice(0, 6);

  return {
    schemaVersion: 1,
    revision: cleanRequiredText(source.revision, fallback.revision, 80),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
    site: {
      brandName: cleanRequiredText(site.brandName, fallback.site.brandName, 100),
      pageTitle: cleanRequiredText(site.pageTitle, fallback.site.pageTitle, 180),
      metaDescription: cleanRequiredText(site.metaDescription, fallback.site.metaDescription, 320),
      nav: {
        work: cleanRequiredText(nav.work, fallback.site.nav.work, 40),
        stills: cleanRequiredText(nav.stills, fallback.site.nav.stills, 40),
        about: cleanRequiredText(nav.about, fallback.site.nav.about, 40),
        contact: cleanRequiredText(nav.contact, fallback.site.nav.contact, 40)
      }
    },
    appearance: {
      accent: cleanHex(appearance.accent, fallback.appearance.accent),
      background: cleanHex(appearance.background, fallback.appearance.background),
      surface: cleanHex(appearance.surface, fallback.appearance.surface),
      text: cleanHex(appearance.text, fallback.appearance.text),
      radius: Math.min(24, Math.max(4, Number.isFinite(Number(appearance.radius)) ? Number(appearance.radius) : fallback.appearance.radius)),
      fontPreset: ["heebo", "system"].includes(appearance.fontPreset) ? appearance.fontPreset : fallback.appearance.fontPreset,
      density: ["compact", "comfortable", "airy"].includes(appearance.density) ? appearance.density : fallback.appearance.density,
      motion: cleanBoolean(appearance.motion, fallback.appearance.motion)
    },
    sectionOrder,
    sectionVisibility: Object.fromEntries(
      CMS_SECTIONS.map((id) => [id, cleanBoolean(visibility[id], fallback.sectionVisibility[id])])
    ),
    hero: {
      title: cleanRequiredText(hero.title, fallback.hero.title, 120),
      description: cleanRequiredText(hero.description, fallback.hero.description, 600),
      primaryCta: {
        label: cleanRequiredText(primaryCta.label, fallback.hero.primaryCta.label, 80),
        href: cleanHref(primaryCta.href, fallback.hero.primaryCta.href)
      },
      secondaryCta: {
        label: cleanRequiredText(secondaryCta.label, fallback.hero.secondaryCta.label, 80),
        href: cleanHref(secondaryCta.href, fallback.hero.secondaryCta.href)
      },
      backgroundImage: cleanMediaUrl(hero.backgroundImage, fallback.hero.backgroundImage),
      mainImage: cleanMediaUrl(hero.mainImage, fallback.hero.mainImage),
      topImage: cleanMediaUrl(hero.topImage, fallback.hero.topImage),
      bottomImage: cleanMediaUrl(hero.bottomImage, fallback.hero.bottomImage)
    },
    discipline: {
      items: rawDisciplines.map((item, index) => cleanRequiredText(item, fallback.discipline.items[index] || `תחום ${index + 1}`, 60))
    },
    work: {
      title: cleanRequiredText(work.title, fallback.work.title, 180),
      description: cleanRequiredText(work.description, fallback.work.description, 2200),
      projects: rawProjects.map((project, index) => cleanProject(project, fallback.work.projects[index], index))
    },
    stills: {
      title: cleanRequiredText(stills.title, fallback.stills.title, 180),
      description: cleanRequiredText(stills.description, fallback.stills.description, 2200),
      items: rawStills.map((item, index) => cleanStill(item, fallback.stills.items[index], index))
    },
    about: {
      title: cleanRequiredText(about.title, fallback.about.title, 180),
      paragraphs: rawParagraphs.map((paragraph, index) => cleanRequiredText(paragraph, fallback.about.paragraphs[index] || "", 1800)),
      image: cleanMediaUrl(about.image, fallback.about.image),
      imageAlt: cleanRequiredText(about.imageAlt, fallback.about.imageAlt, 240)
    },
    contact: {
      titleLineOne: cleanRequiredText(contact.titleLineOne, fallback.contact.titleLineOne, 100),
      titleLineTwo: cleanRequiredText(contact.titleLineTwo, fallback.contact.titleLineTwo, 100),
      description: cleanRequiredText(contact.description, fallback.contact.description, 420),
      whatsappLabel: cleanRequiredText(contact.whatsappLabel, fallback.contact.whatsappLabel, 100),
      whatsappUrl: cleanHref(contact.whatsappUrl, fallback.contact.whatsappUrl),
      emailLabel: cleanRequiredText(contact.emailLabel, fallback.contact.emailLabel, 60),
      email: cleanRequiredText(contact.email, fallback.contact.email, 180),
      phoneLabel: cleanRequiredText(contact.phoneLabel, fallback.contact.phoneLabel, 60),
      phoneDisplay: cleanRequiredText(contact.phoneDisplay, fallback.contact.phoneDisplay, 60),
      phoneHref: cleanHref(contact.phoneHref, fallback.contact.phoneHref)
    },
    footer: {
      copyrightName: cleanRequiredText(footer.copyrightName, fallback.footer.copyrightName, 100),
      instagramLabel: cleanRequiredText(footer.instagramLabel, fallback.footer.instagramLabel, 60),
      instagramUrl: cleanHref(footer.instagramUrl, fallback.footer.instagramUrl),
      whatsappLabel: cleanRequiredText(footer.whatsappLabel, fallback.footer.whatsappLabel, 60)
    }
  };
}
