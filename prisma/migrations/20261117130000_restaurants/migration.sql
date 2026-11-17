CREATE TABLE IF NOT EXISTS "Restaurant" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "photoUrl" TEXT,
  "url" TEXT NOT NULL,
  "lat" DOUBLE PRECISION,
  "lon" DOUBLE PRECISION,
  "city" TEXT NOT NULL DEFAULT 'TP.HCM',
  "source" TEXT NOT NULL DEFAULT 'Foody',
  "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Restaurant_externalId_key" ON "Restaurant"("externalId");
