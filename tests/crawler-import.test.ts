import { describe, it, expect } from "vitest";
import { isImportableVenue, mapCrawlerVenue, selectCuratedVenues, type CrawlerVenue } from "@/lib/crawler-import";

const V = (overrides: Partial<CrawlerVenue> = {}): CrawlerVenue => ({
  source: "foody",
  source_id: "100",
  name: "Quán test",
  address: "12 Nguyễn Huệ, Quận 1, TP. HCM",
  lat: 10.77,
  lng: 106.7,
  website: "https://www.foody.vn/ho-chi-minh/quan-test",
  rating: 7.5,
  review_count: 10,
  photo_urls: ["https://img.example/a.jpg"],
  fetched_at: "2026-11-18T10:00:00Z",
  ...overrides,
});

describe("isImportableVenue", () => {
  it("imports rows with a real identity and link, even with a template address", () => {
    expect(isImportableVenue(V({ address: "{{Model.Restaurant.Address}}" }))).toBe(true);
  });

  it("imports rows without coordinates or rating", () => {
    expect(isImportableVenue(V({ lat: null, lng: null, rating: 0 }))).toBe(true);
  });

  it("rejects rows without id, name or website (no honest link possible)", () => {
    expect(isImportableVenue(V({ source_id: "" }))).toBe(false);
    expect(isImportableVenue(V({ name: "" }))).toBe(false);
    expect(isImportableVenue(V({ website: null }))).toBe(false);
  });
});

describe("mapCrawlerVenue", () => {
  it("maps fields, preserves null coordinates and labels unusable addresses honestly", () => {
    const good = mapCrawlerVenue(V());
    expect(good.externalId).toBe("100");
    expect(good.lon).toBe(106.7);
    expect(good.photoUrl).toBe("https://img.example/a.jpg");
    expect(good.source).toBe("Foody-crawler");
    expect(good.scrapedAt.toISOString()).toBe("2026-11-18T10:00:00.000Z");
    expect(good.priceMin).toBeNull();
    expect(good.cuisines).toBeNull();

    const rough = mapCrawlerVenue(V({ address: "{{Model.Restaurant.Address}}", lat: null, lng: null, rating: 0 }));
    expect(rough.address).toBe("Đang cập nhật");
    expect(rough.lat).toBeNull();
    expect(rough.rating).toBe(0);
  });
});

describe("selectCuratedVenues", () => {
  it("dedupes by source_id but keeps every importable venue by default", () => {
    const items = [
      V({ source_id: "1", review_count: 1 }),
      V({ source_id: "1", review_count: 99 }),
      V({ source_id: "2", review_count: 50 }),
      V({ source_id: "3", website: null }),
    ];
    const result = selectCuratedVenues(items);
    expect(result.map(r => r.externalId)).toEqual(["2", "1"]);
  });

  it("honours an explicit limit when provided", () => {
    const items = [V({ source_id: "1" }), V({ source_id: "2" }), V({ source_id: "3" })];
    expect(selectCuratedVenues(items, 2)).toHaveLength(2);
  });
});
