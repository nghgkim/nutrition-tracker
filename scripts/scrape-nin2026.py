#!/usr/bin/env python3
"""Scrape NIN 2026 food data from dulieuphapluat.vn per docs/specs/food-db-2026.md."""
import re, json, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request

BASE = "https://dulieuphapluat.vn"
FOOD_INDEX = f"{BASE}/cong-cu/gia-tri-dinh-duong-thuc-pham.html"
DISH_INDEX = f"{BASE}/cong-cu/gia-tri-dinh-duong-mon-an.html"

DISH_CATEGORIES = [
 "nhom-cac-mon-khac","nhom-banh-canh-banh-da-bun-chao-sup-hoanh-thanh-hu-tieu-mien-my-pho-lau",
 "nhom-cac-loai-banh","nhom-cac-mon-banh-keo","nhom-banh-da-bun-pho","nhom-com-chao-xoi",
 "nhom-che-cac-loai-giai-khat","nhom-cac-loai-trai-cay","nhom-cac-mon-xoi-che",
 "nhom-cac-mon-trung-sua-va-che-pham","nhom-bun-com-xoi-chao","nhom-mon-xao",
 "nhom-burger-pizza","nhom-giai-khat","nhom-com-cac-loai","nhom-ngao-oc",
 "nhom-che-caramen-kem","nhom-cac-mon-che-bien-san","nhom-mon-canh",
]

CATEGORIES = [
 "nhom-rau-qua-cu-dung-lam-rau","nhom-thit-va-san-pham-che-bien","nhom-thuy-san-va-san-pham-che-bien",
 "nhom-thuc-an-truyen-thong","nhom-qua-chin","nhom-gia-vi-nuoc-cham",
 "nhom-hat-qua-giau-dam-beo-va-san-pham-che-bien","nhom-do-ngot-duong-banh-mut-keo",
 "nhom-khoai-cu-va-san-pham-che-bien","nhom-ngu-coc-va-san-pham-che-bien",
 "nhom-nuoc-giai-khat","nhom-do-hop","nhom-dau-mo-bo","nhom-sua-va-san-pham-che-bien",
 "nhom-trung-va-san-pham-che-bien",
]

def fetch(url, retries=2):
    for i in range(retries+1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            if i == retries: return None
            time.sleep(0.5)
    return None

def num(s):
    if not s: return 0
    s = s.replace(".", "").replace(",", ".").strip()
    m = re.search(r"-?\d+(?:\.\d+)?", s)
    return float(m.group()) if m else 0

def parse_links(html):
    # food detail links
    return set(re.findall(r'href="(/cong-cu/gia-tri-dinh-duong-thuc-pham/[^"?]+\.html)"', html))

def parse_detail(html, url):
    name_m = re.search(r'<h1[^>]*>Giá trị dinh dưỡng của ([^<]+)</h1>', html)
    if not name_m: return None
    name = re.sub(r"\s+", " ", name_m.group(1)).strip()
    # meta description contains all 4 macros: "năng lượng 349 kcal, chất đạm 12,3 g, chất béo 1,3 g, bột đường 72,1 g"
    meta = re.search(r'<meta name="description" content="([^"]+)"', html)
    desc = meta.group(1) if meta else ""
    def grab(pattern):
        m = re.search(pattern, desc, re.I)
        return num(m.group(1)) if m else 0
    cal = grab(r"năng lượng\s+([\d.,]+)\s*kcal")
    protein = grab(r"chất đạm\s+([\d.,]+)\s*g")
    fat = grab(r"chất béo\s+([\d.,]+)\s*g")
    carb = grab(r"bột đường\s+([\d.,]+)\s*g")
    return {"name": name, "calories": cal, "protein": protein, "carbs": carb, "fat": fat,
            "servingSize":"100g", "source":"NIN2026", "url": url}

def parse_dish_links(html):
    return set(re.findall(r'href="(/cong-cu/gia-tri-dinh-duong-mon-an/[^"?]+\.html)"', html))

def parse_dish(html, url):
    # title: "Bánh bèo 2 cái bao nhiêu calo? ..." -> name before " bao nhiêu"
    tm = re.search(r'<title>([^<]+)</title>', html)
    if not tm: return None
    name = tm.group(1).split(" bao nhiêu")[0].strip()
    if not name: return None
    meta = re.search(r'<meta name="description" content="([^"]+)"', html)
    desc = meta.group(1) if meta else ""
    cm = re.search(r"([\d.,]+)\s*kcal", desc, re.I)
    cal = num(cm.group(1)) if cm else 0
    def stat(label):
        m = re.search(r'gc-stat-value">([\d.,]+)<span[^>]*>[^<]*</span></div><div class="gc-stat-label">'+label, html)
        return num(m.group(1)) if m else 0
    pro = stat("Chất đạm"); fat = stat("Chất béo"); carb = stat("Bột đường")
    return {"name":name,"calories":cal,"protein":pro,"carbs":carb,"fat":fat,
            "servingSize":"100g","source":"NIN2026-dish","url":url}

def main():
    # collect food links from categories
    links = set()
    for cat in CATEGORIES:
        h = fetch(f"{BASE}/cong-cu/gia-tri-dinh-duong-thuc-pham/{cat}.html")
        if h: links |= parse_links(h)
        print(f"cat {cat}: total links {len(links)}", flush=True)
    # also from index "popular" + group listing
    for u in [FOOD_INDEX]:
        h = fetch(u)
        if h: links |= parse_links(h)
    print(f"FOOD LINKS: {len(links)}", flush=True)

    # parse details in parallel
    foods = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(fetch, BASE+l): l for l in links}
        for fut in as_completed(futs):
            html = fut.result()
            if not html: continue
            d = parse_detail(html, futs[fut])
            if d and d["name"] and d["calories"] > 0:
                foods.append(d)
    print(f"FOODS PARSED: {len(foods)}", flush=True)

    # dishes
    dlinks = set()
    for cat in DISH_CATEGORIES:
        h = fetch(f"{BASE}/cong-cu/gia-tri-dinh-duong-mon-an/{cat}.html")
        if h: dlinks |= parse_dish_links(h)
    h = fetch(DISH_INDEX)
    if h: dlinks |= parse_dish_links(h)
    print(f"DISH LINKS: {len(dlinks)}", flush=True)
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(fetch, BASE+l): l for l in dlinks}
        for fut in as_completed(futs):
            html = fut.result()
            if not html: continue
            d = parse_dish(html, futs[fut])
            if d and d["name"] and d["calories"] > 0:
                foods.append(d)
    print(f"TOTAL PARSED: {len(foods)}", flush=True)
    json.dump(foods, open("/tmp/nin2026-foods.json","w"), ensure_ascii=False, indent=1)

if __name__ == "__main__": main()
