// Home page motion (loaded only by index.html). Everything here is decoration on top of a
// page that is complete without it: no JS or reduced motion leaves the static layout.
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // the pinned scene needs a landscape screen; on phones the panorama would be cropped to a sliver
  const pinFits = window.matchMedia('(min-width: 48em) and (orientation: landscape)');
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const hero = document.querySelector('.hero--home');
  const expand = document.querySelector('[data-expand]');
  let queued = false;

  // hero: image drifts slower than the page, copy fades as it scrolls away
  function renderHero() {
    if (!hero) return;
    const h = hero.offsetHeight;
    const y = clamp(window.scrollY, 0, h);
    hero.style.setProperty('--hero-scroll', y.toFixed(1));
    hero.style.setProperty('--hero-fade', (1 - y / (h * 0.75)).toFixed(3));
  }

  // expand: the stage pins full screen and the framed panorama grows to fill it.
  // --p runs 0 → 1 over the first 75% of the scroll, then holds full screen.
  function renderExpand() {
    if (!expand || !expand.classList.contains('is-pinned')) return;
    const travel = expand.offsetHeight - window.innerHeight;
    const scrolled = clamp(-expand.getBoundingClientRect().top, 0, travel);
    const p = travel > 0 ? easeInOut(clamp(scrolled / (travel * 0.75), 0, 1)) : 1;
    expand.style.setProperty('--p', p.toFixed(4));
  }

  function render() {
    queued = false;
    renderHero();
    renderExpand();
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(render); } };

  function setMode() {
    const on = !reduceMotion.matches;
    if (hero) {
      hero.classList.toggle('is-parallax', on);
      if (!on) { hero.style.removeProperty('--hero-scroll'); hero.style.removeProperty('--hero-fade'); }
    }
    if (expand) {
      const pin = on && pinFits.matches;
      expand.classList.toggle('is-pinned', pin);
      if (!pin) expand.style.removeProperty('--p');
    }
    queue();
  }

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  [reduceMotion, pinFits].forEach(mq => {
    if (mq.addEventListener) mq.addEventListener('change', setMode); else mq.addListener(setMode);
  });
  setMode();

  // stat counters: count up from zero the first time each number scrolls into view.
  // The final text stays in the HTML, so no-JS and reduced motion show it as written.
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduceMotion.matches) {
    const run = (el) => {
      const m = el.textContent.match(/^(\D*)(\d+)(.*)$/);
      if (!m) return;
      const [, pre, num, post] = m;
      const target = parseInt(num, 10);
      const dur = 1400;
      const t0 = performance.now();
      const tick = (now) => {
        const t = clamp((now - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = pre + Math.round(target * eased) + post;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(el => io.observe(el));
  }
})();
