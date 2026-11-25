import { describe, it, expect } from "vitest";
import { normalizeGooglePlaces, googleExternalId, googleMapsUrl, type RawGooglePlace } from "@/lib/google-places";

const place = (name: string, lat: number, lon: number): RawGooglePlace => ({ name, lat, lon });

describe("normalizeGooglePlaces", () => {
  it("keeps real places with their exact coordinates", () => {
    const rows = normalizeGooglePlaces([place("  Phở Đạt  ", 10.4690287, 106.3563622)]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Phở Đạt", lat: 10.4690287, lon: 106.3563622 });
    expect(rows[0].key).toContain("phở đạt|10.46903|106.35636");
  });

  it("drops locality names, short names, pure digits and invalid coordinates", () => {
    const rows = normalizeGooglePlaces([
      place("An Phuoc, Dong Nai, Vietnam", 10.9, 106.8),
      place("abc", 10.9, 106.8),
      place("12345", 10.9, 106.8),
      place("Quán Phở", Number.NaN, 106.8),
      place("Quán Phở", 10.9, Number.POSITIVE_INFINITY),
    ]);
    expect(rows).toHaveLength(0);
  });

  it("dedupes by case-insensitive name and 5-decimal coordinates", () => {
    const rows = normalizeGooglePlaces([
      place("Cơm Tấm Út Nam", 10.7333194, 106.8201674),
      place("cơm tấm út nam", 10.73331942, 106.82016739),
      place("Cơm Tấm Út Nam", 10.8, 106.9),
    ]);
    expect(rows).toHaveLength(2);
  });
});

describe("googleExternalId", () => {
  it("is stable, prefixed and source-specific", () => {
    const a = googleExternalId("phở đạt|10.46903|106.35636");
    expect(a).toBe(googleExternalId("phở đạt|10.46903|106.35636"));
    expect(a).toMatch(/^google:[0-9a-f]{20}$/);
    expect(a).not.toBe(googleExternalId("khác|10.46903|106.35636"));
  });
});

describe("googleMapsUrl", () => {
  it("builds a real maps link from exact coordinates", () => {
    expect(googleMapsUrl(10.4690287, 106.3563622)).toBe(
      "https://www.google.com/maps/search/?api=1&query=10.4690287%2C106.3563622"
    );
  });
});
