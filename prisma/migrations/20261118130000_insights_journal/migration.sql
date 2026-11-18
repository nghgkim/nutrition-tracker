ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "priceMin" DOUBLE PRECISION;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "priceMax" DOUBLE PRECISION;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "openHours" TEXT;
CREATE TABLE IF NOT EXISTS "JournalEntry" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "date" DATE NOT NULL,
  "note" TEXT, "mood" TEXT, "energy" INTEGER, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JournalEntry_userId_date_key" ON "JournalEntry"("userId","date");
CREATE TABLE IF NOT EXISTS "MealPlan" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "week" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MealPlan_userId_key" ON "MealPlan"("userId");
