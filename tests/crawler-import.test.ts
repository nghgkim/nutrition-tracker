import { describe, it, expect } from "vitest";
import { isQualityVenue, mapCrawlerVenue, selectCuratedVenues, type CrawlerVenue } from "@/lib/crawler-import";

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

describe("isQualityVenue", () => {
  it("rejects template addresses", () => {
    expect(isQualityVenue(V({ address: "{{Model.Restaurant.Address}}" }))).toBe(false);
  });

  it("rejects missing coordinates, website or rating", () => {
    expect(isQualityVenue(V({ lat: null }))).toBe(false);
    expect(isQualityVenue(V({ website: null }))).toBe(false);
    expect(isQualityVenue(V({ rating: 0 }))).toBe(false);
  });

  it("accepts a complete venue", () => {
    expect(isQualityVenue(V())).toBe(true);
  });
});

describe("mapCrawlerVenue", () => {
  it("maps crawler fields and leaves enrichment null", () => {
    const mapped = mapCrawlerVenue(V());
    expect(mapped.externalId).toBe("100");
    expect(mapped.lon).toBe(106.7);
    expect(mapped.photoUrl).toBe("https://img.example/a.jpg");
    expect(mapped.source).toBe("Foody-crawler");
    expect(mapped.scrapedAt.toISOString()).toBe("2026-11-18T10:00:00.000Z");
    expect(mapped.priceMin).toBeNull();
    expect(mapped.cuisines).toBeNull();
  });
});

describe("selectCuratedVenues", () => {
  it("drops low-quality rows, dedupes by source_id and caps the result", () => {
    const items = [
      V({ source_id: "1", review_count: 1 }),
      V({ source_id: "1", review_count: 99 }),
      V({ source_id: "2", review_count: 50 }),
      V({ source_id: "3", address: "{{Model.Restaurant.Address}}", review_count: 500 }),
    ];
    const result = selectCuratedVenues(items, 2);
    expect(result.map(r => r.externalId)).toEqual(["2", "1"]);
  });
});
