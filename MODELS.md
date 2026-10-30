# Valmont Custom Homes: model data and site spec

Owner: Senior Web Developer · Branch `revamp-homepage` · Written 2026-10-25

**Source of truth:** the 12 spec sheet PDFs in `Downloads\2 - Storey\<model>\Spec Sheet\` and
`Downloads\Bungalow\<model>\Spec Sheet\` (Archive folders ignored). Extracted with pypdf.
Folder names were used only to cross-check. **Nothing here is confirmed by the owner yet**:
see "Needs owner confirmation" at the end.

This file is an internal working doc. It is excluded from the Vercel deploy by `.vercelignore`.

---

## 1. Data table (from the spec sheets)

Prices are "Starting from … incl. GST" on every spec sheet. Each price matches its folder name.

| # | Model | Slug | Collection | Main | Upper | **Total sq ft** | Beds (page 1) | Plan variants | Baths | Garage | Basement | **From (incl. GST)** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | The Burrito | burrito | Bungalow | 1,100 | — | **1,100** | 1 Bed | one plan | 1.5 | 2-car | Unfinished; legal secondary suite is an optional add-on | **$599,000** |
| 2 | The Taco | taco | Bungalow | 1,300 | — | **1,300** | 2 Bed | one plan | 2 | Oversized 2-car (20' x 22') | Unfinished, development optional | **$619,000** |
| 3 | The Max | max | Bungalow | 1,280 | — | **1,280** | 2 Bed | one plan | 2 | Oversized 3-car | Unfinished, development optional | **$639,000** |
| 4 | The Madonna | madonna | Bungalow | 1,480 | — | **1,480** (2 Bed, standard, per owner) · alternate 1 Bed + Den 1,450 | 2 Bed | standard: 2 Bed, 1,480 · alternate: 1 Bed + Den, 1,450 | 2 | 2-car ("2-Car Garage Available") | Unfinished, development optional | **$699,000** |
| 5 | The Tucker | tucker | Bungalow | 1,560 | — | **1,560** | 2 Bed | A: 1 Bed + Den · B: 2 Bed (both 1,560) | 2 | Oversized 3-car, side-attached | Unfinished, development optional | **$709,000** |
| 6 | The Boone | boone | Bungalow | 1,800 | — | **1,800** | 2 Bed | A: 1 Bed + Den · B: 2 Bed (both 1,800) | 2 | Attached 2-car | Unfinished, development optional | **$769,000** |
| 7 | The Woodrow | woodrow | Bungalow | 1,800 | — | **1,800** | 3 Bed | A: 2 Bed · B: 3 Bed (both 1,800) | 2 | Oversized 2-car | Unfinished, development optional | **$769,000** |
| 8 | The Duke | duke | Two-storey | 1,020 | 1,150 | **2,170** | 3 Bed (+ bonus room) | one plan; bonus room can become a 4th bedroom (optional) | 2.5 | Oversized 3-car, attached | Unfinished, development optional | **$819,000** |
| 9 | The Winchester | winchester | Two-storey | 1,150 | 1,250 | **2,400** | 3 Bed + Den (+ bonus room) | one plan; bonus room can become a 4th bedroom (optional) | 2.5 | Oversized 3-car, attached | Unfinished, development optional | **$889,000** |
| 10 | The Fatboy | fatboy | Two-storey | 1,230 | 1,400 | **2,630** | 3 Bed + Bonus | one plan; bonus room "ideal as a 4th bedroom or flex space" | 2.5 | Oversized 3-car | Unfinished, development optional | **$949,000** |
| 11 | The Metallica | metallica | Two-storey | 1,380 | 1,610 | **2,990** | 3 Bed + Den (+ bonus room) | one plan; 3 elevation options | 2.5 | Oversized 3-car, attached, 30' wide | Unfinished, development optional | **$1,019,000** |
| 12 | The Snowball | snowball | Two-storey | 1,700 | 1,250 | **2,950** | 3 Bed + Loft (+ bonus room) | one plan; primary bedroom on the main floor | 3.5 | **Detached** 2-car | Unfinished, development optional | **$1,049,000** |

Collection ranges: bungalows 1,100–1,800 sq ft, $599,000–$769,000 · two-storey 2,170–2,990 sq ft,
$819,000–$1,049,000 · all 12: 1,100–2,990 sq ft, from $599,000.

**Display order on the site:** price ascending inside each collection, which is the table order (bungalows 1–7, then two-storey 8–12).

### How to display the ambiguous fields (decisions)

- **Beds:** show the page-1 headline value in quickstats ("2 Bed", "3 Bed + Den", …). Where the sheet lists plan
  variants, add a quickstat **"Plan options"** with value e.g. "1 Bed + Den · 2 Bed", and offer the variant floor plans as switch buttons.
- **Madonna (OWNER DECISION, 2026-10-25):** the standard layout is **2 Bed, 1,480 sq ft**; **1 Bed + Den (1,450 sq ft) is the
  alternate plan**. Headline sq ft (eyebrow, quickstat, card, JSON-LD `floorSize`) = **1,480**. Beds quickstat **"2 Bed"**, plus
  "Plan options: 2 Bed · 1 Bed + Den". Plan switch: **2 Bed first** ("2 Bed — 1,480 sq ft"), then "1 Bed + Den — 1,450 sq ft".
  JSON-LD `numberOfBedrooms`: 2. Do not show "1,450" as the Madonna's headline anywhere.
  This overrides spec sheet page 1 (1,450 sq ft) and page 3 (den standard, 2 bed as an add-on); the brochure PDF still says that.
- **Boone (still open):** page 1 says "2 Bed"; page 3 calls the den standard and 2 bedrooms "available". Show
  "1 Bed + Den or 2 Bed". JSON-LD `numberOfBedrooms`: 2 (page 1).
- **Basement:** quickstat value **"Unfinished"**, label **"Basement · development optional"**. Do not use the word "Sunshine".
- **Baths in JSON-LD:** `numberOfFullBathrooms` + `numberOfPartialBathrooms` (2.5 = 2 + 1, 1.5 = 1 + 1, 3.5 = 3 + 1, 2 = 2 + 0).
- **Price wording:** "From $819,000" with label "Starting price · incl. GST". Format with a comma, no "K"/"M".
- **Room dimensions: DROP them.** The spec sheets have none (only Taco's 20' x 22' garage). The old
  Tucker/Woodrow/Boone/Fatboy lists don't match the current plans (e.g. Tucker family room was "14'-0" × 16'-10"",
  the plan now says 14'-0" x 11'-0"). The plan images carry every dimension, and the lightbox makes them readable.

---

## 2. Per-model notes (features exactly as the spec sheets state them)

"Std" = standard feature in the spec; "Opt" = the spec says optional, available, or an add-on.
Use these lists verbatim (shortened wording is fine) as the **Standard features** panel. Nothing else.

Every model also has the "name story" (page 1): *"Every model at Valmont Custom Homes carries the name of a horse raised right
here in Diamond Valley, on the ranch of our community's developer, Don Beaton."* **Exception: The Taco is named for
Don's donkey**, not a horse ("The Taco is the exception to the rule — not one of Don's horses, but his donkey, and every bit
as beloved on the ranch."). So the homes.html intro must not say "every model is named after a horse". Use e.g.
"each named for an animal raised on the developer's ranch" (or "a horse… and one donkey").

Taglines (`.m-tag`) are written from spec facts. Use them as-is or improve them, but don't invent features.

### Bungalows

**The Burrito**: 1,100 sq ft · 1 Bed · 1.5 Bath · 2-car · $599,000
Tagline: *Compact single-level living, with legal-suite potential below.*
Std: Hardie board & stucco exterior; triple-glazed windows; 9' main floor ceilings; electric fireplace in family room; quartz
countertops; soft-close cabinetry; walk-in pantry; primary ensuite & walk-in closet; unfinished basement; 2-car garage.
Opt: rear patio (pre-planned off the family room); legal secondary suite in the basement (add-on, not in base price).
Folder says "Rental", but the spec sheet never uses that word. **Do not label it "Rental" on the site**; describe the optional legal suite instead.

**The Taco**: 1,300 sq ft · 2 Bed · 2 Bath · oversized 2-car (20' x 22') · $619,000
Tagline: *Single-level living with room to make it your own.*
Std: 9' main floor ceilings; material & colour flexibility (curated exterior/interior finishes); family room fireplace; quartz kitchen
island & countertops; soft-close cabinetry; five-piece primary ensuite (soaker tub, glass shower, dual vanity); oversized windows;
mudroom off garage; unfinished basement; oversized 2-car garage 20' x 22'; Hardie board, stucco & triple-glazed windows.
Opt: add-on packages (upgraded flooring, built-ins). Named for Don's **donkey**.

**The Max**: 1,280 sq ft · 2 Bed · 2 Bath · oversized 3-car · $639,000
Tagline: *Single-level living with an oversized triple garage.*
Std: Hardie board & stucco; triple-glazed windows; 9' ceilings; quartz countertops; soft-close cabinetry; **four-piece** primary ensuite
(glass shower, dual vanity); oversized windows; unfinished basement; oversized 3-car garage.
Opt: vaulted great room; rear patio (pre-planned off the great room).

**The Madonna**: 1,480 sq ft · 2 Bed (standard, owner decision) · alternate plan 1 Bed + Den, 1,450 sq ft · 2 Bath · 2-car · $699,000
Tagline: *Two bedrooms, a walk-in pantry, and an electric fireplace.*
Std: two-bedroom layout (owner decision); 9' ceilings; electric fireplace in family room; quartz kitchen island & countertops; soft-close cabinetry;
walk-in pantry; five-piece primary ensuite; dedicated laundry room off the mudroom; unfinished basement; Hardie board, stucco &
triple-glazed windows; 2-car garage (spec wording: "2-Car Garage Available"; still unconfirmed whether standard).
Alternate / Opt: 1 Bed + Den plan with a main floor office/den (1,450 sq ft); rear patio (pre-planned off the dining area).
Do **not** list "main floor office/den" or "two-bedroom configuration (add-on)" as in the spec's page 3; the owner reversed them.

**The Tucker**: 1,560 sq ft · 2 Bed (variants 1 Bed + Den / 2 Bed) · 2 Bath · oversized 3-car side-attached · $709,000
Tagline: *Single-level living with an oversized, side-attached triple garage.*
Std: Hardie board & stucco; triple-glazed windows; 9' ceilings; quartz countertops; soft-close cabinetry; five-piece primary ensuite;
oversized windows; unfinished basement; oversized 3-car side-attached garage.
Opt: **vaulted great room** (the old site said Standard, which is wrong).

**The Boone**: 1,800 sq ft · 2 Bed (variants 1 Bed + Den / 2 Bed) · 2 Bath · attached 2-car · $769,000
Tagline: *A generous main-floor den, or a second bedroom if you need it.*
Std: Hardie board & stucco; triple-glazed windows; 9' ceilings; quartz countertops; soft-close cabinetry; five-piece primary ensuite;
oversized windows; main floor laundry & mudroom with built-in storage; flexible main floor den; unfinished basement; attached 2-car garage.
Opt: vaulted family room; two-bedroom configuration.
(Old site said 1 + Den, 1.5 bath, **3-car**. Wrong on baths and garage.)

**The Woodrow**: 1,800 sq ft · 3 Bed (variants 2 Bed / 3 Bed) · 2 Bath · oversized 2-car · $769,000
Tagline: *Two or three bedrooms, all on one floor.*
Std: Hardie board & stucco; triple-glazed windows; 9' ceilings; quartz countertops; soft-close cabinetry; five-piece primary ensuite;
oversized windows; unfinished basement; oversized 2-car garage.
Opt: vaulted family room; rear patio (pre-planned off the family room).

### Two-storey

**The Duke**: 1,020 main + 1,150 upper = 2,170 sq ft · 3 Bed · 2.5 Bath · oversized 3-car attached · $819,000
Tagline: *Three bedrooms up, a bonus room, and upper-floor laundry.*
Std: Hardie board & stucco; triple-glazed windows; 9' main ceilings; fireplace in family room; walk-in pantry; quartz countertops & island;
soft-close cabinetry; primary ensuite with tub and vanity; walk-in closet; upper-floor laundry; bonus room; mud room with bench;
oversized 3-car garage; unfinished basement.
Opt: five-piece walk-through ensuite; converting the bonus room to a 4th bedroom; rear patio off the dining room.

**The Winchester**: 1,150 + 1,250 = 2,400 sq ft · 3 Bed + Den · 2.5 Bath · oversized 3-car attached · $889,000
Tagline: *A main-floor den, three bedrooms up, and a bonus room.*
Std: Hardie board & stucco; triple-glazed windows; 9' main ceilings; fireplace in family room; main floor den; walk-in pantry; quartz
countertops & island; soft-close cabinetry; five-piece primary ensuite (soaker tub, glass shower, dual vanities); walk-in closet;
upper-floor laundry; bonus room; mud room with built-ins; oversized 3-car garage; unfinished basement.
Opt: converting the bonus room to a 4th bedroom; rear patio off the dining room.

**The Fatboy**: 1,230 + 1,400 = 2,630 sq ft · 3 Bed + Bonus · 2.5 Bath · oversized 3-car · $949,000
Tagline: *Butler's pantry, an upper-floor bonus room, and an oversized triple garage.*
Std: Hardie board & stucco; triple-glazed windows; 9' main ceilings; butler's pantry & walk-in pantry; quartz countertops; soft-close
cabinetry; upper-floor bonus room (4th bedroom or flex); unfinished basement; oversized 3-car garage; primary ensuite (standard layout).
Opt: **vaulted great room with clerestory windows**; **vaulted primary bedroom ceiling**; five-piece ensuite layout as drawn on the
upper plan (freestanding soaker tub, glass shower, dual vanity, private WC) is an **upgrade**.
(Old site: 2,800 sq ft, 1,350/1,450, $799,000, both vaulted ceilings "Standard", "Den" in dimensions. All wrong per the spec.
The page-1 tagline "The largest plan" is no longer true: Metallica is larger.)

**The Metallica**: 1,380 + 1,610 = 2,990 sq ft · 3 Bed + Den · 2.5 Bath · oversized 3-car attached, 30' wide · $1,019,000
Tagline: *The largest plan in the collection: main-floor den, bonus room, and a 30-foot triple garage.*
Std: Hardie board & stucco; triple-glazed windows; 9' main ceilings; electric fireplace in great room; main floor den/office; walk-in pantry;
quartz countertops & island; soft-close cabinetry; five-piece primary ensuite (soaker tub, glass shower, dual vanities); wardrobe &
walk-in closet; upper-floor laundry with built-in storage; bonus room; mudroom with bench; oversized 3-car garage (30' wide); unfinished basement.
Opt: rear patio off the dining room. Three elevation options.

**The Snowball**: 1,700 + 1,250 = 2,950 sq ft · 3 Bed + Loft · 3.5 Bath · **detached** 2-car · $1,049,000
Tagline: *A main-floor primary suite, a loft, and a front veranda.*
Std: Hardie board & stucco; triple-glazed windows; 9' main ceilings; main floor primary bedroom with ensuite & walk-in closet; fireplace in
family room; quartz countertops & island; soft-close cabinetry; front veranda; mud room with built-ins; upper-floor laundry with sink;
loft and bonus room; ensuite off bedroom 2; detached 2-car garage; unfinished basement.
Opt: main floor office off the mud room; rear patio off the kitchen.

---

## 3. Assets (convention `assets/models/<slug>-<view>.<ext>`)

Agreed with Frontend Dev: renders and plans as **.webp**, plus `<slug>-ext-a.jpg` (og:image only) and `<slug>-card.webp`
(about 800px, 4:3 crop of ext-a, for card grids). Brochures `<slug>-brochure.pdf` were **produced by Senior Web Dev**: compressed
copies of the spec sheets (images re-encoded at 1800px max, q72; text verified identical to the source; 0.87–1.61 MB each,
down from 10.7–21.8 MB).

| Slug | Exteriors | Interiors (view → caption) | Plans (view → caption) |
|---|---|---|---|
| burrito | ext-a | kitchen → Kitchen · family → Family Room | plan-main → Main floor — 1,100 sq ft |
| taco | ext-a, ext-b, ext-c | kitchen · dining · family | plan-main → Main floor — 1,300 sq ft |
| max | ext-a, ext-b, ext-c | kitchen | plan-main → Main floor (2 Bed) — 1,280 sq ft |
| madonna | ext-a, ext-b, ext-c | kitchen · dining | **plan-2bed → 2 Bed — 1,480 sq ft (first, standard)** · plan-1bed-den → 1 Bed + Den — 1,450 sq ft |
| tucker | ext-a, ext-b, ext-c | kitchen · dining · family | plan-1bed-den → 1 Bed + Den — 1,560 sq ft · plan-2bed → 2 Bed — 1,560 sq ft |
| boone | ext-a (source PNG was rotated 90°; Frontend Dev rotated it upright, now landscape), ext-b, ext-c | kitchen · family → Family Room | plan-1bed-den → 1 Bed + Den — 1,800 sq ft · plan-2bed → 2 Bed — 1,800 sq ft |
| woodrow | ext-a, ext-b, ext-c | kitchen · dining · family | plan-2bed → 2 Bed — 1,800 sq ft · plan-3bed → 3 Bed — 1,800 sq ft |
| duke | ext-a | kitchen · dining → **Kitchen & Dining** · family | plan-main → Main floor — 1,020 sq ft · plan-upper → Upper floor — 1,150 sq ft |
| winchester | ext-a, ext-b | kitchen → Kitchen & Dining · family · ensuite → Ensuite · ensuite-2 → Ensuite Vanity | plan-main → 1,150 · plan-upper → 1,250 |
| fatboy | ext-a, ext-b | kitchen · greatroom → Great Room | plan-main → 1,230 · plan-upper → 1,400 |
| metallica | ext-a, ext-b, ext-c | kitchen · dining → Kitchen & Dining · family → **Great Room** (spec name) | plan-main → 1,380 · plan-upper → 1,610 |
| snowball | ext-a | kitchen · dining · living → Living Room | plan-main → 1,700 · plan-upper → 1,250 |

Exterior captions: "Elevation A/B/C". Plan-variant order: Option A first, as the spec sheet orders them (Boone/Tucker:
1 Bed + Den then 2 Bed; Woodrow: 2 Bed then 3 Bed), so the order matches the brochure. **Exception: Madonna puts 2 Bed first**
(owner decision: it is the standard plan).
Expected counts (QA): 28 exteriors, 31 interiors, 21 plans, 12 PDFs, + 12 cards + 12 og jpgs.

Delete the old `boone-plan-main.jpg`, `tucker-plan-main.jpg` and `woodrow-plan-main.jpg`, and every old `.jpg` render superseded by `.webp`
(keep only `<slug>-ext-a.jpg`). Budgets: renders ≤ 300 KB, cards ≤ 80 KB, plans ≤ 350 KB, brochures ≤ 3 MB.

---

## 4. Information architecture (decision)

**Decision: an overview page plus 12 per-model pages.**

- `homes.html`: the overview. Hero (kicker "Valmont Custom Homes · Twelve designs") → intro (fix the "horse" claim, see §2) →
  **collection filter** → two card sections, *Bungalows (7)* and *Two-storey homes (5)*, each a `.model-grid` of `a.model` cards
  (card image `<slug>-card.webp`, name, `m-spec` "Bungalow · 1,560 sq ft · 2 Bed · 2 Bath", and "From $709,000"). Then the
  square footage & pricing note → CTA.
  - Filter: a `.switch-row` of buttons *All · Bungalows · Two-storey* using `aria-pressed` and the existing `.switch` styling.
    It toggles `hidden` on the two sections. **Progressive enhancement:** without JS both sections show and the buttons are hidden
    (render them `hidden` and unhide them from JS).
  - Every card keeps **`id="<slug>"`**, so old deep links (`homes.html#tucker`, `#woodrow`, `#boone`, `#fatboy`, used on the live
    site and possibly in ads or social posts) still land on that model's card.
