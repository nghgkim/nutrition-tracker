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
  lat: number;
  lon: number;
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

export function isQualityVenue(venue: CrawlerVenue): boolean {
  const address = venue.address || "";
  return (
    address.length > 10 &&
    !address.includes(TEMPLATE_MARKER) &&
    venue.lat != null &&
    venue.lng != null &&
    Boolean(venue.website) &&
    (venue.rating ?? 0) > 0
  );
}

export function mapCrawlerVenue(venue: CrawlerVenue): RestaurantImportRow {
  return {
    externalId: String(venue.source_id),
    name: venue.name,
    address: venue.address as string,
    rating: venue.rating as number,
    photoUrl: venue.photo_urls?.[0] ?? null,
    url: venue.website as string,
    lat: venue.lat as number,
    lon: venue.lng as number,
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

/** Quality filter, id dedupe, popularity ordering, then a hard volume cap. */
export function selectCuratedVenues(items: CrawlerVenue[], limit = 500): RestaurantImportRow[] {
  const seen = new Set<string>();
  return items
    .filter(isQualityVenue)
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
