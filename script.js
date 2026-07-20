const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.getElementById('site-header');
const hero = document.getElementById('top');
const menuToggle = document.getElementById('menu-toggle');
const primaryNav = document.getElementById('primary-nav');

document.getElementById('year').textContent = new Date().getFullYear();

const setMenuState = (isOpen) => {
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'סגירת תפריט' : 'פתיחת תפריט');
  primaryNav.classList.toggle('is-open', isOpen);
  header.classList.toggle('is-menu-open', isOpen);
  document.body.classList.toggle('menu-open', isOpen);

  if (isOpen) {
    primaryNav.querySelector('a')?.focus();
  }
};

menuToggle.addEventListener('click', () => {
  setMenuState(menuToggle.getAttribute('aria-expanded') !== 'true');
});

primaryNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenuState(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenuState(false);
    menuToggle.focus();
  }
});

window.matchMedia('(min-width: 961px)').addEventListener('change', (event) => {
  if (event.matches) setMenuState(false);
});

const headerObserver = new IntersectionObserver(
  ([entry]) => header.classList.toggle('is-compact', !entry.isIntersecting),
  { rootMargin: '-72px 0px 0px 0px', threshold: 0 }
);
headerObserver.observe(hero);

const revealItems = document.querySelectorAll('[data-reveal]');
if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
  );
  revealItems.forEach((item) => revealObserver.observe(item));
}

document.querySelectorAll('.media-button img').forEach((image) => {
  const markLoaded = () => image.classList.add('is-loaded');
  if (image.complete && image.naturalWidth > 0) markLoaded();
  else image.addEventListener('load', markLoaded, { once: true });

  image.addEventListener(
    'error',
    () => {
      const button = image.closest('.media-button');
      if (!button) return;
      button.disabled = true;
      button.setAttribute('aria-label', 'המדיה אינה זמינה כרגע');
    },
    { once: true }
  );
});

if (!reducedMotion && window.matchMedia('(hover: hover)').matches) {
  const tiltTargets = [
    ...document.querySelectorAll('.hero-stage'),
  ];

  tiltTargets.forEach((target) => {
    const strength = 5;

    target.addEventListener('pointermove', (event) => {
      const rect = target.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      target.style.setProperty('--tilt-x', `${(-y * strength).toFixed(2)}deg`);
      target.style.setProperty('--tilt-y', `${(x * strength).toFixed(2)}deg`);
      target.classList.add('is-tilting');
    });

    target.addEventListener('pointerleave', () => {
      target.style.setProperty('--tilt-x', '0deg');
      target.style.setProperty('--tilt-y', '0deg');
      target.classList.remove('is-tilting');
    });
  });
}

const navLinks = [...primaryNav.querySelectorAll('a[href^="#"]')];
const observedSections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    navLinks.forEach((link) => {
      const isCurrent = link.getAttribute('href') === `#${visible.target.id}`;
      if (isCurrent) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  },
  { rootMargin: '-22% 0px -58% 0px', threshold: [0.05, 0.25, 0.5] }
);
observedSections.forEach((section) => sectionObserver.observe(section));

const projectRail = document.getElementById('project-rail');
const railStep = () => Math.max(280, Math.round(projectRail.clientWidth * 0.72));
const railBehavior = reducedMotion ? 'auto' : 'smooth';
const railNext = document.getElementById('rail-next');
const railPrevious = document.getElementById('rail-previous');

if (projectRail && railNext && railPrevious) {
  railNext.addEventListener('click', () => {
    projectRail.scrollBy({ left: -railStep(), behavior: railBehavior });
  });

  railPrevious.addEventListener('click', () => {
    projectRail.scrollBy({ left: railStep(), behavior: railBehavior });
  });
}

const lightbox = document.getElementById('lightbox');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxStatus = document.getElementById('lightbox-status');
const lightboxVideo = document.getElementById('lightbox-video');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxClose = document.getElementById('lightbox-close');
let lastMediaTrigger = null;

const setLightboxStatus = (message, isError = false) => {
  lightboxStatus.textContent = message;
  lightboxStatus.hidden = !message;
  lightboxStatus.classList.toggle('is-error', isError);
};

const resetLightboxMedia = () => {
  lightboxVideo.pause();
  lightboxVideo.removeAttribute('src');
  lightboxVideo.removeAttribute('poster');
  lightboxVideo.load();
  lightboxVideo.hidden = true;
  lightboxImage.hidden = true;
  lightboxImage.alt = '';
};

const openMedia = (trigger) => {
  const type = trigger.dataset.mediaType;
  const source = trigger.dataset.mediaSrc;
  const title = trigger.dataset.mediaTitle || 'צפייה במדיה';
  const previewImage = trigger.querySelector('img');
  lastMediaTrigger = trigger;

  resetLightboxMedia();
  lightboxTitle.textContent = title;
  document.body.classList.add('dialog-open');
  lightbox.showModal();

  if (type === 'video') {
    setLightboxStatus('טוען סרט...');
    lightboxVideo.poster = trigger.dataset.mediaPoster || '';
    lightboxVideo.src = source;
    lightboxVideo.hidden = false;
    lightboxVideo.load();
    lightboxVideo.play().catch(() => {});
    return;
  }

  setLightboxStatus('טוען תמונה...');
  lightboxImage.alt = previewImage?.alt || title;
  lightboxImage.src = source;
  lightboxImage.hidden = false;
  if (lightboxImage.complete && lightboxImage.naturalWidth > 0) setLightboxStatus('');
};

document.querySelectorAll('[data-media-src]').forEach((trigger) => {
  trigger.addEventListener('click', () => openMedia(trigger));
});

lightboxVideo.addEventListener('canplay', () => setLightboxStatus(''));
lightboxVideo.addEventListener('error', () => {
  setLightboxStatus('לא ניתן לטעון את הסרט כרגע. אפשר לנסות שוב.', true);
});
lightboxImage.addEventListener('load', () => setLightboxStatus(''));
lightboxImage.addEventListener('error', () => {
  setLightboxStatus('לא ניתן לטעון את התמונה כרגע. אפשר לנסות שוב.', true);
});

lightboxClose.addEventListener('click', () => lightbox.close());
lightbox.addEventListener('close', () => {
  resetLightboxMedia();
  setLightboxStatus('');
  document.body.classList.remove('dialog-open');
  lastMediaTrigger?.focus();
});

lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.close();
});
