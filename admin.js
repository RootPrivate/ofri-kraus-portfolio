const state = {
  owner: null,
  content: null,
  media: [],
  dirty: false,
  saving: false,
  activePanel: "overview"
};

const authView = document.getElementById("auth-view");
const adminApp = document.getElementById("admin-app");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const contentForm = document.getElementById("content-form");
const accountForm = document.getElementById("account-form");
const accountError = document.getElementById("account-error");
const saveButton = document.getElementById("save-button");
const saveState = document.getElementById("save-state");
const unsavedLabel = document.getElementById("unsaved-label");
const securityBanner = document.getElementById("security-banner");
const ownerEmail = document.getElementById("owner-email");
const toast = document.getElementById("toast");
const sidebar = document.getElementById("admin-sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");

let toastTimer = 0;

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body && typeof options.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "הפעולה נכשלה");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

function setFormError(element, message = "") {
  element.textContent = message;
  element.hidden = !message;
}

function getPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split(".");
  const finalKey = keys.pop();
  const target = keys.reduce((value, key) => value[key], object);
  target[finalKey] = value;
}

function inputValue(input) {
  if (input.type === "checkbox") return input.checked;
  if (input.type === "number") return Number(input.value);
  return input.value;
}

function markDirty() {
  if (!state.content || state.owner?.mustChangePassword) return;
  state.dirty = true;
  saveButton.disabled = false;
  saveState.textContent = "שינויים לא נשמרו";
  saveState.classList.add("is-dirty");
  unsavedLabel.textContent = "יש שינויים שלא נשמרו";
  unsavedLabel.classList.add("is-dirty");
}

function markSaved() {
  state.dirty = false;
  saveButton.disabled = true;
  saveState.textContent = "שמור";
  saveState.classList.remove("is-dirty");
  unsavedLabel.textContent = "אין שינויים שלא נשמרו";
  unsavedLabel.classList.remove("is-dirty");
}

function safePreviewUrl(value) {
  if (typeof value !== "string") return "assets/optimized/photo-01.webp";
  if (/^(https:\/\/|\/api\/media-file\?path=|assets\/)/i.test(value)) return value;
  return "assets/optimized/photo-01.webp";
}

function createButton(label, className, onClick, title = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  if (title) button.title = title;
  button.addEventListener("click", onClick);
  return button;
}

function createLabeledField(labelText, value, onInput, options = {}) {
  const label = document.createElement("label");
  if (options.wide) label.classList.add("field-wide");
  const caption = document.createElement("span");
  caption.textContent = labelText;
  const input = options.multiline ? document.createElement("textarea") : document.createElement(options.select ? "select" : "input");

  if (options.select) {
    for (const [optionValue, optionLabel] of options.select) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionLabel;
      input.append(option);
    }
  } else if (!options.multiline) {
    input.type = options.type || "text";
  }
  if (options.multiline) input.rows = options.rows || 3;
  if (options.maxLength) input.maxLength = options.maxLength;
  if (options.ltr) input.dir = "ltr";
  input.value = value || "";
  input.addEventListener(options.select ? "change" : "input", () => onInput(input.value, input));
  label.append(caption, input);
  return { label, input };
}

function createMediaField(labelText, value, onValue, onUploaded) {
  const wrapper = document.createElement("label");
  wrapper.className = "media-input";
  const caption = document.createElement("span");
  caption.textContent = labelText;
  const control = document.createElement("div");
  control.className = "media-field-control";
  const input = document.createElement("input");
  input.type = "text";
  input.dir = "ltr";
  input.value = value || "";
  input.addEventListener("input", () => onValue(input.value));

  const upload = document.createElement("label");
  upload.className = "upload-inline";
  upload.textContent = "העלאה";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp,image/avif";
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const media = await uploadImage(file);
      input.value = media.url;
      onValue(media.url);
      onUploaded?.(media.url);
    } finally {
      fileInput.value = "";
    }
  });
  upload.append(fileInput);
  control.append(input, upload);
  wrapper.append(caption, control);
  return { wrapper, input };
}

function buildStaticMediaFields() {
  document.querySelectorAll("[data-media-field]").forEach((placeholder) => {
    const path = placeholder.dataset.mediaField;
    const label = placeholder.querySelector(":scope > span")?.textContent || "תמונה";
    const field = createMediaField(
      label,
      "",
      (value) => {
        setPath(state.content, path, value);
        markDirty();
      }
    );
    field.input.dataset.path = path;
    placeholder.replaceWith(field.wrapper);
  });
}

