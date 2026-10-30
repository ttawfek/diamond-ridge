"""Generate the Valmont model pages and the model listings from tools/models.json.

Usage (from the repo root):  python -I tools/build_models.py

Writes / updates:
  homes/the-<slug>.html             one page per model (12)
  homes.html                        ItemList JSON-LD + the card sections between BEGIN:models / END:models
  index.html                        featured cards (BEGIN:featured) + booking options (BEGIN:booking-models)

Shared chrome (font/CSS/JS links, consent-gated Meta Pixel, header, footer) is copied from
homes.html at build time, so the model pages never drift from the rest of the site.
Python standard library only.
"""
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = json.load(open(os.path.join(ROOT, 'tools', 'models.json'), encoding='utf-8'))
SITE = DATA['site']
MODELS = DATA['models']
COLL = DATA['collections']
IMG = DATA['images']
BY_SLUG = {m['slug']: m for m in MODELS}
FEATURED = ['tucker', 'woodrow', 'boone', 'fatboy']  # owner's picks for the index teaser


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as fh:
        return fh.read()


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(text)


def num(n):
    return '{:,}'.format(n)


def text(s):
    """Plain text from a data string that may hold HTML entities (for JSON-LD and meta)."""
    return html.unescape(s)


def attr(s):
    """Escape for an HTML attribute (data strings already use &amp; where needed)."""
    return html.escape(html.unescape(s), quote=True)


def dims(name):
    w, h = IMG[name]
    return 'width="%d" height="%d"' % (w, h)


def asset(prefix, name):
    return '%sassets/models/%s' % (prefix, name)


def page_url(m):
    return '%s/homes/the-%s.html' % (SITE, m['slug'])


def coll_label(m):
    return COLL[m['collection']]['label']


def spec_line(m):
    line = '%s · %s · %s · %s Bath' % (coll_label(m), m['sqft_card'], m['beds'], m['baths'])
    # keep "2 Bed", "2.5 Bath", "1,560 sq ft" together when the line wraps
    return re.sub(r'(\d) (?=Bed|Bath|sq)', r'\1&nbsp;', line).replace('sq ft', 'sq&nbsp;ft')


# ---------------------------------------------------------------------------
# Shared chrome, lifted from homes.html
# ---------------------------------------------------------------------------
HOMES = read('homes.html')


def grab(pattern, src=HOMES):
    found = re.search(pattern, src, re.S)
    if not found:
        raise SystemExit('build_models: pattern not found in homes.html: ' + pattern)
    return found.group(0)


REL_URL = re.compile(r'\b(href|src)="(?!https?:|mailto:|tel:|#|/|data:)([^"]+)"')


def up(fragment):
    """Rewrite root-relative links for a page one folder down (homes/)."""
    return REL_URL.sub(lambda m: '%s="../%s"' % (m.group(1), m.group(2)), fragment)


HEAD_LINKS = grab(r'<link rel="preconnect" href="https://fonts.googleapis.com">.*?<script src="js.js(?:\?v=[^"]*)?" defer></script>')
HEAD_LINKS = '\n'.join(l for l in HEAD_LINKS.split('\n') if 'cdn.prod.website-files.com' not in l)
PIXEL = grab(r'<!-- Meta Pixel Code.*?<!-- End Meta Pixel Code -->')
HEADER = grab(r'<header class="site-header">.*?</header>')
FOOTER = grab(r'<footer class="site-footer">.*?</footer>')
SQFT_NOTE = grab(r'  <!-- SQUARE FOOTAGE NOTE -->.*?</section>\n')


