import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { haversine } from "@/lib/geo";
import { filterByPrice } from "@/lib/restaurant-filter";
import { sortOrder } from "@/lib/restaurant-sort";
import { shouldSortByDistance } from "@/lib/distance-sort";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const lat = q.get("lat") ? Number(q.get("lat")) : null;
  const lon = q.get("lon") ? Number(q.get("lon")) : null;
  const sort = q.get("sort") || "rating";
  const district = q.get("district");
  const minPrice = q.get("minPrice") ? Number(q.get("minPrice")) : null;
  const maxPrice = q.get("maxPrice") ? Number(q.get("maxPrice")) : null;
  const limit = Math.min(Math.max(Number(q.get("limit")) || 9, 1), 60);
  const offset = Math.max(Number(q.get("offset")) || 0, 0);

  const where: Prisma.RestaurantWhereInput = {};
  if (district) where.OR = [{ district: { contains: district } }, { address: { contains: district } }];
  if (minPrice != null) where.priceMin = { gte: minPrice };
  if (maxPrice != null) where.priceMax = { lte: maxPrice };

  // Global distance sort must happen BEFORE pagination. Every value is bound.
  if (shouldSortByDistance(sort, lat != null && lon != null && Number.isFinite(lat!) && Number.isFinite(lon!))) {
    const filters: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (district) filters.push(Prisma.sql`("district" ILIKE ${`%${district}%`} OR "address" ILIKE ${`%${district}%`})`);
    if (minPrice != null) filters.push(Prisma.sql`"priceMin" >= ${minPrice}`);
    if (maxPrice != null) filters.push(Prisma.sql`"priceMax" <= ${maxPrice}`);
    const whereSql = Prisma.join(filters, " AND ");
    const distance = Prisma.sql`(6371 * acos(LEAST(1, GREATEST(-1,
      COS(RADIANS(${lat})) * COS(RADIANS("lat")) * COS(RADIANS("lon") - RADIANS(${lon}))
      + SIN(RADIANS(${lat})) * SIN(RADIANS("lat"))))))`;
    const rows = await prisma.$queryRaw<Array<Record<string, unknown> & { distanceKm: number }>>(
      Prisma.sql`SELECT *, ${distance} AS "distanceKm" FROM "Restaurant"
        WHERE ${whereSql} AND "lat" IS NOT NULL AND "lon" IS NOT NULL
        ORDER BY "distanceKm" ASC, "id" ASC LIMIT ${limit} OFFSET ${offset}`
    );
    const restaurants = rows.map(r => ({
      ...r,
      distanceKm: Math.round(Number(r.distanceKm) * 10) / 10,
    }));
    const countRows = await prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT COUNT(*) AS count FROM "Restaurant" WHERE ${whereSql} AND "lat" IS NOT NULL AND "lon" IS NOT NULL`
    );
    return NextResponse.json({ restaurants, total: Number(countRows[0].count), source: "Foody" });
  }

  const [list, total] = await prisma.$transaction([
    prisma.restaurant.findMany({ where, take: limit, skip: offset, orderBy: sortOrder(sort) }),
    prisma.restaurant.count({ where }),
  ]);
  const priced = filterByPrice(list, minPrice, maxPrice);
  const withDist = priced.map(r => ({
    ...r,
    distanceKm: (lat != null && lon != null && r.lat != null && r.lon != null)
      ? Math.round(haversine(lat, lon, r.lat, r.lon) * 10) / 10 : null,
  }));
  return NextResponse.json({ restaurants: withDist, total, source: "Foody" });
}
