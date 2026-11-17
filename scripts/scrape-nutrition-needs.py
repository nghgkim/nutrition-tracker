#!/usr/bin/env python3
"""Scrape recommended calorie needs (15 age groups x gender x activity) from dulieuphapluat.vn."""
import re, json, urllib.request

BASE = "https://dulieuphapluat.vn/cong-cu/nhu-cau-dinh-duong"
AGES = ["0-5-thang","6-8-thang","9-11-thang","1-2-tuoi","3-5-tuoi","6-7-tuoi","8-9-tuoi",
        "10-11-tuoi","12-14-tuoi","15-17-tuoi","18-29-tuoi","30-49-tuoi","50-64-tuoi","65-74-tuoi","75-tuoi"]

def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req,timeout=25) as r:
        return r.read().decode("utf-8","replace")

def num(s):
    m=re.search(r"[\d.,]+", s.replace("\\",""))
    return float(m.group().replace(".","").replace(",",".")) if m else 0

def num(s):
    m = re.search(r"[\d.,]+", s.replace("\\", ""))
    return float(m.group().replace(".", "").replace(",", ".")) if m else 0

def parse(html, age):
    # Cards: <h2 class="gc-info-title">...Nam / Nữ — ...</h2> then 3 activity h3 + tables
    cards = re.split(r'<h2 class="gc-info-title">', html)
    out = {"male": {}, "female": {}}
    for card in cards[1:]:
        title = re.sub(r"<[^>]+>", "", card.split("</h2>")[0]).strip()
        gender = "male" if title == "Nam" else ("female" if title.startswith("Nữ — Không có thai") else None)
        if not gender: continue
        for act, key in [("Lao động nhẹ","light"),("Lao động trung bình","moderate"),("Lao động nặng","heavy")]:
            k = card.find(act)
            if k < 0: continue
            nxt = min([x for x in [card.find("Lao động nhẹ", k+1), card.find("Lao động trung bình", k+1), card.find("Lao động nặng", k+1)] if x > 0] + [len(card)])
            part = card[k:nxt]
            m = re.search(r'<th scope="row">Năng lượng</th>.*?<strong>([\d.,\-]+)</strong>', part)
            if m:
                val = num(m.group(1))
                if val > 0: out[gender][key] = val
    return out

def main():
    result={}
    for age in AGES:
        try:
            h=fetch(f"{BASE}/{age}.html")
            r=parse(h,age)
            result[age]=r
            print(age, r, flush=True)
        except Exception as e:
            print(age,"ERR",e,flush=True)
    json.dump(result,open("/tmp/nutrition-needs.json","w"),ensure_ascii=False,indent=1)
    print("TOTAL:",sum(len(v) for r in result.values() for v in r.values()))

if __name__=="__main__": main()