# ---------------------------------------------------------------------------
# Fragments
# ---------------------------------------------------------------------------
def card(m, prefix='', level='h3', with_id=False):
    s = m['slug']
    return '\n'.join([
        '        <a class="model" %shref="%shomes/the-%s.html">' % ('id="%s" ' % s if with_id else '', prefix, s),
        '          <img src="%s" alt="%s %s, exterior elevation A" loading="lazy" %s decoding="async">'
        % (asset(prefix, s + '-card.webp'), m['name'], coll_label(m).lower() + (' home' if m['collection'] == 'two-storey' else ''), dims(s + '-card.webp')),
        '          <div class="m-body">',
        '            <%s>%s</%s>' % (level, m['name'], level),
        '            <p class="m-spec">%s</p>' % spec_line(m),
        '          </div>',
        '        </a>',
    ])


def switch_buttons(target, items, label):
    out = ['<div class="switch-row%s" role="group" aria-label="%s">' % (' plan-switch' if target.endswith('-plan') else '', label)]
    for i, (name, btn, cap) in enumerate(items):
        w, h = IMG[name]
        out.append('  <button type="button" class="switch%s" aria-pressed="%s" data-target="%s" data-src="../assets/models/%s" data-w="%d" data-h="%d" data-cap="%s">%s</button>'
                   % (' on' if i == 0 else '', 'true' if i == 0 else 'false', target, name, w, h, attr(cap), btn))
    out.append('</div>')
    return out


def indent(lines, n):
    pad = ' ' * n
    return '\n'.join(pad + l if l else l for l in lines)


def quickstats(m):
    qs = [(num(m['sqft']), m.get('sqft_label', 'Total sq ft' if m['collection'] == 'two-storey' else 'Sq ft · single level'))]
    if m['collection'] == 'two-storey':
        qs += [(num(m['main']), 'Main floor sq ft'), (num(m['upper']), 'Upper floor sq ft')]
    qs += [(m['beds'], 'Bedrooms'), (m['baths'], 'Bathrooms'), (m['garage'][0], m['garage'][1]),
           ('Unfinished', 'Basement · development optional')]
    if m.get('plan_options'):
        qs.append((m['plan_options'], 'Plan options'))
    return ['<li><span class="qs-num">%s</span><span class="qs-lbl">%s</span></li>' % (a, b) for a, b in qs]


def related(m):
    """Three nearest-priced homes from the same collection, then the nearest from the other one."""
    same = sorted((x for x in MODELS if x['collection'] == m['collection'] and x is not m), key=lambda x: (abs(x['price'] - m['price']), x['price']))[:3]
    other = sorted((x for x in MODELS if x['collection'] != m['collection']), key=lambda x: (abs(x['price'] - m['price']), x['price']))[:1]
    same.sort(key=lambda x: x['price'])
    return same + other


def named_line(m):
    if m['named'] == 'donkey':
        return ("Named for developer Don Beaton's donkey: the one exception in a collection named for the horses raised on his "
                "ranch here in Diamond Valley, and every bit as beloved.")
    return 'Named for one of the horses raised on developer Don Beaton’s ranch, here in Diamond Valley.'


def meta_description(m):
    base = '%s by Valmont Custom Homes at Diamond Ridge: a %s sq ft %s, %s, %s bath.' % (
        m['name'], num(m['sqft']), coll_label(m).lower(), m['beds'], m['baths'])
    tail = ' Plans, renderings and brochure.'
    return base + tail if len(base + tail) <= 160 else base


def product_ld(m):
    url = page_url(m)
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': ['Product', 'SingleFamilyResidence'],
                'name': '%s by Valmont Custom Homes' % m['name'],
                'url': url,
                'image': '%s/assets/models/%s-ext-a.jpg' % (SITE, m['slug']),
                'description': text(m['tagline']),
                'brand': {'@type': 'Organization', 'name': 'Valmont Custom Homes'},
                'floorSize': {'@type': 'QuantitativeValue', 'value': m['sqft'], 'unitCode': 'FTK'},
                'numberOfBedrooms': m['beds_num'],
                'numberOfFullBathrooms': m['full'],
                'numberOfPartialBathrooms': m['partial'],
            },
            {
                '@type': 'BreadcrumbList',
                'itemListElement': [
                    {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
                    {'@type': 'ListItem', 'position': 2, 'name': 'Homes', 'item': SITE + '/homes.html'},
                    {'@type': 'ListItem', 'position': 3, 'name': m['name'], 'item': url},
                ],
            },
        ],
    }


