import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { haversine } from "@/lib/geo";
import { clampCriteria, filterByPrice, normalizeDistricts } from "@/lib/restaurant-filter";
import { sortOrder } from "@/lib/restaurant-sort";
import { shouldSortByDistance } from "@/lib/distance-sort";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const q = new URL(req.url).searchParams;
  const latRaw = q.get("lat") ? Number(q.get("lat")) : null;
  const lonRaw = q.get("lon") ? Number(q.get("lon")) : null;
  const hasGeo = latRaw != null && lonRaw != null && Number.isFinite(latRaw) && Number.isFinite(lonRaw);
  const lat = hasGeo ? latRaw : null;
  const lon = hasGeo ? lonRaw : null;
  const sort = q.get("sort") || "rating";
  const districts = normalizeDistricts(q.getAll("district"));
  const minPrice = q.get("minPrice") ? Number(q.get("minPrice")) : null;
  const maxPrice = q.get("maxPrice") ? Number(q.get("maxPrice")) : null;
  const { minRating, maxDistance } = clampCriteria(q.get("minRating"), q.get("maxDistance"));
  const limit = Math.min(Math.max(Number(q.get("limit")) || 9, 1), 60);
  const offset = Math.max(Number(q.get("offset")) || 0, 0);

  const where: Prisma.RestaurantWhereInput = {};
  if (districts.length) where.OR = districts.flatMap(d => [{ district: { contains: d } }, { address: { contains: d } }]);
  if (minPrice != null) where.priceMin = { gte: minPrice };
  if (maxPrice != null) where.priceMax = { lte: maxPrice };
  if (minRating != null) where.rating = { gte: minRating };

  // Distance needs haversine in SQL BEFORE pagination. Reuse one raw path for
  // both distance sort and a max-distance bound; every value is bound.
  const useRaw = hasGeo && (shouldSortByDistance(sort, true) || maxDistance != null);
  if (useRaw) {
    const filters: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (districts.length) {
      const districtClauses = districts.map(d => Prisma.sql`("district" ILIKE ${`%${d}%`} OR "address" ILIKE ${`%${d}%`})`);
      filters.push(Prisma.sql`(${Prisma.join(districtClauses, " OR ")})`);
    }
    if (minPrice != null) filters.push(Prisma.sql`"priceMin" >= ${minPrice}`);
    if (maxPrice != null) filters.push(Prisma.sql`"priceMax" <= ${maxPrice}`);
    if (minRating != null) filters.push(Prisma.sql`"rating" >= ${minRating}`);
    const distance = Prisma.sql`(6371 * acos(LEAST(1, GREATEST(-1,
      COS(RADIANS(${lat})) * COS(RADIANS("lat")) * COS(RADIANS("lon") - RADIANS(${lon}))
      + SIN(RADIANS(${lat})) * SIN(RADIANS("lat"))))))`;
    if (maxDistance != null) filters.push(Prisma.sql`${distance} <= ${maxDistance}`);
    const whereSql = Prisma.join(filters, " AND ");
    const order = shouldSortByDistance(sort, true)
      ? Prisma.sql`"distanceKm" ASC, "id" ASC`
      : Prisma.sql`"rating" DESC, "priceMin" ASC, "id" ASC`;
    const rows = await prisma.$queryRaw<Array<Record<string, unknown> & { distanceKm: number }>>(
      Prisma.sql`SELECT *, ${distance} AS "distanceKm" FROM "Restaurant"
        WHERE ${whereSql} AND "lat" IS NOT NULL AND "lon" IS NOT NULL
        ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`
    );
    const restaurants = rows.map(r => ({ ...r, distanceKm: Math.round(Number(r.distanceKm) * 10) / 10 }));
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
    distanceKm: hasGeo && r.lat != null && r.lon != null
      ? Math.round(haversine(lat!, lon!, r.lat, r.lon) * 10) / 10 : null,
  }));
  return NextResponse.json({ restaurants: withDist, total, source: "Foody" });
}
