import { createHash } from "node:crypto";

export interface RawGooglePlace {
  name: string;
  lat: number;
  lon: number;
}

export interface NormalizedGooglePlace extends RawGooglePlace {
  /** Stable identity: lowercase name + 5-decimal coordinates. */
  key: string;
}

const LOCALITY_SUFFIX = /,\s*(Vietnam|Việt Nam)\s*$/i;
const DISTANCE_LABEL = /^\d+(?:\.\d+)?\s*(?:mi|km)\s+away$/i;
const LODGING_TITLE = /sleeps\s+\d|\d+\s*(?:bedroom|bathroom)/i;
const HOTEL_COMPARISON = /^Also a \d+-star hotel/i;
const round5 = (n: number) => n.toFixed(5);

/**
 * Filters an aggregate Google Maps crawl to actual places and removes repeats.
 * Nothing is invented here: only name and coordinates are kept.
 */
export function normalizeGooglePlaces(places: RawGooglePlace[]): NormalizedGooglePlace[] {
  const seen = new Set<string>();
  const out: NormalizedGooglePlace[] = [];
  for (const place of places) {
    const name = typeof place?.name === "string" ? place.name.trim() : "";
    const lat = Number(place?.lat);
    const lon = Number(place?.lon);
    if (name.length < 4 || /^\d+$/.test(name.replace(/\s/g, "")) || LOCALITY_SUFFIX.test(name)) continue;
    // Playwright captured rendered Maps text, including UI labels and lodging cards.
    if (DISTANCE_LABEL.test(name) || LODGING_TITLE.test(name) || HOTEL_COMPARISON.test(name)) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const key = `${name.toLowerCase()}|${round5(lat)}|${round5(lon)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, lat, lon, key });
  }
  return out;
}

/** Deterministic, idempotent external id for an imported Google place. */
export function googleExternalId(key: string): string {
  return `google:${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
}

/** Navigable Maps link built only from real crawl coordinates. */
export function googleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
}