function populateStaticFields() {
  document.querySelectorAll("#content-form [data-path]").forEach((input) => {
    const value = getPath(state.content, input.dataset.path);
    if (input.type === "checkbox") input.checked = Boolean(value);
    else input.value = value ?? "";
    const output = document.querySelector(`[data-color-output="${input.dataset.path}"]`);
    if (output) output.textContent = input.value.toUpperCase();
  });
}

const sectionLabels = {
  hero: "פתיח",
  discipline: "פס תחומים",
  work: "סרטים",
  stills: "סטילס",
  about: "אודות",
  contact: "יצירת קשר"
};

function moveItem(array, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= array.length) return;
  [array[index], array[target]] = [array[target], array[index]];
}

function renderSectionOrder() {
  const container = document.getElementById("section-order");
  container.replaceChildren();
  state.content.sectionOrder.forEach((id, index) => {
    const row = document.createElement("div");
    row.className = "section-row";
    const main = document.createElement("div");
    main.className = "section-row-main";
    const title = document.createElement("strong");
    title.textContent = sectionLabels[id] || id;
    const toggle = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(state.content.sectionVisibility[id]);
    checkbox.addEventListener("change", () => {
      state.content.sectionVisibility[id] = checkbox.checked;
      markDirty();
    });
    const toggleText = document.createElement("span");
    toggleText.textContent = "מוצג באתר";
    toggle.append(checkbox, toggleText);
    main.append(title, toggle);

    const actions = document.createElement("div");
    actions.className = "row-actions";
    const up = createButton("↑", "row-command", () => {
      moveItem(state.content.sectionOrder, index, -1);
      renderSectionOrder();
      markDirty();
    }, "העברה למעלה");
    const down = createButton("↓", "row-command", () => {
      moveItem(state.content.sectionOrder, index, 1);
      renderSectionOrder();
      markDirty();
    }, "העברה למטה");
    up.disabled = index === 0;
    down.disabled = index === state.content.sectionOrder.length - 1;
    actions.append(up, down);
    row.append(main, actions);
    container.append(row);
  });
}

function renderDisciplineList() {
  const container = document.getElementById("discipline-list");
  container.replaceChildren();
  state.content.discipline.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "compact-row";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 60;
    input.value = item;
    input.addEventListener("input", () => {
      state.content.discipline.items[index] = input.value;
      markDirty();
    });
    const remove = createButton("מחיקה", "row-command danger-command", () => {
      state.content.discipline.items.splice(index, 1);
      renderDisciplineList();
      markDirty();
    });
    remove.style.width = "auto";
    remove.style.paddingInline = "12px";
    row.append(input, remove);
    container.append(row);
  });
}

function renderAboutParagraphs() {
  const container = document.getElementById("about-paragraphs");
  container.replaceChildren();
  state.content.about.paragraphs.forEach((paragraph, index) => {
    const row = document.createElement("div");
    row.className = "compact-row is-textarea";
    const textarea = document.createElement("textarea");
    textarea.maxLength = 1800;
    textarea.rows = 4;
    textarea.value = paragraph;
    textarea.addEventListener("input", () => {
      state.content.about.paragraphs[index] = textarea.value;
      markDirty();
    });
    const remove = createButton("מחיקה", "row-command danger-command", () => {
      state.content.about.paragraphs.splice(index, 1);
      renderAboutParagraphs();
      markDirty();
    });
    remove.style.width = "auto";
    remove.style.paddingInline = "12px";
    row.append(textarea, remove);
    container.append(row);
  });
}