def ld_script(obj):
    return '<script type="application/ld+json">\n%s\n</script>' % json.dumps(obj, indent=1, ensure_ascii=False)


def model_page(m):
    s, n = m['slug'], m['name']
    url = page_url(m)
    title = '%s · %s sq ft %s | Diamond Ridge' % (n, num(m['sqft']), coll_label(m))
    desc = meta_description(m)
    og_img = '%s/assets/models/%s-ext-a.jpg' % (SITE, s)
    og_alt = '%s by Valmont Custom Homes, exterior elevation A' % n
    first_view, first_cap = m['views'][0][0], m['views'][0][1]
    first_img = '%s-%s.webp' % (s, first_view)
    views = [('%s-%s.webp' % (s, v), text(c), c) for v, c in m['views']]
    plans = [('%s-%s.webp' % (s, v), b, c) for v, b, c in m['plans']]
    pdf = '%s-brochure.pdf' % s
    pdf_path = os.path.join(ROOT, 'assets', 'models', pdf)
    pdf_mb = os.path.getsize(pdf_path) / 1048576 if os.path.exists(pdf_path) else None
    pdf_note = ' (PDF, %.1f MB, opens in a new tab)' % pdf_mb if pdf_mb else ' (PDF, opens in a new tab)'

    L = []
    L.append('''<!DOCTYPE html>
<html lang="en-CA">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="%(url)s">
<meta name="theme-color" content="#0e0d0b">
<meta name="color-scheme" content="dark">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="icon" href="../favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Diamond Ridge">
<meta property="og:locale" content="en_CA">
<meta property="og:title" content="%(n)s by Valmont Custom Homes | Diamond Ridge">
<meta property="og:description" content="%(desc)s">
<meta property="og:url" content="%(url)s">
<meta property="og:image" content="%(og_img)s">
<meta property="og:image:width" content="%(ow)d">
<meta property="og:image:height" content="%(oh)d">
<meta property="og:image:alt" content="%(og_alt)s">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="%(n)s by Valmont Custom Homes | Diamond Ridge">
<meta name="twitter:description" content="%(desc)s">
<meta name="twitter:image" content="%(og_img)s">
<meta name="twitter:image:alt" content="%(og_alt)s">''' % dict(title=attr(title), desc=attr(desc), url=url, n=n, og_img=og_img,
                                                              ow=IMG[s + '-ext-a.jpg'][0], oh=IMG[s + '-ext-a.jpg'][1], og_alt=og_alt))
    L.append(up(HEAD_LINKS))
    L.append(ld_script(product_ld(m)))
    L.append(PIXEL)
    L.append('</head>\n<body>\n<a class="skip-link" href="#main">Skip to main content</a>')
    L.append(up(HEADER))
    L.append('')
    L.append('<main id="main">')
    L.append('')
    L.append('  <!-- generated by tools/build_models.py from tools/models.json: edit the data, not this file -->')
    L.append('  <section class="model-block model-block--page" aria-labelledby="%s-title">' % s)
    L.append('    <div class="wrap">')
    L.append('      <nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="../index.html">Home</a></li><li><a href="../homes.html">Homes</a></li><li><span aria-current="page">%s</span></li></ol></nav>' % n)
    L.append('      <div class="model-head">')
    L.append('        <div>')
    L.append('          <p class="eyebrow">Valmont Custom Homes · %s · %s</p>' % (coll_label(m), m['sqft_card']))
    L.append('          <h1 id="%s-title">%s</h1>' % (s, n))
    L.append('          <span class="m-tag">%s</span>' % m['tagline'])
    L.append('        </div>')
    L.append('        <div class="btn-row">')
    L.append('          <a href="../register.html" class="btn btn-solid">Enquire about %s</a>' % n)
    L.append('          <a href="../index.html#book" class="btn btn-ghost">Book a showing</a>')
    L.append('        </div>')
    L.append('      </div>')
    L.append('')
    L.append('      <ul class="quickstats" role="list">')
    L.append(indent(quickstats(m), 8))
    L.append('      </ul>')
    L.append('')
    L.append('      <div class="showcase">')
    L.append('        <figure class="stage">')
    L.append('          <a href="../assets/models/%s" data-lightbox><span class="visually-hidden">Enlarge image: </span><img id="%s-stage" data-name="%s rendering" src="../assets/models/%s" alt="%s rendering — %s" fetchpriority="high" %s decoding="async"></a>'
             % (first_img, s, n, first_img, n, first_cap, dims(first_img)))
    L.append('          <figcaption class="stage-cap" id="%s-cap">%s</figcaption>' % (s, first_cap))
    L.append('        </figure>')
    if len(views) > 1:
        L.append(indent(switch_buttons(s, views, '%s views' % n), 8))
    L.append('      </div>')
    L.append('')
    L.append('      <div class="model-grid-2">')
    L.append('        <div class="reveal">')
    L.append('          <h2 class="panel-title">%s</h2>' % ('Floor plans' if len(plans) > 1 else 'Floor plan'))
    if len(plans) > 1:
        L.append(indent(switch_buttons(s + '-plan', plans, '%s floor plans' % n), 10))
    p_img, _, p_cap = plans[0]
    L.append('          <div class="plan-wrap">')
    L.append('            <a href="../assets/models/%s" data-lightbox><span class="visually-hidden">Enlarge floor plan: </span><img id="%s-plan-stage" data-name="%s floor plan" src="../assets/models/%s" alt="%s floor plan — %s" loading="lazy" %s decoding="async"></a>'
             % (p_img, s, n, p_img, n, p_cap, dims(p_img)))
    L.append('          </div>')
    L.append('          <p class="note-sm" id="%s-plan-cap">%s</p>' % (s, p_cap))
    L.append('          <p class="note-sm">Select the plan to enlarge it, then use Zoom in to read every room label and dimension.</p>')
    L.append('        </div>')
    L.append('        <div class="reveal">')
    L.append('          <h2 class="panel-title">Standard features</h2>')
    L.append('          <ul class="spec-cols" role="list">')
    for f in m['std']:
        L.append('            <li><span>%s</span><span class="sv">Standard</span></li>' % f)
    L.append('          </ul>')
    if m['opt']:
        L.append('          <h2 class="panel-title panel-title--spaced">Options &amp; upgrades</h2>')
        L.append('          <ul class="spec-cols" role="list">')
        for f in m['opt']:
            L.append('            <li><span>%s</span><span class="sv">Optional</span></li>' % f)
        L.append('          </ul>')
    L.append('          <p class="model-named">%s</p>' % named_line(m))
    L.append('          <div class="btn-row mt-5">')
    L.append('            <a href="../assets/models/%s" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">Download the %s brochure<span class="visually-hidden">%s</span></a>' % (pdf, n.replace('The ', ''), pdf_note))
    L.append('          </div>')
    if pdf_mb:
        L.append('          <p class="note-sm">PDF · %.1f MB · full specifications and floor plans</p>' % pdf_mb)
    L.append('        </div>')
    L.append('      </div>')
    L.append('    </div>')
    L.append('  </section>')
    L.append('')
    L.append('  <!-- MORE HOMES -->')
    L.append('  <section class="section section--alt" aria-labelledby="more-title">')
    L.append('    <div class="wrap">')
    L.append('      <div class="section-head reveal">')
    L.append('        <p class="eyebrow">The Valmont Custom Home Collection</p>')
    L.append('        <h2 id="more-title">More homes in the collection</h2>')
    L.append('      </div>')
    L.append('      <div class="model-grid model-grid--4 reveal">')
    L.append('\n'.join(card(x, '../') for x in related(m)))
    L.append('      </div>')
    L.append('      <div class="btn-row mt-6 reveal">')
    L.append('        <a href="../homes.html" class="btn btn-ghost">View all twelve homes</a>')
    L.append('      </div>')
    L.append('    </div>')
    L.append('  </section>')
    L.append('')
    L.append(SQFT_NOTE.rstrip('\n'))
    L.append('')
    L.append('</main>')
    L.append('')
    L.append(up(FOOTER))
    L.append('</body>\n</html>\n')
    return '\n'.join(L)


