import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const foods = [
  // === Cơm & bún ===
  { name: "Cơm trắng", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: "100g" },
  { name: "Cơm tấm", calories: 520, protein: 22, carbs: 65, fat: 18, servingSize: "1 đĩa" },
  { name: "Cơm gà", calories: 580, protein: 28, carbs: 70, fat: 18, servingSize: "1 đĩa" },
  { name: "Cơm sườn", calories: 620, protein: 26, carbs: 72, fat: 22, servingSize: "1 đĩa" },
  { name: "Cơm chiên", calories: 250, protein: 6, carbs: 35, fat: 9, servingSize: "100g" },
  { name: "Cơm rang", calories: 230, protein: 5, carbs: 32, fat: 8, servingSize: "100g" },
  { name: "Phở bò", calories: 350, protein: 15, carbs: 45, fat: 12, servingSize: "1 tô" },
  { name: "Phở gà", calories: 320, protein: 18, carbs: 42, fat: 9, servingSize: "1 tô" },
  { name: "Bún bò Huế", calories: 420, protein: 18, carbs: 50, fat: 15, servingSize: "1 tô" },
  { name: "Bún riêu", calories: 380, protein: 16, carbs: 48, fat: 12, servingSize: "1 tô" },
  { name: "Bún chả", calories: 450, protein: 20, carbs: 52, fat: 16, servingSize: "1 phần" },
  { name: "Bún thịt nướng", calories: 480, protein: 22, carbs: 55, fat: 18, servingSize: "1 phần" },
  { name: "Bún đậu mắm tôm", calories: 520, protein: 24, carbs: 48, fat: 24, servingSize: "1 phần" },
  { name: "Bún mắm", calories: 400, protein: 16, carbs: 50, fat: 14, servingSize: "1 tô" },
  { name: "Bún cá", calories: 360, protein: 18, carbs: 46, fat: 10, servingSize: "1 tô" },
  { name: "Hủ tiếu", calories: 380, protein: 14, carbs: 52, fat: 11, servingSize: "1 tô" },
  { name: "Mì Quảng", calories: 410, protein: 17, carbs: 50, fat: 14, servingSize: "1 tô" },
  { name: "Cao lầu", calories: 430, protein: 18, carbs: 52, fat: 15, servingSize: "1 tô" },
  { name: "Mì vằn thắn", calories: 400, protein: 15, carbs: 50, fat: 13, servingSize: "1 tô" },

  // === Bánh ===
  { name: "Bánh mì", calories: 250, protein: 8, carbs: 40, fat: 6, servingSize: "1 ổ" },
  { name: "Bánh cuốn", calories: 280, protein: 10, carbs: 42, fat: 8, servingSize: "1 đĩa" },
  { name: "Bánh xèo", calories: 320, protein: 12, carbs: 35, fat: 14, servingSize: "1 cái" },
  { name: "Bánh khọt", calories: 280, protein: 10, carbs: 32, fat: 12, servingSize: "1 đĩa" },
  { name: "Bánh bột lọc", calories: 260, protein: 8, carbs: 40, fat: 7, servingSize: "1 đĩa" },
  { name: "Bánh bèo", calories: 240, protein: 7, carbs: 38, fat: 6, servingSize: "1 đĩa" },
  { name: "Bánh nậm", calories: 250, protein: 8, carbs: 38, fat: 7, servingSize: "1 đĩa" },
  { name: "Bánh ít", calories: 200, protein: 4, carbs: 35, fat: 5, servingSize: "1 cái" },
  { name: "Bánh tét", calories: 320, protein: 8, carbs: 45, fat: 12, servingSize: "1 lát" },
  { name: "Bánh chưng", calories: 300, protein: 8, carbs: 42, fat: 11, servingSize: "1 lát" },
  { name: "Bánh tráng nướng", calories: 180, protein: 6, carbs: 25, fat: 6, servingSize: "1 cái" },
  { name: "Bánh tráng trộn", calories: 220, protein: 6, carbs: 30, fat: 8, servingSize: "1 phần" },

  // === Món cuốn & chiên ===
  { name: "Gỏi cuốn", calories: 120, protein: 8, carbs: 15, fat: 3, servingSize: "1 cuốn" },
  { name: "Chả giò", calories: 180, protein: 8, carbs: 18, fat: 9, servingSize: "1 cuốn" },
  { name: "Nem nướng", calories: 200, protein: 12, carbs: 15, fat: 10, servingSize: "1 cuốn" },
  { name: "Bò lá lốt", calories: 220, protein: 14, carbs: 8, fat: 15, servingSize: "1 phần" },
  { name: "Chả cá", calories: 200, protein: 18, carbs: 5, fat: 12, servingSize: "100g" },
  { name: "Chả lụa", calories: 180, protein: 16, carbs: 2, fat: 12, servingSize: "100g" },
  { name: "Chả bò", calories: 200, protein: 18, carbs: 2, fat: 13, servingSize: "100g" },
  { name: "Giò thủ", calories: 220, protein: 15, carbs: 3, fat: 16, servingSize: "100g" },

  // === Thịt & cá ===
  { name: "Thịt gà (ức)", calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: "100g" },
  { name: "Thịt bò", calories: 250, protein: 26, carbs: 0, fat: 15, servingSize: "100g" },
  { name: "Thịt heo", calories: 242, protein: 27, carbs: 0, fat: 14, servingSize: "100g" },
  { name: "Thịt kho tàu", calories: 320, protein: 20, carbs: 8, fat: 24, servingSize: "100g" },
  { name: "Cá hồi", calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: "100g" },
  { name: "Cá basa", calories: 120, protein: 18, carbs: 0, fat: 5, servingSize: "100g" },
  { name: "Cá thu", calories: 200, protein: 22, carbs: 0, fat: 12, servingSize: "100g" },
  { name: "Cá kho tộ", calories: 220, protein: 20, carbs: 5, fat: 13, servingSize: "100g" },
  { name: "Tôm", calories: 99, protein: 24, carbs: 0.2, fat: 0.3, servingSize: "100g" },
  { name: "Mực", calories: 92, protein: 18, carbs: 3, fat: 1.4, servingSize: "100g" },
  { name: "Cua", calories: 87, protein: 17, carbs: 0, fat: 1.5, servingSize: "100g" },
  { name: "Ốc", calories: 70, protein: 12, carbs: 2, fat: 1, servingSize: "100g" },

  // === Trứng & đậu ===
  { name: "Trứng gà", calories: 155, protein: 13, carbs: 1.1, fat: 11, servingSize: "100g" },
  { name: "Trứng vịt", calories: 185, protein: 13, carbs: 1.5, fat: 14, servingSize: "100g" },
  { name: "Trứng cút", calories: 158, protein: 13, carbs: 0.4, fat: 11, servingSize: "100g" },
  { name: "Đậu phụ", calories: 76, protein: 8, carbs: 1.9, fat: 4.8, servingSize: "100g" },
  { name: "Đậu hũ chiên", calories: 200, protein: 10, carbs: 5, fat: 15, servingSize: "100g" },
  { name: "Đậu xanh", calories: 347, protein: 24, carbs: 63, fat: 1.2, servingSize: "100g" },
  { name: "Đậu đen", calories: 341, protein: 21, carbs: 63, fat: 1.4, servingSize: "100g" },
  { name: "Đậu đỏ", calories: 333, protein: 20, carbs: 60, fat: 0.9, servingSize: "100g" },

  // === Rau & canh ===
  { name: "Rau muống", calories: 19, protein: 2.6, carbs: 3.1, fat: 0.2, servingSize: "100g" },
  { name: "Rau lang", calories: 30, protein: 3, carbs: 5, fat: 0.3, servingSize: "100g" },
  { name: "Cải xanh", calories: 25, protein: 2.5, carbs: 4, fat: 0.3, servingSize: "100g" },
  { name: "Bắp cải", calories: 25, protein: 1.3, carbs: 5.8, fat: 0.1, servingSize: "100g" },
  { name: "Su su", calories: 19, protein: 0.8, carbs: 4.5, fat: 0.1, servingSize: "100g" },
  { name: "Mướp", calories: 20, protein: 1, carbs: 4.4, fat: 0.2, servingSize: "100g" },
  { name: "Khổ qua", calories: 17, protein: 1, carbs: 3.7, fat: 0.2, servingSize: "100g" },
  { name: "Cà tím", calories: 25, protein: 1, carbs: 6, fat: 0.2, servingSize: "100g" },
  { name: "Đậu bắp", calories: 33, protein: 2, carbs: 7.5, fat: 0.2, servingSize: "100g" },
  { name: "Canh chua", calories: 80, protein: 6, carbs: 8, fat: 3, servingSize: "1 tô" },
  { name: "Canh khổ qua", calories: 60, protein: 4, carbs: 6, fat: 2, servingSize: "1 tô" },
  { name: "Canh rau", calories: 40, protein: 2, carbs: 5, fat: 1.5, servingSize: "1 tô" },
  { name: "Canh bí", calories: 50, protein: 3, carbs: 6, fat: 2, servingSize: "1 tô" },
  { name: "Canh chua cá", calories: 120, protein: 12, carbs: 8, fat: 5, servingSize: "1 tô" },

  // === Trái cây ===
  { name: "Chuối", calories: 89, protein: 1.1, carbs: 23, fat: 0.3, servingSize: "100g" },
  { name: "Táo", calories: 52, protein: 0.3, carbs: 14, fat: 0.2, servingSize: "100g" },
  { name: "Xoài", calories: 60, protein: 0.8, carbs: 15, fat: 0.4, servingSize: "100g" },
  { name: "Thanh long", calories: 60, protein: 1.2, carbs: 13, fat: 0.4, servingSize: "100g" },
  { name: "Vú sữa", calories: 67, protein: 1.5, carbs: 14, fat: 1, servingSize: "100g" },
  { name: "Mít", calories: 95, protein: 1.7, carbs: 23, fat: 0.6, servingSize: "100g" },
  { name: "Sầu riêng", calories: 147, protein: 1.5, carbs: 27, fat: 5.3, servingSize: "100g" },
  { name: "Măng cụt", calories: 73, protein: 0.4, carbs: 18, fat: 0.6, servingSize: "100g" },
  { name: "Chôm chôm", calories: 82, protein: 0.9, carbs: 21, fat: 0.2, servingSize: "100g" },
  { name: "Nhãn", calories: 60, protein: 1.3, carbs: 15, fat: 0.1, servingSize: "100g" },
  { name: "Vải", calories: 66, protein: 0.8, carbs: 17, fat: 0.4, servingSize: "100g" },
  { name: "Cam", calories: 47, protein: 0.9, carbs: 12, fat: 0.1, servingSize: "100g" },
  { name: "Bưởi", calories: 42, protein: 0.8, carbs: 11, fat: 0.1, servingSize: "100g" },
  { name: "Dứa", calories: 50, protein: 0.5, carbs: 13, fat: 0.1, servingSize: "100g" },
  { name: "Đu đủ", calories: 43, protein: 0.5, carbs: 11, fat: 0.3, servingSize: "100g" },
  { name: "Dưa hấu", calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2, servingSize: "100g" },
  { name: "Ổi", calories: 68, protein: 2.6, carbs: 14, fat: 1, servingSize: "100g" },
  { name: "Mận", calories: 46, protein: 0.7, carbs: 11, fat: 0.3, servingSize: "100g" },
  { name: "Đào", calories: 39, protein: 0.9, carbs: 10, fat: 0.3, servingSize: "100g" },
  { name: "Lê", calories: 57, protein: 0.4, carbs: 15, fat: 0.1, servingSize: "100g" },
  { name: "Nho", calories: 69, protein: 0.7, carbs: 18, fat: 0.2, servingSize: "100g" },
  { name: "Dâu tây", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, servingSize: "100g" },

  // === Đồ uống ===
  { name: "Sữa tươi", calories: 42, protein: 3.4, carbs: 5, fat: 1, servingSize: "100ml" },
  { name: "Sữa chua", calories: 59, protein: 3.5, carbs: 4.7, fat: 3.3, servingSize: "100g" },
  { name: "Cà phê đen", calories: 2, protein: 0.3, carbs: 0, fat: 0, servingSize: "100ml" },
  { name: "Cà phê sữa đá", calories: 80, protein: 2, carbs: 12, fat: 3, servingSize: "1 ly" },
  { name: "Trà đá", calories: 0, protein: 0, carbs: 0, fat: 0, servingSize: "1 ly" },
  { name: "Trà sữa", calories: 120, protein: 2, carbs: 18, fat: 4, servingSize: "100ml" },
  { name: "Nước mía", calories: 70, protein: 0, carbs: 17, fat: 0, servingSize: "100ml" },
  { name: "Nước dừa", calories: 19, protein: 0.7, carbs: 4, fat: 0.2, servingSize: "100ml" },
  { name: "Nước cam", calories: 45, protein: 0.7, carbs: 10, fat: 0.2, servingSize: "100ml" },
  { name: "Coca-Cola", calories: 42, protein: 0, carbs: 10.6, fat: 0, servingSize: "100ml" },
  { name: "Bia", calories: 43, protein: 0.5, carbs: 3.6, fat: 0, servingSize: "100ml" },
  { name: "Rượu vang", calories: 83, protein: 0.1, carbs: 2.6, fat: 0, servingSize: "100ml" },

  // === Snack & đồ ngọt ===
  { name: "Bánh flan", calories: 150, protein: 4, carbs: 20, fat: 6, servingSize: "1 cái" },
  { name: "Chè", calories: 180, protein: 3, carbs: 30, fat: 5, servingSize: "1 ly" },
  { name: "Kem", calories: 207, protein: 3.5, carbs: 24, fat: 11, servingSize: "100g" },
  { name: "Bánh quy", calories: 480, protein: 6, carbs: 65, fat: 22, servingSize: "100g" },
  { name: "Sô cô la", calories: 546, protein: 4.9, carbs: 61, fat: 31, servingSize: "100g" },
  { name: "Kẹo", calories: 380, protein: 0, carbs: 95, fat: 0, servingSize: "100g" },
  { name: "Bánh trung thu", calories: 400, protein: 6, carbs: 50, fat: 20, servingSize: "1 cái" },
  { name: "Bánh pía", calories: 350, protein: 5, carbs: 45, fat: 17, servingSize: "1 cái" },
  { name: "Bánh bông lan", calories: 320, protein: 6, carbs: 45, fat: 13, servingSize: "1 cái" },
  { name: "Bánh su kem", calories: 280, protein: 5, carbs: 30, fat: 15, servingSize: "1 cái" },

  // === Tinh bột & phụ ===
  { name: "Khoai tây", calories: 77, protein: 2, carbs: 17, fat: 0.1, servingSize: "100g" },
  { name: "Khoai lang", calories: 86, protein: 1.6, carbs: 20, fat: 0.1, servingSize: "100g" },
  { name: "Khoai môn", calories: 118, protein: 1.5, carbs: 28, fat: 0.2, servingSize: "100g" },
  { name: "Bắp", calories: 86, protein: 3.3, carbs: 19, fat: 1.4, servingSize: "100g" },
  { name: "Mì tôm", calories: 450, protein: 9, carbs: 60, fat: 18, servingSize: "1 gói" },
  { name: "Mì Ý", calories: 131, protein: 5, carbs: 25, fat: 1.1, servingSize: "100g" },
  { name: "Nui", calories: 131, protein: 5, carbs: 25, fat: 1.1, servingSize: "100g" },
  { name: "Bún khô", calories: 350, protein: 8, carbs: 78, fat: 0.5, servingSize: "100g" },
  { name: "Bánh phở khô", calories: 350, protein: 8, carbs: 78, fat: 0.5, servingSize: "100g" },
  { name: "Yến mạch", calories: 389, protein: 17, carbs: 66, fat: 7, servingSize: "100g" },
  { name: "Gạo lứt", calories: 111, protein: 2.6, carbs: 23, fat: 0.9, servingSize: "100g" },
  { name: "Bơ", calories: 160, protein: 2, carbs: 9, fat: 15, servingSize: "100g" },
  { name: "Dầu ăn", calories: 884, protein: 0, carbs: 0, fat: 100, servingSize: "100ml" },
  { name: "Đường", calories: 387, protein: 0, carbs: 100, fat: 0, servingSize: "100g" },
  { name: "Mật ong", calories: 304, protein: 0.3, carbs: 82, fat: 0, servingSize: "100g" },
  { name: "Nước mắm", calories: 35, protein: 5, carbs: 4, fat: 0, servingSize: "100ml" },
  { name: "Tương", calories: 50, protein: 6, carbs: 5, fat: 1, servingSize: "100ml" },
  { name: "Muối", calories: 0, protein: 0, carbs: 0, fat: 0, servingSize: "100g" },
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