function renderProjects() {
  const container = document.getElementById("project-list");
  container.replaceChildren();
  state.content.work.projects.forEach((project, index) => {
    const card = document.createElement("article");
    card.className = "editor-card";
    const header = document.createElement("div");
    header.className = "editor-card-header";
    const title = document.createElement("strong");
    title.textContent = project.title || `פרויקט ${index + 1}`;
    const actions = document.createElement("div");
    actions.className = "editor-actions";

    const up = createButton("↑", "row-command", () => {
      moveItem(state.content.work.projects, index, -1);
      renderProjects();
      markDirty();
    }, "העברה למעלה");
    const down = createButton("↓", "row-command", () => {
      moveItem(state.content.work.projects, index, 1);
      renderProjects();
      markDirty();
    }, "העברה למטה");
    const remove = createButton("מחיקה", "row-command danger-command", () => {
      if (!window.confirm(`למחוק את ${project.title || "הפרויקט"}?`)) return;
      state.content.work.projects.splice(index, 1);
      renderProjects();
      markDirty();
    });
    remove.style.width = "auto";
    remove.style.paddingInline = "10px";
    up.disabled = index === 0;
    down.disabled = index === state.content.work.projects.length - 1;
    actions.append(up, down, remove);
    header.append(title, actions);

    const grid = document.createElement("div");
    grid.className = "editor-grid";
    const titleField = createLabeledField("שם הפרויקט", project.title, (value) => {
      project.title = value;
      title.textContent = value || `פרויקט ${index + 1}`;
      markDirty();
    }, { maxLength: 120 });
    const formatField = createLabeledField("פורמט", project.format, (value) => {
      project.format = value;
      markDirty();
    }, { select: [["vertical", "אנכי"], ["wide", "רחב"]] });
    const typeField = createLabeledField("סוג מדיה", project.mediaType, (value) => {
      project.mediaType = value;
      markDirty();
    }, { select: [["video", "וידאו"], ["image", "תמונה"]] });
    const sourceField = createLabeledField("קישור למדיה", project.mediaSrc, (value) => {
      project.mediaSrc = value;
      markDirty();
    }, { ltr: true, maxLength: 1800 });
    const posterField = createMediaField("תמונת קאבר", project.poster, (value) => {
      project.poster = value;
      markDirty();
    });
    const altField = createLabeledField("תיאור נגיש", project.alt, (value) => {
      project.alt = value;
      markDirty();
    }, { maxLength: 240 });
    grid.append(titleField.label, formatField.label, typeField.label, sourceField.label, posterField.wrapper, altField.label);
    card.append(header, grid);
    container.append(card);
  });
}

function renderStills() {
  const container = document.getElementById("still-list");
  container.replaceChildren();
  state.content.stills.items.forEach((still, index) => {
    const card = document.createElement("article");
    card.className = "image-editor-card";
    const image = document.createElement("img");
    image.src = safePreviewUrl(still.src);
    image.alt = "";
    image.loading = "lazy";
    const body = document.createElement("div");
    body.className = "image-editor-body";
    const titleField = createLabeledField("שם", still.title, (value) => {
      still.title = value;
      markDirty();
    }, { maxLength: 120 });
    const mediaField = createMediaField("תמונה", still.src, (value) => {
      still.src = value;
      image.src = safePreviewUrl(value);
      markDirty();
    }, (value) => {
      image.src = safePreviewUrl(value);
    });
    const altField = createLabeledField("תיאור נגיש", still.alt, (value) => {
      still.alt = value;
      markDirty();
    }, { maxLength: 240 });
    const actions = document.createElement("div");
    actions.className = "image-editor-actions";
    const up = createButton("למעלה", "row-command", () => {
      moveItem(state.content.stills.items, index, -1);
      renderStills();
      markDirty();
    });
    const down = createButton("למטה", "row-command", () => {
      moveItem(state.content.stills.items, index, 1);
      renderStills();
      markDirty();
    });
    const remove = createButton("מחיקה", "row-command danger-command", () => {
      if (!window.confirm(`למחוק את ${still.title || "התמונה"} מהגלריה?`)) return;
      state.content.stills.items.splice(index, 1);
      renderStills();
      markDirty();
    });
    up.disabled = index === 0;
    down.disabled = index === state.content.stills.items.length - 1;
    actions.append(up, down, remove);
    body.append(titleField.label, mediaField.wrapper, altField.label, actions);
    card.append(image, body);
    container.append(card);
  });
}

function renderAllEditors() {
  populateStaticFields();
  renderSectionOrder();
  renderDisciplineList();
  renderAboutParagraphs();
  renderProjects();
  renderStills();
  const updated = state.content.updatedAt ? new Date(state.content.updatedAt).toLocaleString("he-IL") : "טרם נשמרו שינויים";
  document.getElementById("last-updated").textContent = updated;
}

function switchPanel(panel) {
  state.activePanel = panel;
  document.querySelectorAll("[data-panel-view]").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.panelView === panel);
  });
  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === panel);
  });
  sidebar.classList.remove("is-open");
  sidebarToggle.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "auto" });
  if (panel === "media" && !state.owner?.mustChangePassword) loadMedia();
}