# ---------------------------------------------------------------------------
# homes.html + index.html managed regions
# ---------------------------------------------------------------------------
def replace_region(src, name, body, path):
    pat = re.compile(r'(<!-- BEGIN:%s[^>]*-->).*?(\n[ \t]*<!-- END:%s -->)' % (name, name), re.S)
    if not pat.search(src):
        raise SystemExit('build_models: region %s not found in %s' % (name, path))
    return pat.sub(lambda mt: mt.group(1) + '\n' + body + mt.group(2), src, count=1)


def homes_sections():
    out = []
    for key, c in COLL.items():
        ms = [m for m in MODELS if m['collection'] == key]
        lo, hi = min(m['sqft'] for m in ms), max(m['sqft'] for m in ms)
        cid = 'bungalows' if key == 'bungalow' else 'two-storey'
        out.append('''  <section class="section collection%s" id="%s" data-collection="%s" aria-labelledby="%s-title">
    <div class="wrap">
      <div class="collection-head reveal">
        <h2 id="%s-title">%s <span class="collection-count">(%d)</span></h2>
        <p class="collection-meta">%s plans · %s–%s sq ft</p>
      </div>
      <div class="model-grid model-grid--3">
%s
      </div>
    </div>
  </section>''' % (' section--alt' if key != 'bungalow' else '', cid, key, cid, cid, c['heading'], len(ms), c['word'].capitalize(),
                   num(lo), num(hi), '\n'.join(card(m, '', with_id=True) for m in ms)))
    return '\n\n'.join(out)


