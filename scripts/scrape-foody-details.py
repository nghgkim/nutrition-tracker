#!/usr/bin/env python3
"""Re-crawl Foody detail pages for price/district/hours (public business data only)."""
import urllib.request, gzip, json, re, time
from concurrent.futures import ThreadPoolExecutor, as_completed

H={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:159.0) Gecko/20100101 Firefox/159.0",
   "Accept":"text/html,*/*","Accept-Language":"vi-VN,vi;q=0.9"}

def fetch(url):
    req=urllib.request.Request(url,headers=H)
    r=urllib.request.urlopen(req,timeout=25)
    b=r.read()
    if r.headers.get("Content-Encoding")=="gzip": b=gzip.decompress(b)
    return b.decode("utf-8","replace")

def parse(html):
    # price: "20.000đ - 40.000đ" near "Giá cả"
    nums=re.findall(r'([\d.,]+)\s*đ', html)
    prices=[]
    for n in nums[:8]:
        try:
            v=int(n.replace('.','').replace(',',''))
            if 5000 <= v <= 2000000: prices.append(v)
        except: pass
    pmin=min(prices) if prices else None
    pmax=max(prices) if prices else None
    # district: "Quận 7", "Quận Tân Phú" from address text
    dm=re.search(r'(Quận [^,<]+|Huyện [^,<]+|Thành phố Thủ Đức)', html)
    district=dm.group(1).strip() if dm else None
    # hours: "11:00 - 20:30"
    hm=re.search(r'(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})', html)
    hours=f"{hm.group(1)}-{hm.group(2)}" if hm else None
    return {"priceMin":pmin,"priceMax":pmax,"district":district,"openHours":hours}

def main():
    restaurants=json.load(open("/tmp/foody-restaurants.json"))
    out=[]
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs={ex.submit(fetch,r["url"]):r for r in restaurants}
        for fut in as_completed(futs):
            r=futs[fut]
            try:
                d=parse(fut.result())
                r.update(d)
                out.append(r)
            except Exception as e:
                out.append(r)  # keep original if detail fails
    json.dump(out,open("/tmp/foody-details.json","w"),ensure_ascii=False,indent=1)
    print("with price:",sum(1 for r in out if r.get("priceMin")),"with district:",sum(1 for r in out if r.get("district")),"total:",len(out))

if __name__=="__main__": main()