- `homes/the-<slug>.html` × 12 (e.g. `homes/the-duke.html`): one page per model, reusing the existing model-block markup and styles:
  breadcrumb *Home › Homes › The Duke*; `model-head` (eyebrow "Two-storey · 2,170 sq ft", h1 name, tagline, Enquire button →
  `../register.html`); `quickstats`; `showcase` with view switches; floor plans with a plan switch (main/upper, or variants);
  **Standard features** panel (Std/Opt from §2, with the `.sv` value "Standard" or "Optional"); "Named for…" line; brochure download;
  a "More homes in the collection" strip (3–4 `a.model` cards, same collection first) for internal linking; the shared footer.
  - The page's h1 is the model name (the overview hero keeps h1 "The Homes").
  - **Relative paths in the subfolder:** `../css/styles.css`, `../js.js`, `../assets/...`, `../index.html#book`, nav links `../homes.html`
    with `aria-current="page"` on Homes. The Meta Pixel snippet and consent gating must be identical to the other pages.
  - Canonical, og:url: `https://diamondridgeliving.ca/homes/the-duke.html`. og:image: the absolute URL of `<slug>-ext-a.jpg`
    with real width/height.
- Why per-model pages: 12 full model blocks on one page would be a very long page (QA already measured 4 MB on the 4-model page),
  and every model gets its own title, description, canonical and Product schema, so it can rank for searches like "The Duke Valmont Diamond Valley".
  Cost: 12 more files with duplicated head and footer, plus 12 sitemap entries. To keep the 12 pages from drifting, **generate them**:
  `tools/build_models.py` (Python stdlib only, run with `python -I`) reads `tools/models.json` (the data in §1–3) and writes
  `homes/*.html`. Hand-authoring is acceptable if you prefer, but then QA must diff the 12 pages' shared blocks.
  `tools/` is excluded from the deploy by `.vercelignore`.
