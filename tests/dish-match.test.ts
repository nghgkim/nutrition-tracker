import { describe, it, expect } from "vitest";
import { matchRestaurantsForDish, type MatchableRestaurant } from "@/lib/dish-match";

const R = (name: string, cuisines: string | null = null, rating = 8): MatchableRestaurant => ({
  name, cuisines, rating, url: "https://www.foody.vn/" + name,
});

describe("matchRestaurantsForDish", () => {
  it("matches accent-insensitively on restaurant name", () => {
    const found = matchRestaurantsForDish("Cơm gà", [
      R("Cơm Gà Hải Nam - Nguyễn Tri Phương"),
      R("Quán cà phê khác", null, 9.5),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].name).toContain("Cơm Gà");
  });

  it("prefers a specific name match over an unrelated high-rated restaurant with the same cuisine", () => {
    const found = matchRestaurantsForDish("Bún bò Huế", [
      R("Bosgaurus Coffee Roasters", "Món Việt", 9.9),
      R("Bún Thịt Nướng Kiều Bảo", "Món Việt", 6.1),
    ]);
    expect(found[0].name).toContain("Bún Thịt");
  });

  it("uses cuisine as a weaker signal when the name does not match", () => {
    const found = matchRestaurantsForDish("Mì HongKong", [
      R("Quán Mì", null, 5),
      R("Cha Chaan Teng", "Món Trung Hoa", 9),
    ], 2);
    expect(found.map(r => r.name)).toContain("Quán Mì");
  });

  it("returns an empty array when no keyword matches", () => {
    expect(matchRestaurantsForDish("Nước ép dứa", [R("Quán Mì", "Món Việt")])).toEqual([]);
  });

  it("respects the requested limit", () => {
    const found = matchRestaurantsForDish("Cơm gà", [
      R("Cơm Gà 1"), R("Cơm Gà 2"), R("Cơm Gà 3"),
    ], 2);
    expect(found).toHaveLength(2);
  });
});
