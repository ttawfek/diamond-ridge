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

// lightbox for [data-lightbox] links (gallery + home renderings / floor plans)
const lbLinks = document.querySelectorAll('[data-lightbox]');
if (lbLinks.length) {
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Enlarged image');
  lb.innerHTML = '<button type="button" class="lb-x" aria-label="Close enlarged image">&#10005;</button><img alt="">';
  document.body.appendChild(lb);
  const lbImg = lb.querySelector('img');
  const lbClose = lb.querySelector('.lb-x');
  let lastFocus = null;

  const closeLb = () => {
    if (!lb.classList.contains('on')) return;
    lb.classList.remove('on');
    document.body.style.overflow = '';
    lbImg.removeAttribute('src');
    if (lastFocus) lastFocus.focus();
  };

  lbLinks.forEach(link => link.addEventListener('click', (e) => {
    e.preventDefault();
    const img = link.querySelector('img');
    lastFocus = link;
    lbImg.src = link.getAttribute('href');
    lbImg.alt = img ? img.alt : '';
    lb.classList.add('on');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }));
  lb.addEventListener('click', (e) => { if (e.target !== lbImg) closeLb(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'Tab') { e.preventDefault(); lbClose.focus(); } // only one focusable control
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