function updateOwnerUi() {
  ownerEmail.textContent = state.owner?.email || "-";
  document.getElementById("account-email").value = state.owner?.email || "";
  securityBanner.hidden = !state.owner?.mustChangePassword;
  if (state.owner?.mustChangePassword) {
    saveButton.disabled = true;
    switchPanel("account");
  } else if (state.dirty) {
    saveButton.disabled = false;
  }
}

async function loadContent() {
  const payload = await apiRequest("/api/content");
  state.content = payload.content;
  renderAllEditors();
  markSaved();
}

async function loadMedia() {
  const errorElement = document.getElementById("media-error");
  setFormError(errorElement);
  try {
    const payload = await apiRequest("/api/media");
    state.media = payload.media;
    renderMediaLibrary();
  } catch (error) {
    if (error.status === 428) return;
    setFormError(errorElement, error.message);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function renderMediaLibrary() {
  const container = document.getElementById("media-library");
  container.replaceChildren();
  document.getElementById("media-count").textContent = `${state.media.length} תמונות`;
  state.media.forEach((media) => {
    const card = document.createElement("article");
    card.className = "media-card";
    const image = document.createElement("img");
    image.src = media.url;
    image.alt = "";
    image.loading = "lazy";
    const body = document.createElement("div");
    body.className = "media-card-body";
    const meta = document.createElement("small");
    meta.textContent = `${formatBytes(media.size)} · ${new Date(media.uploadedAt).toLocaleDateString("he-IL")}`;
    const actions = document.createElement("div");
    actions.className = "media-card-actions";
    const copy = createButton("העתקת קישור", "row-command", async () => {
      await navigator.clipboard.writeText(media.url);
      showToast("הקישור הועתק");
    });
    const remove = createButton("מחיקה", "row-command danger-command", async () => {
      if (!window.confirm("למחוק את התמונה מספריית המדיה?")) return;
      try {
        await apiRequest("/api/media", { method: "DELETE", body: JSON.stringify({ pathname: media.pathname }) });
        state.media = state.media.filter((item) => item.pathname !== media.pathname);
        renderMediaLibrary();
        showToast("התמונה נמחקה");
      } catch (error) {
        showToast(error.message, true);
      }
    });
    actions.append(copy, remove);
    body.append(meta, actions);
    card.append(image, body);
    container.append(card);
  });
}

async function uploadImage(file) {
  if (!file.type.startsWith("image/") || file.size > 2_800_000) {
    throw new Error("יש לבחור תמונת JPG, PNG, WebP או AVIF עד 2.8MB");
  }
  showToast("מעלה תמונה...");
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result)), { once: true });
      reader.addEventListener("error", () => reject(new Error("לא ניתן לקרוא את התמונה")), { once: true });
      reader.readAsDataURL(file);
    });
    const payload = await apiRequest("/api/media", {
      method: "POST",
      body: JSON.stringify({
        name: file.name,
        type: file.type,
        data: dataUrl.slice(dataUrl.indexOf(",") + 1)
      })
    });
    state.media = [payload.media, ...state.media.filter((item) => item.pathname !== payload.media.pathname)];
    renderMediaLibrary();
    showToast("התמונה הועלתה");
    return payload.media;
  } catch (error) {
    showToast(error.message, true);
    throw error;
  }
}

async function showDashboard(owner) {
  state.owner = owner;
  authView.hidden = true;
  adminApp.hidden = false;
  updateOwnerUi();
  try {
    await loadContent();
    if (!owner.mustChangePassword) await loadMedia();
  } catch (error) {
    showToast(error.message, true);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormError(loginError);
  const submit = loginForm.querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    const payload = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value
      })
    });
    document.getElementById("login-password").value = "";
    await showDashboard(payload.owner);
  } catch (error) {
    setFormError(loginError, error.message);
  } finally {
    submit.disabled = false;
  }
});

document.getElementById("logout-button").addEventListener("click", async () => {
  try {
    await apiRequest("/api/auth/logout", { method: "POST", body: "{}" });
  } finally {
    window.location.reload();
  }
});

contentForm.addEventListener("submit", (event) => event.preventDefault());
contentForm.addEventListener("input", (event) => {
  const input = event.target.closest("[data-path]");
  if (!input || !state.content) return;
  setPath(state.content, input.dataset.path, inputValue(input));
  const output = document.querySelector(`[data-color-output="${input.dataset.path}"]`);
  if (output) output.textContent = String(input.value).toUpperCase();
  markDirty();
});
contentForm.addEventListener("change", (event) => {
  const input = event.target.closest("[data-path]");
  if (!input || !state.content) return;
  setPath(state.content, input.dataset.path, inputValue(input));
  markDirty();
});

