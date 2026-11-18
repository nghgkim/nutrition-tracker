#!/usr/bin/env python3
"""Extract Foody cuisine names from restaurant detail pages (public business data)."""
import urllib.request, gzip, json, re
from concurrent.futures import ThreadPoolExecutor, as_completed

H = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:159.0) Gecko/20100101 Firefox/159.0",
     "Accept-Language": "vi-VN,vi;q=0.9"}

def fetch(url):
    r = urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=25)
    b = r.read()
    if r.headers.get("Content-Encoding") == "gzip":
        b = gzip.decompress(b)
    return b.decode("utf-8", "replace")

def extract(html):
    m = re.search(r'"Cuisines":(\[.*?\])', html)
    if not m:
        return []
    try:
        return [x.get("Name") for x in json.loads(m.group(1)) if x.get("Name")]
    except (ValueError, AttributeError):
        return []

def main():
    restaurants = json.load(open("/tmp/foody-details.json"))
    out = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = {ex.submit(fetch, r["url"]): r for r in restaurants}
        for future in as_completed(futures):
            r = futures[future]
            try:
                names = extract(future.result())
            except Exception:
                names = []
            r["cuisines"] = names
            out.append(r)
    json.dump(out, open("/tmp/foody-cuisines.json", "w"), ensure_ascii=False, indent=1)
    print("with cuisines:", sum(1 for r in out if r["cuisines"]), "total:", len(out))

if __name__ == "__main__":
    main()
