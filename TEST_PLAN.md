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