def homes_ld():
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'ItemList',
                'name': 'The Valmont Custom Home Collection at Diamond Ridge',
                'numberOfItems': len(MODELS),
                'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': page_url(m), 'name': '%s by Valmont Custom Homes' % m['name']}
                                    for i, m in enumerate(MODELS)],
            },
            {
                '@type': 'BreadcrumbList',
                'itemListElement': [
                    {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
                    {'@type': 'ListItem', 'position': 2, 'name': 'Homes', 'item': SITE + '/homes.html'},
                ],
            },
        ],
    }


def main():
    for m in MODELS:
        for v, _ in m['views']:
            assert '%s-%s.webp' % (m['slug'], v) in IMG, (m['slug'], v)
        for v, _, _ in m['plans']:
            assert '%s-%s.webp' % (m['slug'], v) in IMG, (m['slug'], v)
        write('homes/the-%s.html' % m['slug'], model_page(m))

    homes = HOMES
    homes = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda _: ld_script(homes_ld()), homes, count=1, flags=re.S)
    homes = replace_region(homes, 'models', homes_sections(), 'homes.html')
    write('homes.html', homes)

    index = read('index.html')
    index = replace_region(index, 'featured', '\n'.join(card(BY_SLUG[s]) for s in FEATURED), 'index.html')
    opts = []
    for key, label in (('bungalow', 'Valmont bungalows'), ('two-storey', 'Valmont two-storey homes')):
        opts.append('          <optgroup label="%s">' % label)
        opts += ['            <option>%s</option>' % m['name'] for m in MODELS if m['collection'] == key]
        opts.append('          </optgroup>')
    index = replace_region(index, 'booking-models', '\n'.join(opts), 'index.html')
    write('index.html', index)
    print('build_models: wrote %d model pages, homes.html and index.html' % len(MODELS))


if __name__ == '__main__':
    sys.exit(main())