- **Move the inline switcher script** out of homes.html into `js.js` (it is already guarded by `querySelectorAll`), and add the filter
  logic there too. One copy then serves all 13 pages. Keep `textContent` (not innerHTML) for captions.

### JSON-LD

- `homes.html`: `ItemList` of 12 `ListItem`s (`position`, `url` = the model page, `name`) + `BreadcrumbList`. Product details
  live on the model pages, not here (avoids duplicate Product entities).
- Each model page: `@graph` with `["Product","SingleFamilyResidence"]` (name "The Duke by Valmont Custom Homes", url, image
  [absolute ext-a jpg], description = tagline, brand Organization Valmont Custom Homes, `floorSize` {value, unitCode FTK},
  `numberOfBedrooms` (page-1 number), `numberOfFullBathrooms`, `numberOfPartialBathrooms`, `offers` Offer {price, priceCurrency CAD,
  url, availability InStock is NOT known, so omit it; `priceSpecification` {@type PriceSpecification, price, priceCurrency CAD,
  valueAddedTaxIncluded true}, description "Starting price, incl. GST"}) + `BreadcrumbList` (Home › Homes › model).
- `index.html` and `contact.html` RealEstateAgent `priceRange`: `"$150,000–$799,000"` → **`"$150,000–$1,049,000"`**.
- All JSON-LD must parse (`python -I -c "import json"…`), and the numbers must equal §1.

