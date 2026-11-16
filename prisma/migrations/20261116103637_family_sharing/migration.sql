-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shareExercise" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareFinance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareWeight" BOOLEAN NOT NULL DEFAULT false;
