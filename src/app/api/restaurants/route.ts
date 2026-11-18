import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { haversine } from "@/lib/geo";
import { filterByPrice } from "@/lib/restaurant-filter";
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const lat = q.get("lat") ? Number(q.get("lat")) : null;
  const lon = q.get("lon") ? Number(q.get("lon")) : null;
  const district = q.get("district");
  const minPrice = q.get("minPrice") ? Number(q.get("minPrice")) : null;
  const maxPrice = q.get("maxPrice") ? Number(q.get("maxPrice")) : null;
  let list = await prisma.restaurant.findMany();
  if (district) list = list.filter(r => r.district?.includes(district) || r.address.includes(district));
  list = filterByPrice(list, minPrice, maxPrice);
  const withDist = list.map(r => ({
    ...r,
    distanceKm: (lat != null && lon != null && r.lat != null && r.lon != null)
      ? Math.round(haversine(lat, lon, r.lat, r.lon) * 10) / 10 : null,
  }));
  if (lat != null && lon != null) withDist.sort((a,b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  return NextResponse.json({ restaurants: withDist, source: "Foody" });
}
