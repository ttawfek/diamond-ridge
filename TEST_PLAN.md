# Diamond Ridge — QA Test Plan

Owner: QA · Branch: `revamp-homepage` · Baseline commit: `42cba62 Initial Version`

Scope: static site (8 pages: index, homes, builders, contact, developer, discover, gallery,
register), `css/style.css` (plus `styles.scss` if the redesign introduces it), `js.js`,
`booking.js`, the inline script in `homes.html`, `localize_assets.py`, `NETLIFY_SETUP.md`, `assets/`.

Status key: `PENDING` (not yet run against the redesign) · `PASS` · `FAIL` · `FIXED` · `N/A` · `NOT TESTABLE` (tooling missing; reason given)

---

## 0. Tooling and method

| Tool | Use | Available? |
|---|---|---|
| `qa_check.py` (QA scratch script, Python stdlib `html.parser`) | Tag balance / unclosed tags, duplicate IDs, local file refs and `#anchor` resolution, img alt / width / height / size, `target=_blank` rel, heading order, label association, meta / OG / canonical, external scripts without SRI, per-page media weight | Yes (Python 3.14) |
| `curl -I` loop over every `cdn.prod.website-files.com` URL | Remote asset status + `Content-Length` (page weight) | Yes (network OK) |
| Contrast script (WCAG 2.x formula) | Theme token pairs, light and dark | Yes |
| `node --check` | JS syntax for js.js / booking.js / extracted inline scripts | Yes (Node 22) |
| `npx sass` | Compile `styles.scss` if the redesign adds one | Node present; package may need a download |
| Headless Chrome (local install) driven by `puppeteer-core` 23.11.1 + `axe-core` 4.10.2, against `python -m http.server` | Phase 2: overflow at 5 widths, console / network errors, axe WCAG 2.1 AA, CLS / LCP via PerformanceObserver, keyboard flows (nav, modal focus trap, lightbox), no-JS, reduced motion | **Yes** (found in Phase 2; Phase 1 was static only) |
| Lighthouse, real devices, screen readers (NVDA / VoiceOver), throttled network | Lab scores, real assistive tech | **Not run.** CLS / LCP were measured unthrottled on localhost, so they say nothing about real 4G LCP |
| Netlify deploy | Forms, `_headers`, pretty URLs, 404 handling | **Not available.** Reviewed statically; the form POST was simulated with request interception |

Baseline numbers below were measured on disk and with HEAD requests on 2026-10-24.

---

## 1. Security

| ID | Test | Method | Expected | Baseline | Phase 2 |
|---|---|---|---|---|---|
| S1 | No user input reaches `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` / `eval` | grep all JS and inline scripts; trace data flow | User data goes through `textContent` or `value` only | booking.js is clean (`textContent`; `grid.innerHTML=''` is a constant). homes.html:487 `cap.innerHTML = btn.dataset.cap` uses static markup data, so the risk is low, but it is still an unsafe sink | PENDING |
| S2 | Booking form payload encoding | Review booking.js:158-174 | `URLSearchParams` encodes; the mailto fallback uses `encodeURIComponent` | PASS | PENDING |
| S3 | Mailto header injection (CRLF in name / email) | Review booking.js:114-127 | Every field is URI-encoded, so it cannot add headers | PASS | PENDING |
| S4 | Contact / register forms: injection & transport | Review contact.html:105, register.html:113 | Forms post to Netlify (or another endpoint) and are validated | FAIL: `action="mailto:"` with `enctype="text/plain"` — unreliable, no spam protection, no server record | PENDING |
| S5 | Honeypot on every form | grep `netlify-honeypot`, `bot-field` | Every Netlify form has a hidden honeypot that screen readers and keyboard users never reach | Booking: PASS (index.html:331, 387). Contact / register: no honeypot (mailto) | PENDING |
| S6 | Netlify form registration | Hidden `<form name="showing-request" netlify>` present and field names match the JS payload | Field names line up exactly | PASS (index.html:331-340 vs booking.js:158-168) | PENDING |
| S7 | External links: `rel="noopener noreferrer"` on every `target="_blank"` | qa_check | All carry both tokens | FAIL: 21 links have `rel="noopener"` only | PENDING |
| S8 | Third-party scripts: SRI / CSP compatibility | grep `<script src=http`, inline scripts | External scripts are pinned with `integrity`, or the risk is documented | Meta Pixel is injected dynamically (fbevents.js, cannot carry SRI; Meta changes it constantly) on every page; inline bootstrap at `<head>` lines 27-38 needs `'unsafe-inline'` or a hash in any CSP. Google Fonts CSS has no SRI (normal, dynamic per user-agent) | PENDING |
| S9 | Mixed content | grep `http://` in src/href | None | PASS (all https) | PENDING |
| S10 | Secrets in source | grep for keys/tokens/passwords | No API keys or credentials | PASS: no secrets. Info exposure: personal address `tariktawfek71@hotmail.com` in booking.js:7 and NETLIFY_SETUP.md:30 (scrapeable by spam harvesters); Meta Pixel ID is public by design | PENDING |
| S11 | Security headers | Look for `netlify.toml` / `_headers` | CSP, X-Frame-Options / `frame-ancestors`, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS | FAIL: no `netlify.toml`, `_headers` or `_redirects`. NETLIFY_SETUP.md does not mention headers. A suggested `_headers` is given in Findings F-S6 | PENDING |
| S12 | iframes | Review Google Maps iframes | `title` set, `loading=lazy`, `referrerpolicy` set | `title`/lazy PASS; no `referrerpolicy` (minor) | PENDING |
| S13 | localize_assets.py safety | Code review | Only fetches the expected host over https, writes inside `assets/`, no path traversal, keeps a backup | Mostly safe (see F-S8): host-pinned regex, filename sanitised. Issues: rewrites og:image to a relative path, no backup / atomic write, no size cap, never re-downloads a changed file | PENDING |
| S14 | Clickjacking / framing of booking modal | Header check | `frame-ancestors 'self'` | FAIL (no headers) | PENDING |
| S15 | Privacy / consent | Pixel fires before any consent; privacy policy lives off-site | Consent banner or documented decision (PIPEDA / Alberta PIPA) | FAIL / decision needed (not a code bug) | PENDING |

## 2. Performance

| ID | Test | Method | Expected | Baseline | Phase 2 |
|---|---|---|---|---|---|
| P1 | Image sizes / formats | HEAD `Content-Length` + `du` on assets/ | Content images ≤ ~300 KB, WebP/AVIF with JPEG fallback, `srcset` for responsive sizes | FAIL. Local assets 6.3 MB (28 JPG at 49-213 KB, OK-ish; 4 PDFs 0.55-0.65 MB). Remote: 45 CDN files, many 2-4 MB PNG/JPEG (e.g. DRSiteAerial.jpg 4.12 MB, RoyalitePark.jpeg 4.02 MB, HOme5.png 3.88 MB). No `srcset` anywhere | PENDING |
| P2 | Logo / footer images | HEAD | Logos ≤ 30 KB, SVG preferred | FAIL. Header logo `Title (1).png` 224 KB shown at 52 px high; footer Root9 logo `Title (5).png` **961 KB** shown at 34 px high, on 7 pages | PENDING |
| P3 | Total media weight per page (all images + video + poster, full scroll) | qa_check | Home < 2.5 MB, gallery < 6 MB | index 6.77 MB · homes 4.23 · register 4.15 · developer 3.76 · builders 3.31 · discover 3.16 · contact 1.73 · **gallery 59.18 MB** | PENDING |
| P4 | Lazy loading | qa_check | Below-the-fold images lazy; LCP / hero image **not** lazy, ideally `fetchpriority="high"` | FAIL. Hero `img.bg` is `loading="lazy"` on contact:78, developer:78, register:78 (delays LCP). homes stage images 126/202/280/358 are eager although 3 of 4 are far below the fold | PENDING |
| P5 | `width`/`height` on every `<img>` (CLS) | qa_check | Present (or CSS `aspect-ratio`) | FAIL: none of ~95 content images have them (only the 1×1 pixel) | PENDING |
| P6 | Render-blocking resources | Review `<head>` | One CSS file; fonts non-blocking or preloaded; JS deferred | Google Fonts stylesheet is render-blocking (3 families; Fraunces 340/600 and Work Sans 300/500/600 requested but unused — CSS only uses 420/500/400/700); `css/style.css` 24 KB, unminified. Scripts at end of body (OK) | PENDING |
| P7 | Font loading | Review | `display=swap`, preconnect, only the weights in use | `display=swap` + preconnect PASS; unused weights FAIL (minor) | PENDING |
| P8 | Video hero | HEAD + review | Video ≤ 1-2 MB, `preload="metadata"`/`none`, compressed poster, not loaded on mobile / reduced-motion | Videos 0.96 MB / 0.77 MB OK; posters are PNG 0.5-1.0 MB (should be JPEG/WebP ~100 KB); no reduced-motion handling | PENDING |
| P9 | Caching headers | Look for `_headers` | Long cache for `/assets/*`, `/css/*` (with fingerprinting) | FAIL / none configured (Netlify default `max-age=0, must-revalidate`) | PENDING |
| P10 | Third-party cost | Review | Pixel + Maps iframe + Fonts only where needed | Maps iframe on index, discover, contact (lazy, OK). Pixel on all pages | PENDING |
| P11 | Duplicate downloads | Review | Same image not used twice at different URLs | developer.html: hero:78 and body:96 use the same screenshot (cached, fine) | PENDING |

## 3. SEO

