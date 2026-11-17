#!/usr/bin/env python3
"""Scrape 50 TP.HCM restaurants from Foody's own list API (see docs/specs/what-to-eat.md)."""
import urllib.request, gzip, json, time, datetime

H = {
 "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:159.0) Gecko/20100101 Firefox/159.0",
 "Accept":"application/json, text/plain, */*",
 "X-Requested-With":"XMLHttpRequest",
 "Referer":"https://www.foody.vn/",
}
URL = "https://www.foody.vn/__get/Place/HomeListPlace?page={page}&lat=10.823099&lon=106.629664&count=12&cityId=217&type=1"

def fetch(page):
    req = urllib.request.Request(URL.format(page=page), headers=H)
    r = urllib.request.urlopen(req, timeout=25)
    b = r.read()
    if r.headers.get("Content-Encoding") == "gzip":
        b = gzip.decompress(b)
    return json.loads(b.decode("utf-8-sig"))

def main():
    seen, out = set(), []
    for page in range(1, 7):
        try:
            d = fetch(page)
            items = d.get("Items", [])
            if not items: break
            for x in items:
                eid = x.get("Id")
                if not eid or eid in seen: continue
                seen.add(eid)
                out.append({
                    "externalId": str(eid),
                    "name": x.get("Name", "").strip(),
                    "address": x.get("Address", "").strip(),
                    "rating": round(float(x.get("AvgRating") or 0), 2),
                    "photoUrl": x.get("PhotoUrl") or None,
                    "url": "https://www.foody.vn" + (x.get("Url") or ""),
                    "lat": x.get("Latitude"),
                    "lon": x.get("Longitude"),
                    "city": "TP.HCM",
                })
            print(f"page {page}: {len(items)} items, total {len(out)}", flush=True)
            if len(out) >= 50: break
            time.sleep(0.5)
        except Exception as e:
            print(f"page {page} ERR {e}", flush=True)
            break
    json.dump(out, open("/tmp/foody-restaurants.json","w"), ensure_ascii=False, indent=1)
    print(f"SAVED {len(out)} restaurants at {datetime.datetime.now().isoformat()}")

if __name__ == "__main__": main()
