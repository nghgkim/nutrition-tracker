-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "fundSource" TEXT NOT NULL DEFAULT 'personal';

-- AlterTable
ALTER TABLE "Family" ADD COLUMN     "householdBudget" DOUBLE PRECISION NOT NULL DEFAULT 10000000;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "personalBudget" DOUBLE PRECISION NOT NULL DEFAULT 2000000;

-- CreateTable
CREATE TABLE "BudgetAlert" (
    "id" TEXT NOT NULL,
    "budgetKey" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calories" INTEGER NOT NULL DEFAULT 300,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAlert_budgetKey_month_threshold_key" ON "BudgetAlert"("budgetKey", "month", "threshold");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseGoal_userId_key" ON "ExerciseGoal"("userId");

-- AddForeignKey
ALTER TABLE "ExerciseGoal" ADD CONSTRAINT "ExerciseGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
