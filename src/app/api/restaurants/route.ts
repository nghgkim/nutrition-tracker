import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { haversine } from "@/lib/geo";
import { filterByPrice } from "@/lib/restaurant-filter";
import { sortOrder } from "@/lib/restaurant-sort";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const lat = q.get("lat") ? Number(q.get("lat")) : null;
  const lon = q.get("lon") ? Number(q.get("lon")) : null;
  const district = q.get("district");
  const minPrice = q.get("minPrice") ? Number(q.get("minPrice")) : null;
  const maxPrice = q.get("maxPrice") ? Number(q.get("maxPrice")) : null;
  const limit = Math.min(Math.max(Number(q.get("limit")) || 9, 1), 60);
  const offset = Math.max(Number(q.get("offset")) || 0, 0);

  const where: Prisma.RestaurantWhereInput = {};
  if (district) where.OR = [{ district: { contains: district } }, { address: { contains: district } }];
  if (minPrice != null) where.priceMin = { gte: minPrice };
  if (maxPrice != null) where.priceMax = { lte: maxPrice };

  const [list, total] = await prisma.$transaction([
    prisma.restaurant.findMany({ where, take: limit, skip: offset, orderBy: sortOrder(q.get("sort") || "rating") }),
    prisma.restaurant.count({ where }),
  ]);
  // Pure helper stays as a second line of defence for price semantics.
  const priced = filterByPrice(list, minPrice, maxPrice);
  const withDist = priced.map(r => ({
    ...r,
    distanceKm: (lat != null && lon != null && r.lat != null && r.lon != null)
      ? Math.round(haversine(lat, lon, r.lat, r.lon) * 10) / 10 : null,
  }));
  if (lat != null && lon != null) withDist.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  return NextResponse.json({ restaurants: withDist, total, source: "Foody" });
}