### Every other place that must change

| File | Element | Change |
|---|---|---|
| homes.html | `<title>`, meta description, og/twitter title & description, og:image | "The Homes — Twelve Valmont Designs \| Diamond Ridge"; the description names the range (7 bungalows, 5 two-storey, 1,100–2,990 sq ft, from $599,000 incl. GST), ≤ 160 chars |
| homes.html | sq ft & pricing callout | Keep the wording but say prices **include GST**. Keep "for the home only" (prior owner wording), but it is flagged for confirmation |
| index.html | homes teaser (line ~229–268) | Eyebrow "Valmont Custom Homes · Twelve designs"; lede: seven bungalows and five two-storey plans, 1,100 to 2,990 sq ft, named for animals on the developer's ranch. Keep 4 featured cards (Tucker, Woodrow, Boone, Fatboy, the owner's previous picks) with **corrected** `m-spec`, `.webp` card images, and hrefs to `homes/the-<slug>.html`. Button "Explore all twelve homes" |
| index.html | booking `#bkInterest` | Keep "The showhomes" first; then `<optgroup label="Valmont bungalows">` with 7 options and `<optgroup label="Valmont two-storey">` with 5 (option text "The Duke" etc., table order); then lots, then general tour. `booking.js` reads `.value` and resets `selectedIndex = 0`, so optgroups are safe |
| index.html, builders.html | Valmont card portrait `fatboy-ext-a.jpg` | Repoint to `.webp` (or keep the jpg, since it's kept for og). Fix width/height to match the actual file |
| index.html, contact.html | JSON-LD priceRange | as above |
| builders.html | Valmont `.desc` | Remove "two-storey plans with a triple car garage" (Snowball has a detached double) and "full room dimensions". New text: "…a curated Custom Home Collection of twelve designs created for these lots — seven bungalows with the primary suite on the main floor, and five two-storey plans from 2,170 to 2,990 sq ft. … Explore all twelve, from The Burrito to The Metallica, with renderings, floor plans, and downloadable brochures." |
| sitemap.xml | | Add 12 `homes/the-<slug>.html` URLs (priority 0.8, changefreq monthly) and bump `lastmod` on the changed pages |
| register.html | interest select | No model list today. **Leave it unchanged** (generic options cover it) |
| gallery.html | | No Valmont content. **No change.** (Note only: `Tacoandfriends.jpeg` has alt "Horses in Diamond Valley", but Taco is a donkey. Owner may want the alt fixed) |
| 404.html | | No change unless it links to model anchors (check) |
| `.vercelignore` | new | Exclude `*.md`, `tools/`, `.vscode/`, `localize_assets.py` from the deploy (MODELS.md and TEST_PLAN.md contain internal pricing notes) |

---

## 5. Discrepancies (spec sheet vs folder name vs current site)

### Folder name vs spec sheet

| Model | Folder | Spec sheet | Note |
|---|---|---|---|
| Fatboy | 1300 & 1500 (2060) | 1,230 main + 1,400 upper = **2,630** | Folder floors differ by 70 and 100 |
| Metallica | 1350 & 1600 (2150) | 1,380 + 1,610 = **2,990** | Folder floors differ by 30 and 10 |
| Madonna | 1450 (2050) | 1,450 (1 Bed + Den, Option A) / 1,480 (2 Bed, Option B); page 1 headline 1,450 | **Owner decided: 2 Bed 1,480 is standard and is the headline**, so the folder and page 1 (1,450) now show the alternate plan. The brochure PDF still says 1,450, with the den as standard |
| Burrito | "Rental" | 1,100 sq ft; no "rental" wording; legal suite optional | Do not label it rental without confirmation |
| Duke, Snowball, Winchester, Boone, Max, Taco, Tucker, Woodrow | — | Floor figures match | — |
| All 12 | price | matches the spec sheet exactly | — |

**The parenthetical number** is **not** total living area (Duke 1660 vs 2,170). It appears nowhere in the PDFs. Best fit: the
**main-floor building footprint including the attached garage**. Duke: 1,020 + garage 27'6" x 22' (≈605) ≈ 1,625 ≈ 1660. Tucker: 1,560 +
20x20 + 10x20 garages (600) + walls ≈ 2,260. Woodrow/Boone: 1,800 + about a 2-car (440) ≈ 2,230. Taco: 1,300 + 20x22 (440) ≈ 1,770. Max:
1,280 + 3-car ≈ 1,915. Snowball's garage is **detached**, and its number (1800) is only 100 over its 1,700 main floor, which is consistent.
**Exception: Winchester (2150)** would be ≈ 1,755 by this rule (1,150 + 27'6" x 22' garage). 2150 is also Metallica's number, so it may be a
copy-paste error in the folder name. **Unconfirmed; never publish these numbers.**

### Current site vs spec sheet (all to be corrected)

| Model | Field | Site now | Spec sheet |
|---|---|---|---|
| Tucker | sq ft | 1,660 | **1,560** |
| Tucker | price | $669,000 | **$709,000** |
| Tucker | beds / baths | 1 + Den / 1.5 | **2 Bed (or 1 + Den) / 2** |
| Tucker | vaulted great room | Standard | **Optional** |
| Tucker | tagline | "Vaulted great room, single-level living." | the vaulted room is optional; new tagline |
| Tucker | room dimensions | e.g. Family 14'-0" × 16'-10", Primary 12'-6" × 12'-0" | plan shows Family 14'-0" x 11'-0", Primary 11'-6" x 11'-0". Dropping the list |
| Woodrow | price | $699,000 | **$769,000** |
| Woodrow | beds | 2 | **3 Bed (variants 2 / 3)** |
| Boone | price | $699,000 | **$769,000** |
| Boone | beds / baths / garage | 1 + Den / 1.5 / 3-Car | **2 Bed (or 1 + Den) / 2 / attached 2-car** |
| Boone | note | "3 car garage 30'-0" × 22'/21'-0" · optional 1,300 sq ft basement development" | not in spec. Remove |
| Boone | tagline | "The widest kitchen in the collection." | unverifiable across 12 models. Replace |
| Fatboy | sq ft | 2,800 (1,350 + 1,450) | **2,630 (1,230 + 1,400)** |
| Fatboy | price | $799,000 | **$949,000** |
| Fatboy | vaulted great room & primary ceiling | Standard | **Optional add-ons** |
| Fatboy | tagline | "The largest plan, with room to grow." | Metallica (2,990) and Snowball (2,950) are larger. Replace |
| All 4 | "Sunshine basement, unfinished — Standard" | | spec says "Unfinished Basement"; "sunshine" appears nowhere |
| All 4 | "Stainless appliance package — Included" | | **not in any spec sheet. Remove** |
| index | "From single-level bungalows to a 2,800 sq ft two-storey" | | range now 1,100–2,990 |
| index/contact | JSON-LD priceRange max $799,000 | | $1,049,000 |
| builders | "two-storey plans with a triple car garage"; "full room dimensions"; lists only 4 | | Snowball has a detached double; dims dropped; 12 models |
| homes intro | "Every model … carries the name of a horse" | | Taco is a donkey (spec sheet) |

### Inside the spec sheets

- **Madonna** and **Boone**: page 1 headline "2 Bed", but page 3 describes the den as standard and 2 bedrooms as an add-on or available.
  **Madonna resolved by the owner (2 Bed, 1,480 standard).** Boone is still open.
- **Madonna**: "2-Car Garage Available". Is it standard or optional?
- **Tucker** page 4 shows one alternate elevation ("a second elevation option"), but the Renders folder has Options A, B and C.
- **Taco** page 3 labels the alternates "Elevation Option 1" and "Option 3"; the Renders folder has Exterior Render + Option 2 + Option 3.
- **Fatboy** page 1 omits the per-floor line; the floors come from page 2.

---

## 6. Needs owner confirmation

1. **All 12 prices** (spec sheet, incl. GST): Burrito $599,000 · Taco $619,000 · Max $639,000 · Madonna $699,000 · Tucker $709,000 ·
   Boone $769,000 · Woodrow $769,000 · Duke $819,000 · Winchester $889,000 · Fatboy $949,000 · Metallica $1,019,000 · Snowball $1,049,000.
   The four already on the site rise $40,000–$150,000 (Tucker +$40k, Woodrow +$70k, Boone +$70k, Fatboy +$150k).
2. Do the prices include the lot? The site says "for the home only"; the spec sheets say only "incl. GST". The index "Turnkey homes (lot + home)
   from $550,000" is below the cheapest Valmont price ($599,000). That's fine if $550k refers to an Albion home or the Valmont prices exclude the lot.
3. Boone default configuration (den or 2nd bedroom); Madonna garage standard or optional. (*Madonna layout ANSWERED 2026-10-25:
   2 Bed / 1,480 is standard, 1 Bed + Den / 1,450 is the alternate. Optional follow-up: the Madonna brochure PDF still shows 1,450 with
   the den as standard, so the owner may want Valmont to reissue it.*)
7. *(ANSWERED 2026-10-25)* Brochures: the compressed PDFs are approved.
4. Burrito "Rental" positioning.
5. The parenthetical folder numbers (footprint incl. garage?), and Winchester's 2150.
6. Index featured four (kept Tucker, Woodrow, Boone, Fatboy).