saveButton.addEventListener("click", async () => {
  if (!state.dirty || state.saving || state.owner?.mustChangePassword) return;
  state.saving = true;
  saveButton.disabled = true;
  saveButton.textContent = "שומר...";
  try {
    const payload = await apiRequest("/api/content", {
      method: "PUT",
      body: JSON.stringify({
        content: state.content,
        expectedRevision: state.content.revision
      })
    });
    state.content = payload.content;
    renderAllEditors();
    markSaved();
    showToast("האתר נשמר ופורסם");
  } catch (error) {
    if (error.status === 409) showToast("התוכן השתנה בחלון אחר. רעננו את העמוד לפני שמירה נוספת.", true);
    else showToast(error.message, true);
    saveButton.disabled = false;
  } finally {
    state.saving = false;
    saveButton.textContent = "שמירת האתר";
  }
});

accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormError(accountError);
  const newPassword = document.getElementById("new-password").value;
  const confirmation = document.getElementById("confirm-password").value;
  if (newPassword !== confirmation) {
    setFormError(accountError, "אימות הסיסמה אינו תואם");
    return;
  }
  const submit = accountForm.querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    const payload = await apiRequest("/api/auth/credentials", {
      method: "PUT",
      body: JSON.stringify({
        email: document.getElementById("account-email").value,
        currentPassword: document.getElementById("current-password").value,
        newPassword
      })
    });
    state.owner = payload.owner;
    accountForm.reset();
    updateOwnerUi();
    await loadMedia();
    switchPanel("overview");
    showToast("פרטי הכניסה עודכנו");
  } catch (error) {
    setFormError(accountError, error.message);
  } finally {
    submit.disabled = false;
  }
});

document.querySelectorAll("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => switchPanel(button.dataset.panel));
});
document.querySelectorAll("[data-open-account]").forEach((button) => {
  button.addEventListener("click", () => switchPanel("account"));
});

sidebarToggle.addEventListener("click", () => {
  const isOpen = !sidebar.classList.contains("is-open");
  sidebar.classList.toggle("is-open", isOpen);
  sidebarToggle.setAttribute("aria-expanded", String(isOpen));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sidebar.classList.contains("is-open")) {
    sidebar.classList.remove("is-open");
    sidebarToggle.setAttribute("aria-expanded", "false");
    sidebarToggle.focus();
  }
});

document.getElementById("add-discipline").addEventListener("click", () => {
  if (state.content.discipline.items.length >= 6) return showToast("ניתן להציג עד 6 תחומים", true);
  state.content.discipline.items.push("תחום חדש");
  renderDisciplineList();
  markDirty();
});

document.getElementById("add-about-paragraph").addEventListener("click", () => {
  if (state.content.about.paragraphs.length >= 8) return showToast("ניתן להוסיף עד 8 פסקאות", true);
  state.content.about.paragraphs.push("פסקה חדשה");
  renderAboutParagraphs();
  markDirty();
});

document.getElementById("add-project").addEventListener("click", () => {
  if (state.content.work.projects.length >= 30) return showToast("ניתן להוסיף עד 30 פרויקטים", true);
  state.content.work.projects.push({
    id: `project-${crypto.randomUUID().slice(0, 8)}`,
    title: "פרויקט חדש",
    format: "vertical",
    mediaType: "video",
    mediaSrc: "",
    poster: "assets/optimized/thumb-01.webp",
    alt: "תמונת פרויקט"
  });
  renderProjects();
  markDirty();
});

document.getElementById("add-still").addEventListener("click", () => {
  if (state.content.stills.items.length >= 60) return showToast("ניתן להוסיף עד 60 תמונות", true);
  state.content.stills.items.push({
    id: `still-${crypto.randomUUID().slice(0, 8)}`,
    title: "צילום חדש",
    src: "assets/optimized/photo-01.webp",
    alt: "צילום סטילס"
  });
  renderStills();
  markDirty();
});

document.getElementById("library-upload").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await uploadImage(file);
  } catch {
    // The upload helper already reports the error.
  } finally {
    event.target.value = "";
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

buildStaticMediaFields();

try {
  const payload = await apiRequest("/api/auth/session");
  await showDashboard(payload.owner);
} catch {
  authView.hidden = false;
  adminApp.hidden = true;
}
