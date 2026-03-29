/*
  Warnings:

  - Added the required column `source` to the `exchange_rates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "exchange_rates" ADD COLUMN     "source" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "gold_prices_createdAt_idx" ON "gold_prices"("createdAt");
