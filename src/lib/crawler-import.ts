/**
 * Maps public Foody crawler records into Restaurant rows.
 * Pure functions only: file I/O and Prisma writes belong to the import script.
 */
export interface CrawlerVenue {
  source: string;
  source_id: string | number;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  rating: number | null;
  review_count?: number | null;
  photo_urls?: string[];
  fetched_at?: string;
}

export interface RestaurantImportRow {
  externalId: string;
  name: string;
  address: string;
  rating: number;
  photoUrl: string | null;
  url: string;
  lat: number | null;
  lon: number | null;
  city: string;
  source: string;
  scrapedAt: Date;
  priceMin: null;
  priceMax: null;
  district: null;
  openHours: null;
  cuisines: null;
}

const TEMPLATE_MARKER = "{{";
const ADDRESS_UNKNOWN = "Đang cập nhật";

/** A row is importable when it has an identity and a real link to the source. */
export function isImportableVenue(venue: CrawlerVenue): boolean {
  return venue.source_id !== "" && venue.source_id != null && Boolean(venue.name) && Boolean(venue.website);
}

export function mapCrawlerVenue(venue: CrawlerVenue): RestaurantImportRow {
  const raw = venue.address || "";
  const address = raw.length > 10 && !raw.includes(TEMPLATE_MARKER) ? raw : ADDRESS_UNKNOWN;
  return {
    externalId: String(venue.source_id),
    name: venue.name,
    address,
    rating: venue.rating ?? 0,
    photoUrl: venue.photo_urls?.[0] ?? null,
    url: venue.website as string,
    lat: venue.lat ?? null,
    lon: venue.lng ?? null,
    city: "TP.HCM",
    source: "Foody-crawler",
    scrapedAt: new Date(venue.fetched_at || Date.now()),
    priceMin: null,
    priceMax: null,
    district: null,
    openHours: null,
    cuisines: null,
  };
}

/** Dedupe by source id and keep every importable row unless a limit is given. */
export function selectCuratedVenues(items: CrawlerVenue[], limit = Infinity): RestaurantImportRow[] {
  const seen = new Set<string>();
  return items
    .filter(isImportableVenue)
    .filter(venue => {
      const id = String(venue.source_id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) =>
      (b.review_count ?? 0) - (a.review_count ?? 0) || (b.rating ?? 0) - (a.rating ?? 0)
    )
    .slice(0, limit)
    .map(mapCrawlerVenue);
}
