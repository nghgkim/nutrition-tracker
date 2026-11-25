/**
 * Idempotent importer for the existing Google Maps crawl.
 * Only real crawled fields (name + coordinates) are written; unknown fields
 * stay explicitly empty so the UI never presents a fabricated value.
 *
 * Usage: npx tsx scripts/import-google-places.ts [--dry-run]
 * Source: data/google-maps/hcmc-places.json (override with GOOGLE_PLACES_FILE).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { normalizeGooglePlaces, googleExternalId, googleMapsUrl, type RawGooglePlace } from "../src/lib/google-places";

interface CrawlFile { places?: RawGooglePlace[] }

async function main() {
  const file = process.env.GOOGLE_PLACES_FILE || path.join(process.cwd(), "data/google-maps/hcmc-places.json");
  const parsed = JSON.parse(readFileSync(file, "utf8")) as RawGooglePlace[] | CrawlFile;
  const raw = Array.isArray(parsed) ? parsed : parsed.places || [];
  const places = normalizeGooglePlaces(raw);
  const rows = places.map(p => ({
    externalId: googleExternalId(p.key),
    name: p.name,
    address: "",
    rating: 0,
    photoUrl: null,
    url: googleMapsUrl(p.lat, p.lon),
    lat: p.lat,
    lon: p.lon,
    city: "TP.HCM",
    source: "Google",
    district: null,
    priceMin: null,
    priceMax: null,
    openHours: null,
    cuisines: null,
  }));
  console.log(`input=${raw.length} kept=${rows.length} dropped=${raw.length - rows.length}`);
  if (process.argv.includes("--dry-run")) return;

  const BATCH = 1000;
  let created = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const result = await prisma.restaurant.createMany({ data: rows.slice(i, i + BATCH), skipDuplicates: true });
    created += result.count;
    if (i % 10000 === 0) console.log(`progress ${i}/${rows.length}`);
  }
  console.log(`inserted=${created} unchanged=${rows.length - created}`);
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