| ID | Test | Method | Expected | Baseline | Phase 2 |
|---|---|---|---|---|---|
| SEO1 | Unique `<title>` 30-60 chars | qa_check | Unique, descriptive | PASS (23-62 chars; contact 23 is short) | PENDING |
| SEO2 | Meta description 70-160 chars | qa_check | Present, unique | PASS; discover and homes are 174 chars (truncated in SERP, minor) | PENDING |
| SEO3 | Canonical | qa_check | `<link rel="canonical">` with absolute URL on every page | FAIL: none | PENDING |
| SEO4 | Open Graph / Twitter | qa_check | og:title/description/url/image, absolute image URL, ~1200×630, < 1 MB | homes.html:16,21 og:image is **relative** (broken on social shares). Others point at Epicwideshot.jpg, 2.95 MB (slow, may time out on scrapers) | PENDING |
| SEO5 | Structured data | grep `ld+json` | `Organization` / `RealEstateAgent` / `Place`, plus `Product`/`Offer` or `SingleFamilyResidence` for models | FAIL: none | PENDING |
| SEO6 | robots.txt / sitemap.xml / 404.html | ls | Present | FAIL: none of them | PENDING |
| SEO7 | One `<h1>`, no skipped levels | qa_check | Exactly one h1; h2→h3 order | PASS on all 8 pages (footer tagline is an `h3` after the page's h2s — acceptable) | PENDING |
| SEO8 | Internal links resolve (files + `#anchors`) | qa_check | 0 broken | PASS (0 missing files, 0 broken anchors) | PENDING |
| SEO9 | Remote assets resolve | curl HEAD | All 200 | PASS: 45/45 return 200 | PENDING |
| SEO10 | `lang`, viewport, charset | grep | Present | PASS | PENDING |

## 4. Accessibility

| ID | Test | Method | Expected | Baseline | Phase 2 |
|---|---|---|---|---|---|
| A1 | Alt text | qa_check + manual | Every content img has meaningful alt; decorative = `alt=""` | PASS (all present). homes stage alt never updates when the image switches (homes.html:486) | PENDING |
| A2 | Form labels | qa_check | Every visible control has a `<label for>` | PASS (the hidden Netlify detection form at index.html:331 is exempt: `hidden`) | PENDING |
| A3 | Colour contrast (WCAG AA 4.5:1 body, 3:1 large) | Contrast script | All text ≥ AA | FAIL: `.btn-solid` white on wheat end of gradient 2.35:1 (dark theme gradient C9A25C→DDBB78: 2.35 → 1.80:1); `.eyebrow` rust on stone-dark 3.60:1 (12.5 px); rust on bg 4.16:1; `.bk-err` dark theme 3.36:1. PASS: ink-soft 6.26, panel text 5.3-7.7, sage card 4.95 | PENDING |
| A4 | Keyboard: every interactive element reachable & operable, visible focus | Static review (no browser) | Tab order logical; no mouse-only controls | FAIL: homes lightbox opened only by clicking `<img>` (homes.html:494), close `✕` is a `<span>` (449). No `:focus-visible` styling (default outline survives, so focus is still visible) | PENDING |
| A5 | Modal dialog semantics (booking) | Static review | Focus moves in, is trapped, returns to the trigger; background inert; Esc closes | FAIL: `role="dialog" aria-modal="true"` present, but no focus management (booking.js:96-97) | PENDING |
| A6 | Burger menu | Review | `aria-expanded`, `aria-controls`, label updates | FAIL (index.html:61 etc.; js.js:5-7) | PENDING |
| A7 | Motion | Review | Respect `prefers-reduced-motion`; autoplay video > 5 s has a pause control (WCAG 2.2.2) | Partial: `.reveal` respects it (style.css:46); videos loop forever with no pause and ignore reduced motion | PENDING |
| A8 | Content without JS | Review | Content visible when JS fails | FAIL: `.reveal{opacity:0}` (style.css:44) hides almost every section if JS fails or IntersectionObserver is missing | PENDING |
| A9 | Link purpose | Review | Distinct text, `href="#"` avoided | `data-book` links are `href="#"` (index.html:87,156); without JS they jump to the top | PENDING |
| A10 | Dark mode readability | Contrast + review | No invisible text in dark theme | register.html:93/98/103 inline step numbers `rgba(36,35,32,.12)` vanish on a dark card (decorative, minor) | PENDING |

## 5. Code review / functional

| ID | Test | Method | Expected | Baseline | Phase 2 |
|---|---|---|---|---|---|
| C1 | JS syntax | `node --check` | No errors | PENDING (run in Phase 2) | PENDING |
| C2 | Console errors on every page | Static: every `getElementById` target exists on every page that loads the script; guards present | No null dereference | js.js guards burger/menu; booking.js returns when `#bkOverlay` is missing; homes inline script assumes `#lightbox` (present). PASS statically | PENDING |
| C3 | Booking calendar | Logic review | Past days disabled, month nav, selection persists, summary updates | PASS. Minor: past time slots selectable for today; weekends / unlimited future months allowed | PENDING |
| C4 | Booking: success state | Review | Re-opening after success resets or offers "book another" | FAIL (minor): success view sticks; heading reads "Almost there" even on confirmed success (index.html:396) | PENDING |
| C5 | Booking interest list matches the collection | Compare | All 4 models listed | FAIL: The Woodrow missing (index.html:377-384) | PENDING |
| C6 | Theme toggle | Review | Persisted, applied before first paint, label in sync | FAIL (minor): applied at end of `<body>` (js.js:29), so dark-mode users see a light flash; `localStorage` unguarded (throws in some privacy modes) | PENDING |
| C7 | Active nav highlight | Review js.js:21-24 | Works at `/`, `/x.html`, and Netlify pretty URLs `/x` | FAIL on pretty URLs (`/homes` ≠ `homes.html`) | PENDING |
| C8 | Mobile menu | Review | Toggles, closes on link click, hides on resize to desktop | FAIL (minor): inline `display:flex` keeps the menu visible above 980 px after resizing | PENDING |
| C9 | Responsive layout at 320 / 375 / 768 / 1024 / 1440 | Static CSS review (no browser) | No horizontal scroll, grids collapse | FAIL: index.html:176 inline `grid-template-columns:repeat(4,1fr)` overrides the ≤980 px rule, so 4 squeezed columns on phones. register.html:113 inline `1fr 1fr` overrides mobile form stacking. `.btn{white-space:nowrap}` with long labels can overflow at 320 px, and `body{overflow-x:hidden}` masks it | PENDING |
| C10 | Cross-page consistency | md5 of shared head/header; footer diff | Identical nav/header/footer | Header + head lines 22-73 identical on all 8 pages (PASS). Footer: homes.html is missing the Root9 logo link; contact.html has no footer Contact button (intentional) | PENDING |
| C11 | Content consistency | Read | Model names / prices match across pages | builders.html:108 lists only Tucker, Fatboy, Boone (Woodrow omitted). Stat strip claims 11 homesites vs "229 estate homesites" elsewhere (likely intentional: available vs total) | PENDING |
| C12 | Dead code / unused CSS | grep | None | `.thumb-row`, `.hero-note`, `.pb-tile.clear` unused; style.css:72 overridden by :237 `!important`; duplicate `.page-hero .hero-kicker` (76 & 89) | PENDING |
| C13 | CSS browser support | Review | Fallbacks for modern features | `color-mix()` (style.css:49) has no fallback, so the header goes transparent on Safari < 16.2 / Chrome < 111 | PENDING |
| C14 | SCSS compiles (if added) | `npx sass styles.scss` | Compiles with no errors; compiled CSS is what the HTML links | PENDING | PENDING |
| C15 | HTML well-formed | qa_check | No unclosed / stray tags, no duplicate IDs | PASS on all 8 pages | PENDING |

## 6. Phase 2 execution checklist (redesign)

1. `git status` / `git diff --stat`: confirm the changed files match Frontend Dev's list.
2. Re-run `qa_check.py` with fresh remote sizes; diff against the baseline above.
3. `node --check` each JS file and each extracted inline script.
4. `npx sass` for any `.scss`; confirm every page links the compiled output, not the `.scss`.
5. Re-verify every regression-prone item: booking modal IDs (`bkOverlay`, `bkGrid`, `bkMonth`, `bkPrev`, `bkNext`, `bkSlots`, `bkSummary`, `bkErr`, `bkForm`, `bkDone`, `bkDoneMsg`, `bkSubmit`, `bkClose`, `bkCalWrap`, `.bk-head`, `bkName`, `bkPhone`, `bkEmail`, `bkInterest`, `bkNotes`, `bkCompany`), the hidden Netlify form, `#burger`/`#mobileMenu`, `[data-toggle-theme]`/`.tt-label`, `.reveal`, `.nav-links`, the homes `data-target` / `*-stage` / `*-cap` IDs, `#lightbox`/`#lb-img`.
6. Re-check sections 1-5 and fill in the Phase 2 column.
7. Fix bugs with minimal edits; log them in "Phase 2 results".

---

## Findings (pre-redesign)

Severity: **H** high · **M** medium · **L** low. Line numbers refer to commit `42cba62`.

### Security
- **F-S1 (M)** No security headers at all: no `netlify.toml` / `_headers`; NETLIFY_SETUP.md says nothing about them. Missing CSP, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Suggested `_headers` (CSP must allow the Pixel, Fonts, Maps, Webflow CDN, and inline Pixel bootstrap):
  ```
  /*
    X-Frame-Options: SAMEORIGIN
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
    Permissions-Policy: camera=(), microphone=(), geolocation=()
    Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://connect.facebook.net; img-src 'self' data: https://cdn.prod.website-files.com https://www.facebook.com; media-src 'self' https://cdn.prod.website-files.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-src https://www.google.com; connect-src 'self' https://www.facebook.com https://connect.facebook.net; form-action 'self' mailto:; frame-ancestors 'self'; base-uri 'self'
  /assets/*
    Cache-Control: public, max-age=604800
  ```
  (Inline `style=""` attributes are used heavily, so `style-src 'unsafe-inline'` is needed unless they are refactored out.)
- **F-S2 (L)** 21 `target="_blank"` links use `rel="noopener"` without `noreferrer`: index.html:139,320,321; homes.html:172,250,327,409,474; builders.html:166,196,197; contact/developer/discover/gallery/register footer links (contact:152-153, developer:142-143, discover:247-248, gallery:179-180, register:163-164).
- **F-S3 (L)** homes.html:487 `cap.innerHTML = btn.dataset.cap`. The data is static, but the sink is unsafe; use `textContent`.
- **F-S4 (M)** contact.html:105 and register.html:113 use `action="mailto:" enctype="text/plain"`: depends on a configured mail client, often does nothing on mobile/webmail, leaves no record, and has no honeypot. Convert to Netlify Forms with `netlify-honeypot` (NETLIFY_SETUP.md already notes this).
- **F-S5 (L)** Personal email `tariktawfek71@hotmail.com` is hard-coded in public JS (booking.js:7) for the mailto fallback, which invites spam harvesting. Consider using `info@diamondridgeliving.ca`.
- **F-S6 (L / decision)** Meta Pixel (`<head>` lines 26-42 on every page) loads `connect.facebook.net/en_US/fbevents.js` with no SRI (cannot be pinned) and fires before any consent. The privacy policy link points off-site (diamondridgeliving.ca). Needs an owner decision on consent (PIPEDA / PIPA).
- **F-S7 (L)** Google Maps iframes (index.html:290, contact.html:98, discover.html:97) lack `referrerpolicy="no-referrer-when-downgrade"`. Cosmetic.
- **F-S8 (L)** localize_assets.py:
  - Line 98 rewrites *every* match, including `og:image`/`twitter:image` meta, to a relative `assets/...` path. That breaks social previews (OG needs absolute URLs).
  - Line 101 overwrites HTML in place with no backup and a non-atomic write. An interrupted run can truncate a page.
  - Line 47 has no max size or content-type check on downloads (low risk: host is pinned to `cdn.prod.website-files.com` by the regex on line 22, https only).
  - Line 41: "skip if exists" never refreshes a file that changed upstream under the same name.
  - Filename sanitising (lines 29-37) prevents path traversal. A URL ending in `/..` yields `..`, which fails safely on `open()`.
  - Regex `[^\s"'<>]+` would capture a trailing `)` from CSS `url(...)` (none exist today).

### Performance
- **F-P1 (H)** gallery.html carries **59 MB** of images (30 remote originals, many 2-4 MB PNG/JPEG, e.g. gallery.html:107 RoyalitePark.jpeg 4.02 MB, :135 DRSiteAerial.jpg 4.12 MB, :128 HOme5.png 3.88 MB). Needs resizing to ~1600 px wide, WebP/AVIF, and `srcset`.
- **F-P2 (H)** Footer Root9 logo `Title (5).png` is **961 KB** for a 34 px-high image, on index:321, builders:197, contact:153, developer:143, discover:248, gallery:180, register:164. The header logo `Title (1).png` (224 KB, line 49 on every page) is also oversized and is the first image on each page.
- **F-P3 (M)** index.html:161 `Site8.png` 2.94 MB; register.html:78 hero `Epicwideshot.jpg` 2.95 MB; developer.html:97 `DonVolunteer.jpeg` 2.43 MB.
- **F-P4 (M)** LCP hero images are marked `loading="lazy"`: contact.html:78, developer.html:78, register.html:78. Should be eager with `fetchpriority="high"`.
- **F-P5 (M)** No `<img>` has `width`/`height` (CLS), and there is no `aspect-ratio` CSS except fixed-height model cards (style.css:135).
- **F-P6 (L)** Video posters are large PNGs: index/gallery:78-79 `DiamondValleyBanner.png` 506 KB, discover:78 `DiamondValleySunset.png` 993 KB. Videos have no `preload` attribute.
- **F-P7 (L)** Google Fonts request (line 24 on every page) includes unused weights (Fraunces 340/600, Work Sans 300/500/600) and is render-blocking; h1-h3 use `font-weight:420` (style.css:41), which is not among the loaded static instances (renders as 470).
- **F-P8 (L)** homes.html stage images 202, 280, 358 are eager though far below the fold (~520 KB extra on initial load).
- **F-P9 (L)** No caching headers configured (see F-S1). `css/style.css` is not minified (24 KB).

### SEO
- **F-SEO1 (M)** homes.html:16 and :21 `og:image`/`twitter:image` are relative (`assets/models/tucker-ext-a.jpg`). Scrapers require an absolute URL.
- **F-SEO2 (M)** No `<link rel="canonical">` on any page; no `robots.txt`, `sitemap.xml`, `404.html`.
- **F-SEO3 (M)** No structured data (JSON-LD) anywhere.
- **F-SEO4 (L)** `og:image` for 7 pages is a 2.95 MB JPEG; recommended ~1200×630, < 300 KB.
- **F-SEO5 (L)** Meta descriptions over 160 chars: discover.html:7 (174), homes.html:7 (174).

### Accessibility
- **F-A1 (M)** Contrast: `.btn-solid` text #FFFDF8 on the gradient's wheat end is 2.35:1 (style.css:59). In dark theme `--rust`=#C9A25C and `--wheat`=#C9A25C (2.35:1 throughout). `.switch.on`, `.slot.sel`, `.cal-day.sel` share the gradient. `.eyebrow` rust on `--stone-dark` sections is 3.60:1 at 12.5 px. `.bk-err` #B4442A on the dark bg is 3.36:1 (style.css:325).
- **F-A2 (M)** Booking modal (booking.js:96-97): no focus move into the dialog, no focus trap, no focus return; Esc handler (104) runs even when closed (harmless).
- **F-A3 (M)** homes.html lightbox: opened only by mouse click on `<img>` (494-496), close control is a non-focusable `<span>` (449), no dialog role. `<img id="lb-img" src="">` with empty `src` (449) is invalid HTML and can trigger a request for the page URL in some browsers.
- **F-A4 (M)** `.reveal{opacity:0}` (style.css:44) and js.js:12 `new IntersectionObserver` without a feature check: if JS fails or IO is unsupported, most content stays invisible.
- **F-A5 (L)** Burger button has no `aria-expanded`/`aria-controls` (line 61 on all pages; js.js:5-7).
- **F-A6 (L)** Autoplaying looping hero videos (index:79, builders:78, discover:78, gallery:78) have no pause control (WCAG 2.2.2) and ignore `prefers-reduced-motion`.
- **F-A7 (L)** homes.html:486: the stage image `alt` stays "exterior elevation A" when switched to Kitchen/Dining etc.
- **F-A8 (L)** `data-book` triggers are `href="#"` (index.html:87,156). With no JS they scroll to the top; a `register.html` or `contact.html` href would degrade gracefully.

### Code / functional
- **F-C1 (M)** index.html:176 inline `style="grid-template-columns:repeat(4,1fr)"` beats the `@media (max-width:980px) .model-grid{grid-template-columns:1fr}` rule (style.css:197), so 4 cramped columns on tablets and phones.
- **F-C2 (M)** Booking "What would you like to see?" omits **The Woodrow** (index.html:377-384) though it's one of the four advertised homes.
- **F-C3 (L)** builders.html:108 copy lists "The Tucker, The Fatboy, and The Boone" and omits The Woodrow.
- **F-C4 (L)** register.html:113 inline `grid-template-columns:1fr 1fr` defeats the mobile `.form-grid{1fr}` rule (style.css:202).
- **F-C5 (L)** js.js:21-24 active-link logic fails with Netlify pretty URLs (`/homes`) and with trailing-slash paths.
- **F-C6 (L)** js.js:27-29 theme is applied after the page renders, so dark-mode users see a light flash. `localStorage` access isn't wrapped in try/catch.
- **F-C7 (L)** js.js:5-7 mobile menu uses inline `display`; if opened and the viewport is widened past 980 px, it stays visible under the desktop nav.
- **F-C8 (L)** booking.js:106-112 success state persists; re-opening the modal shows the old confirmation. Success heading is "Almost there" (index.html:396) even when the request was sent. Today's past time slots remain selectable.
- **F-C9 (L)** style.css:49 `color-mix()` has no fallback `background`; older Safari / Chrome would render a transparent sticky header.
- **F-C10 (L)** Dead / duplicate CSS: `.thumb-row` (268-270, 286, 291-292), `.hero-note` (81), `.pb-tile.clear` (245) are unused. style.css:72 is overridden by :237 (`!important`). `.page-hero .hero-kicker` is defined twice (76 and 89).
- **F-C11 (L)** homes.html footer (472-475) is missing the Root9 logo link present on the other 7 pages.
- **F-C12 (L)** Developer and discover "Book a visit" buttons (developer.html:112, discover.html:216) go to register.html because the booking modal exists only on index.html.

### Verified OK (baseline)
- HTML well-formed on all 8 pages (no unclosed / stray tags, no duplicate IDs).
- 0 missing local files; 0 broken `#anchors` (homes.html#tucker/#woodrow/#boone/#fatboy all exist).
- 45/45 remote CDN URLs return HTTP 200 (including the two `%2F` Webflow video URLs).
- Every visible form control has a `<label for>`; every `<img>` has `alt`.
- One `<h1>` per page, no skipped heading levels.
- Shared `<head>` + header markup (lines 22-73) is byte-identical across all pages.
- booking.js writes user data only via `textContent`; network payload is URL-encoded; honeypot field name matches `netlify-honeypot="bot-field"`.

---

## Phase 2 results (redesign, 2026-10-24)

The "Phase 2" column in sections 1-5 is superseded by this section.

### What changed (verified with `git status`)
Matches Frontend Dev's list exactly. Modified: the 8 pages, `js.js`, `booking.js`. Deleted: `css/style.css` (no references remain). New: `css/styles.scss`, `css/styles.css`, `404.html`, `robots.txt`, `sitemap.xml`, `assets/brand/diamond-ridge-logo.png` (20 KB), `assets/brand/root9-logo.png` (14 KB), `assets/og/diamond-ridge-og.jpg` (134 KB, 1200×630). QA added `_headers` and made the edits listed under "Bugs fixed by QA".

### How it was verified
- `node --check js.js booking.js`: OK.
- `npx sass@1.79.4 css/styles.scss --style=compressed`: compiles with no warnings, and the output is **byte-identical** to the shipped `css/styles.css` (re-checked after QA's SCSS edit). Every page links `css/styles.css`, never the `.scss`.
- `qa_check.py` (static): 0 HTML structure errors, 0 duplicate IDs, 0 missing local files, 0 broken anchors, all `<img>` have alt + width/height, every `target=_blank` has `noopener noreferrer`, one `<h1>` per page, no skipped heading levels, canonical + OG on every indexable page.
  - Expected noise: `index.html#book` has no `id="book"` (by design; booking.js opens on the hash). The hidden Netlify detection form has no labels (`hidden`). 404.html has no canonical/OG (`noindex`).
- `img_dims.py`: 106/106 `<img>` declare width/height matching the real intrinsic aspect ratio (local files parsed; remote via Range requests).
- 45/45 remote CDN URLs return 200. All local refs resolve, including the 4 brochure PDFs (HTTP 200 from the local server).
- Visible-text diff vs `42cba62`: no content lost. Only the theme-toggle label, the old home title, "Almost there" → "Thank you", and the builders paragraph (rewritten to include The Woodrow) differ.
- JSON-LD parses on all 8 pages (WebSite / RealEstateAgent / Place, ItemList of Product+SingleFamilyResidence with CAD offers, BreadcrumbList, ContactPage, AboutPage, CollectionPage).
- Browser suite (`run.js`, 135 checks) + regression suite (`regress.js`, 9 checks): **144/144 PASS** on the final tree.

### Results per item

| ID | Result | Notes |
|---|---|---|
| S1 innerHTML sinks | PASS | homes switcher now uses `textContent`; js.js lightbox `innerHTML` is a constant string; booking.js clears with `innerHTML=''` only. Test: name `<img src=x onerror=…>` is not rendered as markup |
| S2 payload encoding | PASS | POST body verified: `form-name=showing-request&name=QA+Tester+%3Cimg…` |
| S3 mailto injection | PASS | unchanged, all URI-encoded |
| S4 contact/register forms | **FAIL (open)** | still `mailto:` + `text/plain` (Frontend kept them as instructed). Needs Netlify Forms + honeypot |
| S5 honeypot | PASS for booking; FAIL for contact/register | booking honeypot is never focusable (60×Tab test) and is posted empty |
| S6 Netlify form registration | PASS | hidden form fields match the JS payload |
| S7 rel noopener noreferrer | PASS | 0 offenders (was 21) |
| S8 third-party scripts | Open (accepted) | Meta Pixel can't take SRI. The font loader uses an inline `onload` handler, which a future CSP must allow (`'unsafe-hashes'` or a hash) |
| S9 mixed content | PASS | |
| S10 secrets | PASS / info | no secrets. Personal hotmail still in booking.js:7 (owner decision) |
| S11 security headers | **PARTIAL, FIXED by QA** | `_headers` added (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, 1-day cache on /assets). **No CSP yet**; roll out the policy in F-S1 as `Content-Security-Policy-Report-Only` on a deploy preview first |
| S12 iframes | PASS | `referrerpolicy` added |
| S13 localize_assets.py | Open (low) | unchanged. og:image is now local, so the og-rewrite issue no longer applies; no-backup / non-atomic write remains |
| S14 clickjacking | FIXED | `X-Frame-Options: SAMEORIGIN` via `_headers` (untested until deployed) |
| S15 consent | Open (decision) | Pixel still fires without consent |
| P1 image formats/sizes | **FAIL (open)** | remote originals unchanged; gallery still 58 MB if scrolled fully (now all lazy + async). No `srcset` |
| P2 logos | PASS | 224 KB → 20 KB header logo; 961 KB → 14 KB footer logo |
| P3 page weight | Improved, still FAIL | full-scroll media: index 5.62 MB (was 6.77), homes 4.04, register 3.00 (hero Epicwideshot 2.95 MB is the LCP image), developer 2.61, builders 2.16, discover 2.01, contact 0.58, gallery 58.0 |
| P4 lazy / LCP | PASS | heroes are eager + `fetchpriority="high"`; everything below the fold is lazy. LCP element is `img.hero-media` on every page |
| P5 width/height (CLS) | PASS | 106/106 correct. Measured CLS @390 px after load + full scroll: 0.000-0.007 on content pages, 0.051 on 404 |
| P6 render-blocking | PASS | fonts non-blocking (`media=print` swap + noscript); scripts `defer` |
| P7 fonts | PASS | only the weights in use (Fraunces 400/400i, Inter 400/500/600) |
| P8 video | PASS / open | `preload="none"`, not played under reduced motion (verified). The hero poster PNGs are still large (index/gallery 506 KB, discover 993 KB) and are now the LCP image |
| P9 caching | PARTIAL | `/assets/*` 1-day cache via `_headers`; CSS/JS keep Netlify defaults (not fingerprinted) |
| SEO1-2 title / description | PASS | all descriptions ≤ 160 chars |
| SEO3 canonical | PASS | all 8 indexable pages; matches og:url |
| SEO4 OG / Twitter | PASS | absolute 134 KB 1200×630 image with dimensions + alt |
| SEO5 structured data | PASS | valid JSON on every page |
| SEO6 robots / sitemap / 404 | PASS | sitemap lists the 8 pages; 404 is `noindex` with root-relative URLs (correct for Netlify's nested-path 404s) |
| SEO7 headings | PASS | |
| SEO8-9 links / assets | PASS | |
| A1 alt text | PASS | stage alt updates on switch (verified) |
| A2 labels | PASS | |
| A3 contrast | PASS | axe 0 violations on 9 pages; computed: text 16.5:1, muted 10.1:1, subtle ≥ 5.3:1 on every surface, on-accent ≥ 5.9:1 on the darkest gradient stop, danger ≥ 7.1:1 |
| A4 keyboard | PASS | lightbox opens with Enter on the link, Tab is held on close, Esc closes and returns focus |
| A5 modal | PASS | focus to close, Shift+Tab/Tab trapped (60×Tab never escapes), Esc + backdrop close, focus returns to trigger, success heading focused |
| A6 burger | PASS | `aria-expanded` toggles, Esc closes + refocuses, resets past 60em |
| A7 motion | PASS | pause/play button works; reduced motion → video hidden, not played |
| A8 no-JS | PASS | JS disabled: 0 hidden `.reveal`, all 6 nav links reachable at 375 px |
| A9 link purpose | PASS | `data-book` links fall back to `register.html` |
| A10 dark readability | PASS (axe) | |
| C1 JS syntax | PASS | |
| C2 console errors | PASS | 0 console/page errors and 0 failed requests on 9 pages @375 and @1440 |
| C3 calendar | **FIXED by QA** | past time slots for today are now disabled |
| C4 success state | **FIXED by QA** | re-open now clears fields + selection (was only un-hiding the form) |
| C5 Woodrow option | PASS | posted as `interest=The+Woodrow` |
| C6 theme | N/A | light theme removed; dark-only with `color-scheme: dark` |
| C7 active nav | PASS | static `aria-current="page"` on every page |
| C8 mobile menu | PASS | |
| C9 responsive | PASS | 9 pages × 320/375/768/1024/1440: no horizontal overflow, no element past the viewport (45/45). Booking dialog fits 375 px |
| C10 consistency | PASS | header identical on all subpages (index differs only by `data-book`); footer identical except contact.html (no self-link button) |
| C11 content | PASS | Woodrow in builders copy and booking select |
| C12 dead CSS | PASS | old stylesheet removed |
| C13 browser support | PASS | header has a solid fallback; `backdrop-filter` only under `@supports`; `(scripting: enabled)` degrades to visible content where unsupported |
| C14 SCSS compiles | PASS | sass 1.79.4, identical output |
| C15 HTML well-formed | PASS | |

### Bugs found and fixed by QA
1. **booking.js `resetIfDone()` (lines ~126-141): stale data on re-open.** After a completed request, re-opening the dialog still showed the previous name, email, notes, date and slot, though the code comment says it "starts a fresh booking" (risk: duplicate submissions). It now clears the inputs, interest, selection and calendar month, then re-renders.
2. **booking.js `close()` (lines ~150-158): `#book` hash stuck in the URL.** Closing a dialog opened by the `index.html#book` deep link left the hash, so a reload (or sharing the URL) reopened it. `history.replaceState` now removes the hash on close.
3. **booking.js `slotMinutes()` / `syncSlots()` (new, lines ~77-97, called from the date click handler): past time slots for today.** When today is selected, slots at or before the current time are disabled, and a now-past selected slot is cleared.
4. **css/styles.scss `.slot` (lines ~1767-1769): no disabled state.** Added `&:disabled` (dimmed, line-through, not-allowed) and `:hover:not(:disabled)`, matching `.cal-day`. `css/styles.css` was recompiled with the same sass 1.79.4.
5. **New `_headers`: no security headers (F-S1, partial).** Adds the 4 safe headers + asset caching. NETLIFY_SETUP.md got a one-line note.

Regression tests (mocked clock 12:15): 10:00 and 11:30 disabled, 1:00/2:30/4:00 enabled; a future date re-enables all; switching back clears a past selection; re-open after success is empty; closing removes `#book`; reload doesn't reopen; 0 page errors. 9/9 PASS. The full suites were re-run afterwards (135/135).

### Remaining issues (not fixed, with reasons)
- **No CSP:** needs an allow-list tested on a deploy preview (Pixel, Maps, Fonts, Webflow CDN, inline Pixel bootstrap and font `onload`). Shipping one untested could break tracking or maps.
- **Contact / register forms still `mailto:`:** kept unchanged by instruction. Converting to Netlify Forms (with honeypot) is an owner decision; NETLIFY_SETUP.md already describes how.
- **Gallery / remote images not resized (58 MB on gallery, 2.95 MB register hero, 0.5-1 MB PNG hero posters):** needs asset processing and re-hosting (WebP/AVIF + `srcset`), outside a code-only fix.
- **Personal email in booking.js:7 and Pixel consent:** owner decisions.
- **localize_assets.py:** writes HTML with no backup. Low risk, unchanged.
- **Not tested:** real Netlify deploy (form submission, `_headers` applied, pretty-URL behaviour, 404 routing), Lighthouse scores, throttled LCP, real screen readers, Safari/Firefox (only Chromium was run).

## Update: hosting moved to Vercel

The site is no longer on Netlify; it is hosted on Vercel. Items above that mention Netlify are superseded as follows:

- **S4 / S5 / S6 (forms):** the hidden Netlify form and the booking POST were removed. The booking modal now opens the visitor's mail app addressed to info@diamondridgeliving.ca (the honeypot still short-circuits bots). Contact / register stay `mailto:` to the same address. The personal Hotmail address is gone from booking.js (S10).
- **S11 / S14 / P9 (headers):** `_headers` was replaced by `vercel.json` with the same four security headers and the 1-day `/assets/*` cache. Still no CSP; roll the F-S1 policy out as `Content-Security-Policy-Report-Only` on a Vercel preview deployment first. Untested until deployed.
- **Meta Pixel:** now consent-gated. It loads only after "Accept" in the cookie banner (js.js); every footer has a "Cookie settings" button to change the choice. Verified headless: no facebook.net/facebook.com requests before consent or after decline; fbevents.js loads on accept and on later pages.
- **SEO URLs:** canonical, Open Graph, structured data, sitemap.xml and robots.txt now use https://diamondridgeliving.ca.
- Vercel serves `404.html` for missing paths automatically; `cleanUrls` is left off, so the `.html` URLs in canonicals and the sitemap stay valid.

---

## Valmont model update (12 models)

Owner: QA · Branch: `revamp-homepage` · Baseline: working tree on 2026-10-25, before Frontend Dev's model changes (4 models: Tucker, Woodrow, Boone, Fatboy).
Source of truth: `Spec Sheet/<name>.pdf` in each model folder under `Downloads\2 - Storey` and `Downloads\Bungalow` (`Archive` subfolders ignored, nothing in Downloads modified). MODELS.md (Senior Web Developer) is the team's extraction; QA cross-checks it against its own extraction below.

Status key as above. The Phase 2 column is filled in after "frontend complete".

### V0. QA's independent reference data (from the spec-sheet PDFs, `pdftotext -layout`)

| Model | Type | Main / Upper sq ft | Total sq ft | Beds (page 1) | Baths | Garage | Starting from (incl. GST) | Plan variants (page 2) | Exteriors in Renders/ | Interiors in Renders/ |
|---|---|---|---|---|---|---|---|---|---|---|
| The Duke | 2-storey | 1,020 / 1,150 | 2,170 | 3 Bed (+ bonus room; 4th bed optional) | 2.5 | 3-Car attached | $819,000 | Main, Upper | 1 (Option A) | Family Room, Kitchen, Kitchen & Dining |
| The Fatboy | 2-storey | 1,230 / 1,400 | 2,630 | 3 Bed + Bonus | 2.5 | 3-Car | $949,000 | Main, Upper | 2 (Render, Option B) | Great Room, Kitchen |
| The Metallica | 2-storey | 1,380 / 1,610 | 2,990 | 3 Bed + Den | 2.5 | 3-Car attached (30' wide) | $1,019,000 | Main, Upper | 3 (Render, B, C) | Kitchen, Dining, Family Room |
| The Snowball | 2-storey | 1,700 / 1,250 | 2,950 | 3 Bed + Loft (main-floor primary) | 3.5 | 2-Car **detached** | $1,049,000 | Main, Upper | 1 (Option A) | Living Room, Kitchen, Dining |
| The Winchester | 2-storey | 1,150 / 1,250 | 2,400 | 3 Bed + Den | 2.5 | 3-Car attached | $889,000 | Main, Upper | 2 (A, B) | Family Room, Kitchen, Ensuite, Ensuite 2 |
| The Boone | Bungalow | 1,800 | 1,800 | 2 Bed | 2 | 2-Car attached | $769,000 | A: 1 Bed + Den 1,800 · B: 2 Bed 1,800 | 3 (A, B, C) | Family Room, Kitchen |
| The Burrito (rental) | Bungalow | 1,100 | 1,100 | 1 Bed | 1.5 | 2-Car | $599,000 | Main floor 1,100 | 1 | Family Room, Kitchen |
| The Madonna | Bungalow | 1,450 / 1,480 | 1,450 | 2 Bed | 2 | 2-Car "available" | $699,000 | A: 1 Bed + Den **1,450** · B: 2 Bed **1,480** | 3 (A, B, C) | Dining, Kitchen |
| The Max | Bungalow | 1,280 | 1,280 | 2 Bed | 2 | 3-Car (oversized) | $639,000 | Main floor, 2 Beds | 3 (A, B, C) | Kitchen |
| The Taco | Bungalow | 1,300 | 1,300 | 2 Bed | 2 | 2-Car (20' × 22') | $619,000 | Main floor 1,300 | 3 (Render, Option 2, Option 3) | Dining, Kitchen, Family Room |
| The Tucker | Bungalow | 1,560 | 1,560 | 2 Bed | 2 | 3-Car side-attached | $709,000 | A: 1 Bed + Den 1,560 · B: 2 Bed 1,560 | 3 (A, B, C) | Kitchen, Family Room, Dining |
| The Woodrow | Bungalow | 1,800 | 1,800 | 3 Bed | 2 | 2-Car (oversized) | $769,000 | A: 2 Bed 1,800 · B: 3 Bed 1,800 | 3 (A, B, C) | Family Room, Dining, Kitchen |

Expected asset totals (non-Archive): **28 exteriors + 31 interiors = 59 renders, 21 floor-plan images, 12 brochures (92 files)**, unless the team deliberately drops some (that must be documented in MODELS.md).

Traps found while building the reference, which the site must **not** copy:
- **The folder names are wrong; use the spec sheets.** Duke "(1660)" vs 2,170; Fatboy "1300 & 1500 (2060)" vs 1,230 / 1,400 = 2,630; Metallica "1350 & 1600 (2150)" vs 1,380 / 1,610 = 2,990; Snowball "(1800)" vs 2,950; Winchester "(2150)" vs 2,400. The bungalow figures in parentheses (2230, 2050, 1915, 1770, 2260) appear nowhere in the PDFs.
- **Old site figures are stale:** Tucker 1,660 sq ft / $669,000 / 1 + Den / 1.5 bath; Fatboy 1,350 and 1,450; the "Four designs" copy; Tucker "Vaulted great room: Standard" (now an optional add-on), "Sunshine basement" and "Stainless appliance package: Included" (not in the spec sheet).
- **Boone and Woodrow share 1,800 sq ft and $769,000.** Check that their images and plans aren't swapped (Boone 2 Bed, 2-Car attached; Woodrow 3 Bed).
- **The Madonna's sq ft depends on the variant** (1,450 vs 1,480). Its page 1 says "2 Bed", but page 3 makes the Den the standard layout and 2 bedrooms an add-on. The site must follow whatever MODELS.md decides and say so consistently. **Owner decision (2026-10-25): standard = 2 Bed, 1,480 sq ft; 1 Bed + Den, 1,450 sq ft is the alternate plan. See VN12.**
- **Room-dimension tables can't be checked against the spec-sheet text.** The PDFs have no room dimensions except Taco's garage (20' × 22'). Any dimension list on the site must match the plan image, or be removed.
- **Spec sheets are 3-4 pages and up to 21.8 MB each** (203.8 MB for all 12; the old brochures were 0.55-0.65 MB). Copying them unchanged blows the page and deploy budget.
- PDF metadata checked: Title "Valmont Custom Homes · The X", Creator = headless Chromium, no author, user name or local path. PASS at source; re-check the copies.

### V1. Data accuracy

| ID | Test | Method | Expected | Phase 2 |
|---|---|---|---|---|
| VD1 | MODELS.md agrees with the spec sheets | Diff MODELS.md against V0 field by field. Re-open the PDF page for any difference | 0 differences, or each one explained (e.g. the Madonna bed count) | PENDING |
| VD2 | Per-model quick stats on homes.html | Script: parse each `section.model-block` (eyebrow, `.quickstats`, plan panel titles) and compare with V0 | Sq ft per floor and total, beds, baths, garage and price all match. 2-storey models show both floors | PENDING |
| VD3 | Plan variants | Same script + visual | Boone, Madonna, Tucker and Woodrow show both options with the correct label and sq ft (Madonna: 2 Bed 1,480 standard and default, 1 Bed + Den 1,450 alternate; see VN12). 2-storey models show Main + Upper with the right per-floor sq ft | PENDING |
| VD4 | Feature lists: standard vs optional | Read each model's feature list against PDF page 3 | Nothing the PDF calls "optional add-on" is marked Standard (vaulted great/family room, five-piece ensuite on Fatboy/Duke, rear patio, legal suite on Burrito, basement development) | PENDING |
| VD5 | Price wording | grep | Every price is "Starting from $X" (incl. GST mentioned at least once per page) and matches V0. No old $669,000 | PENDING |
| VD6 | Same data everywhere | grep sq ft / price / bed figures across index.html (model cards), builders.html, homes.html JSON-LD, og/meta descriptions | All copies agree with homes.html | PENDING |
| VD7 | Images match their model | Perceptual check: downscale each site image and its source PNG/JPG and compare; also view the contact sheets | Each `assets/models/<slug>-*` derives from the same model's folder (catches Boone/Woodrow and Taco option swaps) | PENDING |
| VD8 | Spot-check PDFs by eye | Render page 1 and page 2 of at least 4 PDFs (Fatboy, Madonna, Snowball, Tucker) to PNG and read them | Matches V0 / MODELS.md | PENDING |

### V2. Completeness and stale content

| ID | Test | Method | Expected | Phase 2 |
|---|---|---|---|---|
| VC1 | All 12 models on homes.html | Count `section.model-block` ids and the jump nav | 12 blocks with unique ids. The jump nav links all 12, every `#anchor` resolves, and the order is sensible (e.g. grouped bungalow / 2-storey) | PENDING |
| VC2 | Every exterior option is reachable | Count exterior switcher buttons per model vs V0 | 28 total, per-model counts as in V0 | PENDING |
| VC3 | Every interior render is reachable | Same | 31 total | PENDING |
| VC4 | Every floor plan variant is shown | Count plan images or plan-switcher tabs | 21 total | PENDING |
| VC5 | Every brochure is linked | `a[href$=".pdf"]` per model | 12, each pointing at its own model's PDF, labelled "(PDF, opens in a new tab)" with the size | PENDING |
| VC6 | No stale 4-model copy anywhere | `grep -niE "four (designs\|models\|homes\|plans)\|\b4 (designs\|models)\|1,?660\|1,?350\|1,?450 sq\|669,000\|sunshine basement"` on all HTML / JS / sitemap / MODELS.md | 0 hits (1,450 is allowed only for the Madonna) | PENDING |
| VC7 | Dropdowns list the right models | Read `#bkInterest` (index.html), any model select on register.html / contact.html, and booking.js `selectedIndex` reset logic | All 12 models in the same order and spelling as homes.html. Generic options kept. Reset still selects the first option | PENDING |
| VC8 | Other pages' model mentions | index.html model cards and portrait, builders.html Valmont copy and image, gallery.html | No page claims 4 models. Cards link to existing `homes.html#<id>` anchors | PENDING |
| VC9 | Burrito / Taco wording | Read | Per MODELS.md §2: The Burrito is **not** labelled "Rental" (the spec sheet never says it); the legal suite is described as an optional add-on. No copy claims every model is named after a horse (Taco is a donkey) | PENDING |

### V3. Assets

| ID | Test | Method | Expected | Phase 2 |
|---|---|---|---|---|
| VA1 | Every reference resolves | `qa_check.py` (src, href, data-src, srcset, og:image, JSON-LD `image`) + HTTP 200 from the local server | 0 missing | PENDING |
| VA2 | No orphaned files | Set difference between the files in `assets/models` and every reference in HTML/JS/JSON-LD | 0 orphans (the old `*-plan-main.jpg` etc. are deleted or reused) | PENDING |
| VA3 | Render weight | `du` + PIL dims | Each render ≤ ~300 KB (hard fail > 450 KB), JPEG or WebP, long edge ≈ 1600-2000 px | PENDING |
| VA4 | Floor plans legible | Plan files open at 100% in the lightbox; room labels readable at 1440 px | Long edge ≥ 1400 px, ≤ ~600 KB, text sharp (no heavy JPEG artefacts) | PENDING |
| VA5 | Brochure weight | `du` | Each PDF ≤ ~3 MB (hard fail > 10 MB; sources are up to 21.8 MB). Text still matches the source (`pdftotext` diff) | PENDING |
| VA6 | width/height correct | `img_dims.py` | Every `<img>` declares the file's real intrinsic size (aspect within 1 %) | PENDING |
| VA7 | Lazy loading | DOM + scroll test | Only the hero / first image in view is eager. Every model block below the fold is `loading="lazy"` + `decoding="async"`. Switcher images are not preloaded | PENDING |
| VA8 | Alt text | Read every alt + check the switcher updates it | Descriptive and unique: "The Duke, exterior elevation A", "The Madonna floor plan, option B, 2 bedrooms, 1,480 sq ft". No filenames, no empty alt on content images. Stage alt updates on switch | PENDING |
| VA9 | Filenames | `ls assets/models` | Lowercase slug, no spaces or `&`, no "archive", "final", "copy" | PENDING |

### V4. SEO

| ID | Test | Method | Expected | Phase 2 |
|---|---|---|---|---|
| VS1 | Titles and descriptions | qa_check | Unique per page, title ≤ 60 chars, description ≤ 160 chars. homes.html copy now says 12 designs (no "Four designs" in title, description, og or twitter) | PENDING |
| VS2 | JSON-LD per model | Extract every `application/ld+json`, `JSON.parse`, check the structure | 12 `Product` (+ `SingleFamilyResidence`) items in the ItemList with `name`, absolute `image`, `offers.price` as a number equal to V0, `priceCurrency: CAD`, `floorSize` in FTK equal to the total sq ft, `numberOfBedrooms` / `numberOfBathroomsTotal` consistent with the page, `url` pointing at `https://diamondridgeliving.ca/homes.html#<id>` and a resolving anchor. `numberOfItems` = 12 | PENDING |
| VS3 | Sitemap | Read sitemap.xml | Lists any newly added page. `lastmod` updated for homes.html (and index / builders if changed). Only diamondridgeliving.ca URLs | PENDING |
| VS4 | Canonical / OG URLs | qa_check | Every page's canonical and og:url is `https://diamondridgeliving.ca/<page>.html`. og:image is absolute and resolves | PENDING |
| VS5 | Headings | qa_check | One h1. Each model is an h2, sub-panels h3 or `p.panel-title`. No skipped levels | PENDING |

### V5. Security

| ID | Test | Method | Expected | Phase 2 |
|---|---|---|---|---|
| VX1 | No unsafe sinks with data | grep `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` in js.js, booking.js, inline scripts | Switcher/plan code uses `textContent` / `setAttribute`. Any `innerHTML` is a constant | PENDING |
| VX2 | New-tab links | qa_check | Every `target="_blank"` has `rel="noopener noreferrer"` (12 brochures + any new) | PENDING |
| VX3 | Nothing sensitive in copied files | `ls`, grep the repo for `downloads`, `tarik`, `c:\`, `file://`, and read PDF metadata on the copies with pypdf | No local paths, user names or archive names in filenames, HTML, JSON-LD or PDF metadata | PENDING |
| VX4 | Brochure contact details | `pdftotext` on the copies | Only the public Valmont business contact (phone / info@valmontcustomhomes.com) as in the source. No price sheets or drafts from Archive | PENDING |
| VX5 | vercel.json still valid | `JSON.parse`, headers unchanged | Security headers and the /assets cache still apply to the new files | PENDING |

### V6. Performance (homes.html)

| ID | Test | Method | Expected | Phase 2 |
|---|---|---|---|---|
| VP1 | Initial-load weight | Puppeteer @1440 and @390, cache off, sum of `encodedDataLength`, no scroll | ≤ 1.5 MB transferred (fonts + CSS + JS + above-the-fold images) | PENDING |
| VP2 | Fully scrolled weight | Same, scroll to the bottom in steps, wait for network idle | Record it. Target ≤ 10 MB (12 stage images + plans). Previous 4-model page: 4.04 MB | PENDING |
| VP3 | Switcher loading | Click every switcher button | Each click loads only the selected image. No 404s | PENDING |
| VP4 | Layout shift | PerformanceObserver `layout-shift` during load + full scroll + switching an exterior → interior → plan (images with different aspect ratios) | CLS < 0.02 at load/scroll. The stage keeps a fixed aspect box, so switching causes no shift beyond the stage | PENDING |
| VP5 | LCP element | PerformanceObserver | Hero image, eager + `fetchpriority="high"` | PENDING |

### V7. Regressions

| ID | Test | Method | Expected | Phase 2 |
|---|---|---|---|---|
| VR1 | Cookie consent | `consent_check.js` | No facebook.net / facebook.com requests before Accept or after Decline. Pixel loads after Accept. "Cookie settings" reopens the banner | PENDING |
| VR2 | Booking mailto | `booking_check.js` with the new interest list | `mailto:info@diamondridgeliving.ca` with every field encoded. Interest = the chosen model name. Re-open resets | PENDING |
| VR3 | Mobile nav | run.js nav checks | Burger toggles `aria-expanded`, Esc closes and refocuses, resets past 60em | PENDING |
| VR4 | Lightbox keyboard | Tab to each stage and plan link, Enter, Tab (trap), Esc | Opens, focus held on close, Esc returns focus to the trigger. Works for every model block | PENDING |
| VR5 | Plan / view switcher keyboard | Tab + Enter/Space on every switch | `aria-pressed` moves, image + caption + alt update, focus stays on the button. Plan-variant tabs (if a tablist is used) follow the ARIA pattern (arrow keys, `aria-selected`) | PENDING |
| VR6 | No horizontal scroll | 9 pages × 320/375/768/1024/1440 | `scrollWidth ≤ clientWidth` and no element past the viewport (the 12-item jump nav and long quick stats at 320 px are the most likely to break) | PENDING |
| VR7 | Console | All pages @375 + @1440 | 0 console errors, 0 page errors, 0 failed requests | PENDING |
| VR8 | axe-core 4.10.2 WCAG 2.1 AA | All 9 pages, after scrolling (reveal done) | 0 violations | PENDING |
| VR9 | SCSS | `npx sass@1.79.4 css/styles.scss <tmp> --style=compressed --no-source-map`, then `cmp` with css/styles.css | Compiles without warnings. Byte-identical | PENDING |
| VR10 | JS syntax | `node --check` on js.js, booking.js and the extracted inline scripts | OK | PENDING |
| VR11 | No-JS / reduced motion | JS disabled; `prefers-reduced-motion` | All 12 models visible with their default image. Nothing hidden by `.reveal` | PENDING |

### V8. Code review

| ID | Test | Method | Expected | Phase 2 |
|---|---|---|---|---|
| VCR1 | Diff review of every changed file | `git status` / `git diff` against Frontend Dev's list; read every hunk | The list matches. No debug leftovers. Consistent markup per model block (same classes / ids pattern). No duplicate ids. HTML well-formed (qa_check) | PENDING |
| VCR2 | SCSS changes | Read the diff | Uses the existing tokens/mixins. No hard-coded colours that fail contrast. No new `!important` | PENDING |
| VCR3 | JS changes | Read the diff | Generic per-model code (no 12 copies). Guards for missing elements. Event delegation where sensible | PENDING |
| VCR4 | MODELS.md | Read | Accurate (VD1). States the source of each figure and any judgement calls | PENDING |

### V9. Phase 2 execution steps
1. `git status` / `git diff --stat` vs Frontend Dev's list.
2. Build `models_ref.json` from V0 (and MODELS.md once written), then run a `models_check.py` that parses homes.html, index.html, builders.html, JSON-LD and the dropdowns (V1, V2, VS2).
3. Asset scripts: orphans, sizes, PIL dims, `img_dims.py`, a perceptual match against Downloads (read-only), pdftotext and metadata on the copied PDFs (V3, VX3-4).
4. Adapt `run.js` / `regress.js` / `consent_check.js` / `booking_check.js` to 12 models. Add the weight and CLS scenario (V6) and the switcher/lightbox keyboard checks (VR4-5).
5. `qa_check.py`, `node --check`, sass compile + `cmp`.
6. Fix bugs with minimal edits, record them below, and re-run every suite on the final tree.

### V10. Addendum after MODELS.md (structure decided by Senior Web Developer)

MODELS.md §1 is the data oracle. It agrees with V0 on every figure. Decisions: Boone shows "1 Bed + Den or 2 Bed"; **Madonna superseded by the owner decision below**; room dimensions dropped; Burrito not labelled rental. Structure: `homes.html` becomes an overview with a collection filter and 12 cards (`id="<slug>"`, so the old `#tucker`, `#woodrow`, `#boone` and `#fatboy` links still work), plus 12 pages `homes/the-<slug>.html`. Assets: `.webp` renders and plans, `<slug>-ext-a.jpg` for og:image, and `<slug>-card.webp`, so the expected total is 92 + 12 cards + 12 og jpgs. Budgets in MODELS.md §3: renders ≤ 300 KB, cards ≤ 80 KB, plans ≤ 350 KB, brochures ≤ 3 MB. V1-V8 apply to the overview **and** all 12 model pages; the counts in VC2-VC5 are summed across the model pages.

| ID | Test | Method | Expected | Phase 2 |
|---|---|---|---|---|
| VN1 | Stale values from MODELS.md §5 are gone | grep every HTML / JS / XML file for `1,660`, `669,000`, `2,800`, `1,350`, `1,450` (outside the Madonna), `799,000`, `699,000` (outside the Madonna), `Sunshine`, `Stainless appliance`, `Four designs`, `all four`, room-dimension lists, "largest plan" outside the Metallica | 0 hits | PENDING |
| VN2 | Overview filter | Click All / Bungalows / Two-storey; keyboard; **JS off** | `aria-pressed` correct and sections toggle `hidden`. With JS off, both sections (12 cards) show and the filter buttons are hidden. Old `homes.html#<slug>` anchors scroll to the card | PENDING |
| VN3 | Subfolder paths | Load every `homes/the-*.html` over HTTP and record every request | 0 404s. CSS, JS, fonts, images, brochures, nav, footer, `../index.html#book`, breadcrumb and "More homes" cards all resolve. `aria-current="page"` on Homes | PENDING |
| VN4 | Consent on the model pages | consent_check on 2+ model pages (bungalow + two-storey) | Same as VR1. The Pixel snippet is identical to the other pages | PENDING |
| VN5 | Booking optgroups + mailto | Read the `#bkInterest` DOM and submit with a model chosen from each optgroup | "The showhomes" first, then optgroup "Valmont bungalows" (7, table order), "Valmont two-storey" (5), then lots and general tour. The mailto body carries the chosen model. Reset goes back to index 0 | PENDING |
| VN6 | Lightbox "Zoom in" toggle | Keyboard: open the lightbox from a plan, Tab to Zoom, Enter/Space, Esc | Has a name and `aria-pressed` (or a label change). It zooms and scrolls/pans at 375 and 1440 px. Focus stays trapped. Esc closes and returns focus. Zoom resets on the next open. No horizontal page scroll | PENDING |
| VN7 | Per-page SEO | qa_check + JSON parse on all 13 pages | Unique title / description / canonical / og:url (`https://diamondridgeliving.ca/homes/the-<slug>.html`). Absolute og:image ext-a jpg with real width and height. Product+SingleFamilyResidence numbers equal §1 (floorSize, bedrooms, full + partial baths, price, CAD, `valueAddedTaxIncluded`). Breadcrumb. homes.html ItemList has 12 entries with model-page URLs. priceRange `$150,000–$1,049,000` on index and contact | PENDING |
| VN8 | Sitemap +12 | Parse sitemap.xml | Previous 8 URLs + 12 model pages = 20. Every URL returns 200 locally. `lastmod` bumped on changed pages | PENDING |
| VN9 | 12 pages consistent | If generated, re-run `tools/build_models.py` and diff (idempotent); else diff the shared head, header and footer blocks | Identical shared blocks; only model data differs | PENDING |
| VN10 | Deploy exclusions | Read `.vercelignore` | `*.md`, `tools/`, `.vscode/`, `localize_assets.py` excluded; nothing the site references is excluded | PENDING |
| VN11 | Brochures | Size + `pdftotext` diff against the source + pypdf metadata | 12 PDFs at 0.87-1.61 MB each, text identical, no local paths. Owner decision: brochures stay compressed, so the ≤ 3 MB budget stands | PENDING |
| VN12 | **Madonna (owner decision, 2026-10-25)** | models_check + read the overview card, the model page, JSON-LD, index/builders mentions, booking | Standard layout is **2 Bed, 1,480 sq ft**: eyebrow, quick stats (beds "2 Bed", sq ft "1,480"), card `m-spec`, `<title>` / description if they quote sq ft, and JSON-LD `floorSize` 1480 + `numberOfBedrooms` 2. **1 Bed + Den, 1,450 sq ft is the alternate plan**, captioned as such; the 2 Bed plan is the default (first, `aria-pressed="true"`) in the plan switch and in the stage on load. No "1 Bed + Den or 2 Bed" wording and no "two-bedroom configuration is an add-on" wording for the Madonna anywhere (features list included). 1,450 appears only on the alternate plan caption/alt. **Exception, not a failure:** `madonna-brochure.pdf` is Valmont's own document and still shows 1,450 with the den as standard (flagged for the owner in MODELS.md §6). Boone unchanged ("1 Bed + Den or 2 Bed", 1,800) | PENDING |


### Phase 2 results (model update, 2026-10-25)

Frontend Dev reported "frontend complete" and QA ran the plan against that working tree. Nothing is committed. This section supersedes the "PENDING" Phase 2 column in tables V1-V10.

#### What changed (verified with `git status`)
This matches Frontend Dev's list and Senior Web Developer's files exactly.
- **Modified:** homes.html, index.html, builders.html, contact.html, sitemap.xml, js.js, css/styles.scss, css/styles.css.
- **Replaced:** the 4 old brochures and the 4 `*-ext-a.jpg` og images.
- **Deleted:** 22 old jpgs.
- **New:** 12 `homes/the-<slug>.html`, `tools/build_models.py` + `tools/models.json`, 92 `.webp` (59 renders, 21 plans, 12 cards), 8 new og jpgs, 8 new brochures, `.vercelignore`, MODELS.md.
- `assets/models` now holds 116 files: 92 webp, 12 jpg and 12 pdf.

#### How it was verified
- **`models_check.py`** (QA scratch, independent of `tools/models.json`). It parses the rendered HTML of all 21 pages and compares it with `models_ref.json`, QA's own extraction from the 12 spec-sheet PDFs (with the owner's Madonna decision).
  - **Per model page:** title, description, canonical and og:url; h1 and eyebrow; quick stats (price, sq ft, beds, baths); exterior/interior/plan counts and plan order; default plan; floor and variant captions; that every switch points at its own model.
  - **JSON-LD:** Product numbers, offer, VAT flag, url and image.
  - **Brochure:** link and size label, the "Named for" line (donkey only on the Taco), and aria-current.
  - **Overview:** 12 cards (id, href, sq ft, price, baths, order) and the ItemList.
  - **index.html:** featured cards and the exact booking option list.
  - **sitemap.xml:** 20 URLs, all resolving to files.
  - **Every page:** every src/href/srcset/data-src/og:image/JSON-LD URL resolves; declared img width/height and switch data-w/h equal the real file dimensions; og:image width/height are real.
  - **assets/models:** no orphans; filenames are slugs; size budgets.
  - **Result:** **2,541 checks, 0 real failures.** One flag is not a defect: madonna-card.webp is 80,194 B, inside 80 KiB.
- **`imgmatch.py` / `planmatch.py`** (read-only on Downloads). Every site image is matched against all 80 non-Archive source images.
  - All 59 renders, 12 og jpgs and 12 cards match their own model's source; renders at distance 0, and Boone A matches after rotation.
  - All 21 plans match the correct variant after whitespace trim: right variant 1-24, wrong variant 532-7368.
  - No Boone/Woodrow, Taco-option or plan-variant swaps. 100 % crops of two plans (Madonna 2 Bed, Metallica upper) are sharp and readable.
- **Brochures:** `pdftotext -layout` of each copy is byte-identical to the source spec sheet's text. Sizes are 0.87-1.61 MB. pypdf metadata and XMP contain no user name, local path or "archive".
- **`python -I tools/build_models.py`** re-run: the output is byte-identical to the tree (idempotent).
- **`npx sass@1.79.4`:** compiles cleanly, and the output is byte-identical to css/styles.css. `node --check js.js booking.js` passes. vercel.json and tools/models.json parse.
- **`qa_check.py`** on the root and homes/: 0 structure errors, 0 duplicate IDs, 0 missing files. One h1 per page, no skipped headings. Expected noise only: `index.html#book` is opened by JS, and 404 has no canonical/OG (noindex).
- **Browser:** headless Chrome via puppeteer-core 23.11.1 + axe-core 4.10.2, served by `python -m http.server 8799` from the repo.
  - **`qa_run.js`:** Frontend Dev's `run.js` copied with BASE from the environment, and its stale Netlify-POST assertion replaced by a mailto capture via CDP `Page.frameRequestedNavigation`.
  - **`qa_models.js`:** new, written by QA to cover what run.js samples only partially.
  - **Final tree: `qa_run.js` 346/346, `qa_models.js` 172/174.** The 2 misses are QA's stricter 0.02 CLS target; see VP4.
- **`qa_run.js` covers:**
  - Layout on 21 pages × 7 widths (320-1440).
  - Console and network on 21 pages × 2 widths.
  - axe WCAG 2.1 AA on all 21 pages.
  - CLS @390.
  - Nav, booking dialog and video.
  - Filter, and the legacy anchors #tucker/#woodrow/#boone/#fatboy.
  - Deep switcher, lightbox, zoom and consent checks on 4 models.
  - No-JS on 4 pages.
- **`qa_models.js` covers:**
  - All 12 models: every view and plan switch (70 buttons) by keyboard, alternating Enter and Space. Checks src, lightbox href, alt, caption, declared size, aria-pressed and kept focus.
  - Stage and plan lightbox on every model by keyboard: opens, focus on Close, 6 Tab + 3 Shift+Tab stay inside.
    - On plans, Zoom toggles with Enter and Space: aria-pressed and label change, native size, the pane joins the Tab cycle only while zoomed, and Arrow/PageDown scroll it.
    - Esc closes, resets the zoom and returns focus. Reopening starts un-zoomed.
  - Zoomed lightbox at 375 px.
  - `homes.html#<slug>` for all 12. Filter, then a deep link into the hidden section.
  - No-JS on homes.html and all 12 model pages.
  - Page weight at load and fully scrolled, with CLS and LCP, on the 13 homes pages at 390 and 1440.
  - Consent accept/decline on model pages.
  - Booking mailto for one model per optgroup.
  - The video toggle versus the cookie banner on 3 pages × 4 widths.
- **`axe_states.js`:** axe on homes.html with the Bungalows filter on, and on a model page with the lightbox open and zoomed, at 375 and 1280.
- **CLS sweeps (`cls_sweep.js`):** cold loads (fresh browser context, banner shown) of all 12 model pages:
  - 320-1440 px in 32 px steps (432 loads);
  - 320-640 px in 16 px steps;
  - other pages 320-640 px.
  - **`cls_warm.js`:** the same pages reached from homes.html, with fonts cached.

#### Results per item

| ID | Result | Notes |
|---|---|---|
| VD1 MODELS.md vs spec sheets | PASS | §1 equals QA's V0 on every figure. Madonna updated to the owner decision |
| VD2 quick stats | PASS | price, sq ft, beds and baths correct on all 12 pages (models_check) |
| VD3 plan variants | PASS | plan order and default correct. Two-storey captions carry the per-floor sq ft. Madonna: 2 Bed 1,480 default, "1 Bed + Den — 1,450 sq ft (alternate plan)" |
| VD4 standard vs optional | PASS | read on 6 models against spec page 3 (Fatboy, Tucker, Duke, Snowball, Metallica, Burrito). Every vaulted ceiling, five-piece ensuite upgrade, patio and legal suite is Optional |
| VD5 price wording | PASS | "Starting price · incl. GST" / "From $X incl. GST". No $669,000 / $799,000 |
| VD6 same data everywhere | PASS | model pages, overview cards, index cards, JSON-LD, titles and descriptions agree |
| VD7 images match their model | PASS | perceptual match: 0 swaps across 104 images. Boone ext-a rotated upright correctly |
| VD8 PDF spot-check | PASS | all 12 PDFs text-extracted (stronger than 4 visual checks). Copies are text-identical to the sources |
| VC1 12 models | PASS | 12 cards with unique ids. Order: price ascending per collection |
| VC2-VC5 counts | PASS | 28 exteriors, 31 interiors, 21 plans, 12 brochures |
| VC6 stale copy | PASS | 0 hits. "Sunshine Village" (discover.html) is a ski hill, not the old basement wording |
| VC7 dropdowns | PASS | the exact `#bkInterest` list and optgroups. Mailto verified for Burrito, Madonna, Woodrow, Duke and Snowball. Reset → index 0. register.html left generic (MODELS.md §4) |
| VC8 other pages | PASS | index (4 featured, "Twelve designs") and builders (twelve, 2,170-2,990) |
| VC9 Burrito / Taco wording | PASS | no "rental". Taco's "Named for" line says donkey. The intro says eleven horses and one donkey |
| VN12 Madonna decision | PASS | 2 Bed / 1,480 in title, description, eyebrow, quick stats, card and JSON-LD (1480, 2). No "or 2 Bed" or add-on wording. 1,450 only on the alternate plan and its option line. The brochure still shows 1,450, which is expected |
| VA1 references resolve | PASS | 0 missing on 21 pages, including srcset, data-src, og:image and JSON-LD URLs |
| VA2 orphans | PASS | 0 orphans out of 116 files |
| VA3 render weight | PASS | all ≤ 300 KB (largest 296,973 B, max-ext-a.jpg). Cards ≤ 80 KiB (madonna-card 80,194 B) |
| VA4 plans legible | PASS | 2000 px long edge, 47-84 KB webp. 100 % crops are sharp. Lightbox Zoom shows native size |
| VA5 brochure weight | PASS | 0.87-1.61 MB. Text identical. The size labels use 1024-based MB (e.g. 1.30 MB file → "1.2 MB"), the same convention as browsers' download UI |
| VA6 width/height | PASS | every img and every switch's data-w/h equals the real pixels. og:image dims are real |
| VA7 lazy loading | PASS | the stage is eager + fetchpriority=high; everything else lazy. Switch targets load only on click |
| VA8 alt text | PASS | e.g. "The Madonna rendering — Elevation A", "The Madonna floor plan — 2 Bed — 1,480 sq ft". Updates on switch |
| VA9 filenames | PASS | lowercase slugs only |
| VS1 titles / descriptions | PASS | unique on 21 pages. Model titles 46-55 chars, descriptions ≤ 160. index.html title is 64 chars, unchanged from last round |
| VS2 / VN7 JSON-LD | PASS | parses on every page. Product+SingleFamilyResidence numbers equal §1 (floorSize FTK, bedrooms, full + partial baths, price, CAD, valueAddedTaxIncluded). ItemList has 12 entries in order. priceRange is $150,000–$1,049,000 on index and contact |
| VS3 / VN8 sitemap | PASS | valid XML, 20 URLs, all resolve. lastmod 2026-10-25 on the changed pages |
| VS4 canonical / OG | PASS | absolute diamondridgeliving.ca URLs. og:image is an absolute jpg with real dims |
| VS5 headings | PASS | one h1 per page (the model name on model pages), no skips |
| VX1 sinks | PASS | switcher and filter use textContent / properties. The two `innerHTML` uses in js.js (lightbox, cookie banner) are constant strings |
| VX2 new-tab links | PASS | all carry `noopener noreferrer` |
| VX3 sensitive data | PASS | no local paths or user names in filenames, HTML, JSON-LD or PDF metadata/XMP. Only "tools/build_models.py" appears in two HTML comments (harmless) |
| VX4 brochure contacts | PASS | only Valmont's public phone/email, as in the source |
| VX5 / VN10 vercel.json, .vercelignore | PASS | vercel.json parses. `.vercelignore` excludes *.md, tools/, .vscode/, localize_assets.py; nothing the site loads is excluded |
| VP1 initial weight | PASS | homes.html 0.39 MB @390 / 0.76 MB @1440. Model pages 0.42-0.55 MB |
| VP2 fully scrolled | PASS | homes.html 0.95 / 1.12 MB (the old 4-model page was 4.04 MB). Model pages 0.69-0.82 MB |
| VP3 switcher loading | PASS | each click loads one image, 0 failed requests |
| VP4 CLS | **FIXED (model-page regression); site-wide issue open** | see bug 1 and open item 1. After the fix: no model page ≥ 0.05 at any width ≥ 512 px. Navigating from homes.html (fonts cached) = 0.000 |
| VP5 LCP | PASS | homes.html: `hero-media`. Model pages: the `<slug>-stage` image (eager, high priority) |
| VR1 / VN4 consent | PASS | no facebook request before Accept on any page. Accept loads fbevents and the next page loads it without the banner. Decline → none on the next page. "Cookie settings" reopens. The Pixel block is byte-identical on all 21 pages |
| VR2 / VN5 booking | PASS | mailto to info@ with every field encoded (HTML in the name stays text, no CR/LF). Optgroups work |
| VR3 mobile nav | PASS | |
| VR4 lightbox keyboard | PASS | on all 12 models, stage and plan |
| VR5 / VN6 switcher + Zoom keyboard | PASS | see the qa_models coverage above. At 375 px zoomed: no page overflow; Close and Zoom are on-screen and clickable |
| VR6 horizontal scroll | PASS | 21 pages × 320/375/414/768/1024/1280/1440 |
| VR7 console | PASS | 0 errors and 0 failed requests, including during all interactions |
| VR8 axe | PASS | 0 violations on 21 pages, plus filter and lightbox/zoom states |
| VR9 SCSS | PASS | compiles cleanly; byte-identical after QA's edit |
| VR10 JS syntax | PASS | |
| VR11 / VN2 no-JS | PASS | homes.html: filter buttons hidden, 2 sections and 12 cards visible. 12 model pages: stage, plan and brochure visible, 0 hidden `.reveal` |
| VN3 subfolder paths | PASS | 0 404s on 12 model pages. Nav and footer `../`. aria-current on Homes |
| VN9 consistency | PASS | build re-run is byte-identical. Shared head/header/footer come from one template |
| Video toggle (Frontend fix) | PASS | index, gallery and discover @375/768/1024/1440: not covered by the cookie banner, and clickable |
| VCR1-4 code review | PASS | the diff matches the list. js.js switcher is generic and guarded. The filter is a progressive enhancement with a hashchange guard. The lightbox focus trap includes the pane only while zoomed. SCSS uses tokens/mixins and adds no `!important` |

#### Bugs found and fixed by QA
1. **`css/styles.scss:1460-1466` (`.model-block--page .model-head`), recompiled into `css/styles.css`: large layout shift on cold landings on model pages.**
   - **Cause:** `.model-head` is a wrapping flex row (title block + "Enquire / Book a showing" buttons). Whether the 2-button row fits beside the title depends on text widths. Fraunces/Inter render 5-9 % wider than the fallback fonts (measured), and the fonts are loaded non-blocking. So on a first visit the row fits beside the title at first paint, then wraps under it when the web fonts swap in. That pushes the above-the-fold stage image down about 68 px.
   - **Measured CLS 0.32-0.42 on a cold load** at every model page at some width: Metallica 1216-1440, Fatboy 1024-1088, Taco/Max/Duke 896, Tucker/Boone/Winchester 960.
   - **Fix:** on model pages the buttons always sit under the title (`flex-direction: column; align-items: flex-start`). This is the layout the browser already settled on after the font loaded, so nothing changes visually.
   - **Verified:** 432-load sweep (12 pages × 320-1440 / 32 px). Nothing ≥ 0.05 at ≥ 512 px. Both suites re-run green. The SCSS recompiles byte-identically.
   - Rejected alternatives, measured: tagline `max-width: 34ch` (13 poor cases left); a flexible title column (15 left).

#### Remaining issues (not fixed, with reasons)
1. **Site-wide font-swap layout shift on a first visit, at narrow phone widths (about 416-496 px).** Present before this update; last round measured CLS only at 390 px.
   - **What moves:** the fixed cookie banner (204 → 227 px tall), a quick-stats label, the two-button rows and the model tagline all re-wrap when Fraunces/Inter replace the fallbacks.
   - **Cold-load CLS:** model pages up to 0.29 @480 and 0.15-0.19 @416-448; register.html 0.25 @480 (untouched by this update); index.html 0.15-0.19 @416-432.
   - **Navigation with fonts cached: 0.000.**
   - **Why not fixed here:** a real fix changes how fonts load across the site (a decision from last round), so it needs Senior Web Developer's call.
   - **QA's measurement of the recommended fix (Windows Chrome):** metric-matched fallback faces cut mean CLS about 10× (model pages 0.033 → 0.004, other pages 0.021 → 0.006) and leave 3 boundary cases ≤ 0.15. Settings tested:
     - `@font-face` "Fraunces Fallback": `local("Palatino Linotype")`, size-adjust 104.8 % upright and 108.4 % italic.
     - "Inter Fallback": `local("Segoe UI")`, 106.9 % at 400 and 105.7 % at 600.
     - The stacks placed directly after the web fonts.
   - **Alternative:** self-host and preload the two woff2 files with `font-display: optional`.
   - **Needs a Mac/iOS check** (Iowan Old Style / Palatino metrics).
2. **QA's 0.02 CLS target missed at 390 px on Taco (0.024) and Max (0.027).** Same root cause as item 1; under the 0.1 "good" threshold.
3. **Owner items (MODELS.md §6, not code):**
   - prices and whether they include the lot ("for the home only" vs "incl. GST");
   - the index "Turnkey homes from $550,000" is below the cheapest Valmont price;
   - Madonna garage "available";
   - the Madonna brochure still shows the den as standard;
   - gallery alt "Horses…" on the Taco photo.

#### Not tested
- **Hosting:** a real Vercel deployment (`.vercelignore`, headers, 404 routing).
- **Other browsers and devices:** Safari, Firefox, real iOS/Android devices. Fallback-font metrics differ by OS, so the CLS figures are Windows Chrome only.
- **Lab and network:** Lighthouse scores, a throttled network.
- **Assistive technology:** real screen readers.
- **Social previews:** how Facebook, LinkedIn and X render the new og:images (only dims and URLs were checked).
- **Search tools:** Google's Rich Results Test for the Product JSON-LD (only structural and number checks were run offline).
