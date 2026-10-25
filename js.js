// mobile menu toggle (accessible: aria-expanded, Esc to close, resets on widen)
const header = document.querySelector('.site-header');
const burger = document.getElementById('navToggle');
if (header && burger) {
  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  header.querySelectorAll('.nav-panel a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('is-open')) { setOpen(false); burger.focus(); }
  });
  const wide = window.matchMedia('(min-width: 60em)');
  const onWide = (e) => { if (e.matches) setOpen(false); };
  if (wide.addEventListener) wide.addEventListener('change', onWide); else wide.addListener(onWide);
}

// scroll reveal (progressive enhancement: content is visible without JS)
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  reveals.forEach(el => io.observe(el));
} else {
  reveals.forEach(el => el.classList.add('in'));
}

// hero background videos: only play when motion is welcome; pause control (WCAG 2.2.2)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('[data-hero-video]').forEach(video => {
  const btn = video.parentElement.querySelector('[data-video-toggle]');
  video.addEventListener('playing', () => {
    video.classList.add('is-playing');
    if (btn) { btn.hidden = false; btn.textContent = 'Pause video'; }
  });
  video.addEventListener('pause', () => { if (btn) btn.textContent = 'Play video'; });
  if (btn) btn.addEventListener('click', () => { if (video.paused) video.play(); else video.pause(); });
  if (!reduceMotion) {
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  }
});

// image / floor-plan switcher (model pages): buttons carry data-target, data-src, data-cap,
// and data-w / data-h so the stage keeps the right aspect ratio for each view.
document.querySelectorAll('.switch[data-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.target;
    const stage = document.getElementById(t + '-stage');
    const cap = document.getElementById(t + '-cap');
    if (stage) {
      if (btn.dataset.w && btn.dataset.h) { stage.width = +btn.dataset.w; stage.height = +btn.dataset.h; }
      stage.src = btn.dataset.src;
      stage.alt = stage.dataset.name + ' — ' + btn.dataset.cap;
      if (stage.parentNode.hasAttribute('data-lightbox')) stage.parentNode.href = btn.dataset.src;
    }
    if (cap) cap.textContent = btn.dataset.cap;
    document.querySelectorAll('.switch[data-target="' + t + '"]').forEach(b => {
      b.classList.remove('on');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('on');
    btn.setAttribute('aria-pressed', 'true');
  });
});

