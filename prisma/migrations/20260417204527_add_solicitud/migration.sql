/*
  Warnings:

  - Made the column `sourceKey` on table `Proceso` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Proceso" ALTER COLUMN "sourceKey" SET NOT NULL;
