import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const foods = [
  { name: "Cơm trắng", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: "100g" },
  { name: "Phở bò", calories: 350, protein: 15, carbs: 45, fat: 12, servingSize: "1 tô" },
  { name: "Bánh mì", calories: 250, protein: 8, carbs: 40, fat: 6, servingSize: "1 ổ" },
  { name: "Trứng gà", calories: 155, protein: 13, carbs: 1.1, fat: 11, servingSize: "100g" },
  { name: "Thịt gà (ức)", calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: "100g" },
  { name: "Thịt bò", calories: 250, protein: 26, carbs: 0, fat: 15, servingSize: "100g" },
  { name: "Cá hồi", calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: "100g" },
  { name: "Tôm", calories: 99, protein: 24, carbs: 0.2, fat: 0.3, servingSize: "100g" },
  { name: "Đậu phụ", calories: 76, protein: 8, carbs: 1.9, fat: 4.8, servingSize: "100g" },
  { name: "Rau muống", calories: 19, protein: 2.6, carbs: 3.1, fat: 0.2, servingSize: "100g" },
  { name: "Chuối", calories: 89, protein: 1.1, carbs: 23, fat: 0.3, servingSize: "100g" },
  { name: "Táo", calories: 52, protein: 0.3, carbs: 14, fat: 0.2, servingSize: "100g" },
  { name: "Sữa tươi", calories: 42, protein: 3.4, carbs: 5, fat: 1, servingSize: "100ml" },
  { name: "Sữa chua", calories: 59, protein: 3.5, carbs: 4.7, fat: 3.3, servingSize: "100g" },
  { name: "Bơ", calories: 160, protein: 2, carbs: 9, fat: 15, servingSize: "100g" },
  { name: "Khoai tây", calories: 77, protein: 2, carbs: 17, fat: 0.1, servingSize: "100g" },
  { name: "Mì tôm", calories: 450, protein: 9, carbs: 60, fat: 18, servingSize: "1 gói" },
  { name: "Coca-Cola", calories: 42, protein: 0, carbs: 10.6, fat: 0, servingSize: "100ml" },
  { name: "Cà phê đen", calories: 2, protein: 0.3, carbs: 0, fat: 0, servingSize: "100ml" },
  { name: "Sinh tố bơ", calories: 180, protein: 2, carbs: 15, fat: 12, servingSize: "1 ly" },
];

async function main() {
  for (const f of foods) {
    await prisma.food.upsert({
      where: { id: `seed-${f.name}` },
      update: {},
      create: { id: `seed-${f.name}`, ...f, isCustom: false, userId: null },
    });
  }
  console.log(`Seeded ${foods.length} foods`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
