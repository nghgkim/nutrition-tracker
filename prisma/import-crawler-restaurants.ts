import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { selectCuratedVenues, type CrawlerVenue } from "../src/lib/crawler-import";

// Reads a stable snapshot, never the crawler's live file (it may be mid-write).
const snapshotPath = process.env.CRAWLER_SNAPSHOT || "/tmp/foody-hcm-snapshot.json";
const limit = Number(process.env.IMPORT_LIMIT || 500);
const document = JSON.parse(readFileSync(snapshotPath, "utf-8"));
const rows = selectCuratedVenues((document.items || []) as CrawlerVenue[], limit);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.restaurant.createMany({ data: rows, skipDuplicates: true });
  console.log(`Imported ${result.count} of ${rows.length} curated venues (source=Foody-crawler)`);
}

main()
  .catch(error => { console.error(error); process.exit(1); })
  .finally(() => prisma.$disconnect());
