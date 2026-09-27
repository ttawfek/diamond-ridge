#!/usr/bin/env python3
"""
localize_assets.py — makes the Diamond Ridge site fully self-contained.

Scans every .html file in this folder for media hosted on
cdn.prod.website-files.com, downloads each file into ./assets/,
and rewrites the HTML to point at the local copies.

Usage (from inside the dr-site folder):
    python3 localize_assets.py

Requires Python 3.8+ and an internet connection. No extra packages needed.
Safe to re-run: already-downloaded files are skipped.
"""

import os
import re
import sys
import urllib.parse
import urllib.request

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(SITE_DIR, "assets")
CDN_PATTERN = re.compile(r'https://cdn\.prod\.website-files\.com/[^\s"\'<>]+')

HEADERS = {"User-Agent": "Mozilla/5.0 (asset localizer script)"}


def local_name(url: str) -> str:
    """Derive a clean, unique local filename from a CDN URL."""
    decoded = urllib.parse.unquote(url)
    base = decoded.rsplit("/", 1)[-1]
    # strip webflow's leading hash prefix if there are two ids glued together
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", base)
    if len(base) > 80:  # keep filenames sane
        name, dot, ext = base.rpartition(".")
        base = name[:70] + "." + ext if dot else base[:80]
    return base


def download(url: str, dest: str) -> bool:
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        print(f"  skip (exists): {os.path.basename(dest)}")
        return True
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
            while chunk := r.read(1 << 16):
                f.write(chunk)
        size_mb = os.path.getsize(dest) / 1_048_576
        print(f"  downloaded: {os.path.basename(dest)} ({size_mb:.1f} MB)")
        return True
    except Exception as e:
        print(f"  FAILED: {url}\n          {e}")
        if os.path.exists(dest):
            os.remove(dest)
        return False


def main() -> None:
    os.makedirs(ASSETS_DIR, exist_ok=True)

    html_files = [f for f in os.listdir(SITE_DIR) if f.endswith(".html")]
    if not html_files:
        sys.exit("No .html files found — run this from inside the site folder.")

    # 1. collect every unique CDN URL across all pages
    url_map: dict[str, str] = {}
    for fname in html_files:
        text = open(os.path.join(SITE_DIR, fname), encoding="utf-8").read()
        for url in CDN_PATTERN.findall(text):
            if url not in url_map:
                name = local_name(url)
                # avoid collisions between different URLs with same filename
                candidate, i = name, 1
                taken = set(url_map.values())
                while candidate in taken:
                    stem, dot, ext = name.rpartition(".")
                    candidate = f"{stem}_{i}.{ext}" if dot else f"{name}_{i}"
                    i += 1
                url_map[url] = candidate

    print(f"Found {len(url_map)} unique media files across {len(html_files)} pages.\n")

    # 2. download everything
    ok, failed = 0, []
    for url, name in url_map.items():
        if download(url, os.path.join(ASSETS_DIR, name)):
            ok += 1
        else:
            failed.append(url)

    # 3. rewrite HTML only for files that actually downloaded
    print("\nRewriting HTML to local paths...")
    for fname in html_files:
        path = os.path.join(SITE_DIR, fname)
        text = open(path, encoding="utf-8").read()
        for url, name in url_map.items():
            if url not in failed:
                text = text.replace(url, f"assets/{name}")
        open(path, "w", encoding="utf-8").write(text)
        print(f"  updated: {fname}")

    print(f"\nDone. {ok}/{len(url_map)} files localized into ./assets/")
    if failed:
        print("These URLs failed and were left pointing at the CDN "
              "(re-run the script to retry):")
        for u in failed:
            print("  -", u)
    else:
        print("The site is now fully self-contained — upload the whole "
              "folder to Netlify/Vercel and it will work with no external "
              "dependencies.")


if __name__ == "__main__":
    main()