// collection filter (homes.html): progressive enhancement, so without JS both sections show
const filterRow = document.querySelector('[data-filter-row]');
if (filterRow) {
  const sections = document.querySelectorAll('[data-collection]');
  const status = filterRow.querySelector('[data-filter-status]');
  const buttons = filterRow.querySelectorAll('[data-filter]');
  const apply = (value, announce) => {
    let shown = 0;
    sections.forEach(sec => {
      const on = value === 'all' || sec.dataset.collection === value;
      sec.hidden = !on;
      if (on) shown += sec.querySelectorAll('.model').length;
    });
    buttons.forEach(b => {
      const on = b.dataset.filter === value;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (status && announce) status.textContent = 'Showing ' + shown + ' homes';
  };
  buttons.forEach(b => b.addEventListener('click', () => apply(b.dataset.filter, true)));
  // a deep link (e.g. homes.html#tucker) must never point into a hidden section
  window.addEventListener('hashchange', () => {
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && target.closest('[data-collection][hidden]')) { apply('all', false); target.scrollIntoView(); }
  });
  filterRow.hidden = false;
}

// lightbox for [data-lightbox] links (gallery + home renderings / floor plans).
// Large images (floor plans) get a "Zoom" toggle that shows them at full
// resolution in a scrollable pane, so plan text stays legible.
const lbLinks = document.querySelectorAll('[data-lightbox]');
if (lbLinks.length) {
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Enlarged image');
  lb.innerHTML =
    '<div class="lb-bar">' +
    '<button type="button" class="lb-zoom" aria-pressed="false" hidden>Zoom in</button>' +
    '<button type="button" class="lb-x" aria-label="Close enlarged image">&#10005;</button>' +
    '</div>' +
    '<div class="lb-pane"><img alt=""></div>';
  document.body.appendChild(lb);
  const lbImg = lb.querySelector('img');
  const lbPane = lb.querySelector('.lb-pane');
  const lbClose = lb.querySelector('.lb-x');
  const lbZoom = lb.querySelector('.lb-zoom');
  let lastFocus = null;

  const setZoom = (on) => {
    lb.classList.toggle('is-zoomed', on);
    lbZoom.setAttribute('aria-pressed', String(on));
    lbZoom.textContent = on ? 'Fit to screen' : 'Zoom in';
    if (on) lbPane.setAttribute('tabindex', '0'); else lbPane.removeAttribute('tabindex');
    lbPane.scrollTop = 0;
    lbPane.scrollLeft = Math.max(0, (lbPane.scrollWidth - lbPane.clientWidth) / 2);
  };
  // Offer zoom only when the file is meaningfully larger than it is shown.
  const updateZoomable = () => {
    if (lb.classList.contains('is-zoomed')) return;
    const big = lbImg.naturalWidth > lbImg.clientWidth * 1.25 || lbImg.naturalHeight > lbImg.clientHeight * 1.25;
    lbZoom.hidden = !big;
    lbImg.classList.toggle('is-zoomable', big);
  };
  lbImg.addEventListener('load', updateZoomable);

  const closeLb = () => {
    if (!lb.classList.contains('on')) return;
    setZoom(false);
    lb.classList.remove('on');
    document.body.style.overflow = '';
    lbImg.removeAttribute('src');
    lbZoom.hidden = true;
    if (lastFocus) lastFocus.focus();
  };

  lbLinks.forEach(link => link.addEventListener('click', (e) => {
    e.preventDefault();
    const img = link.querySelector('img');
    lastFocus = link;
    setZoom(false);
    lbZoom.hidden = true;
    lbImg.src = link.getAttribute('href');
    lbImg.alt = img ? img.alt : '';
    lb.classList.add('on');
    document.body.style.overflow = 'hidden';
    if (lbImg.complete && lbImg.naturalWidth) updateZoomable();
    lbClose.focus();
  }));
  lbZoom.addEventListener('click', () => setZoom(!lb.classList.contains('is-zoomed')));
  lb.addEventListener('click', (e) => {
    if (e.target === lbImg) { if (!lbZoom.hidden) setZoom(!lb.classList.contains('is-zoomed')); return; }
    if (e.target === lb || e.target === lbPane || e.target === lbClose) closeLb();
  });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') { closeLb(); return; }
    if (e.key === 'Tab') { // keep focus inside the dialog
      const items = [lbZoom, lbClose, lbPane].filter(el => !el.hidden && (el !== lbPane || lbPane.hasAttribute('tabindex')));
      const i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
    }
  });
}

// cookie consent: the Meta Pixel (loadMetaPixel, defined in each page's <head>) only runs after "Accept"
const CONSENT_KEY = 'dr-cookie-consent';
const readConsent = () => { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } };
const showCookieBanner = () => {
  if (document.querySelector('.cookie-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML =
    '<p>We use cookies (Meta Pixel) to measure our advertising. Accept to allow them, or decline and nothing is tracked. ' +
    '<a href="https://www.diamondridgeliving.ca/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy<span class="visually-hidden"> (opens in a new tab)</span></a></p>' +
    '<div class="cookie-actions">' +
    '<button type="button" class="btn btn-ghost btn-sm" data-consent="denied">Decline</button>' +
    '<button type="button" class="btn btn-solid btn-sm" data-consent="granted">Accept</button>' +
    '</div>';
  banner.querySelectorAll('[data-consent]').forEach(btn => btn.addEventListener('click', () => {
    const choice = btn.getAttribute('data-consent');
    const was = readConsent();
    try { localStorage.setItem(CONSENT_KEY, choice); } catch (e) {}
    banner.remove();
    if (choice === 'granted' && window.loadMetaPixel) window.loadMetaPixel();
    // the pixel can't be unloaded from a running page, so reload to honour a withdrawal
    if (choice === 'denied' && was === 'granted') location.reload();
  }));
  document.body.appendChild(banner);
};
if (!readConsent()) showCookieBanner();
document.querySelectorAll('[data-cookie-settings]').forEach(btn => btn.addEventListener('click', showCookieBanner));
