/*
  Warnings:

  - Added the required column `updatedAt` to the `exchange_rates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `gold_prices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "exchange_rates" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "gold_prices" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
