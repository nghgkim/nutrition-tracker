import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const data: Record<string, { priceMin: number | null; priceMax: number | null }> =
  JSON.parse(readFileSync(process.env.PRICES_JSON || "/tmp/prices500.json", "utf-8"));
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
async function main() {
  let count = 0;
  for (const [externalId, price] of Object.entries(data)) {
    if (price.priceMin == null) continue;
    await prisma.restaurant.update({
      where: { externalId },
      data: { priceMin: price.priceMin, priceMax: price.priceMax },
    });
    count++;
  }
  console.log(`Enriched ${count} restaurants with public Foody prices`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
