/*
  Warnings:

  - A unique constraint covering the columns `[sourceKey]` on the table `Proceso` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Proceso_sourceKey_key" ON "Proceso"("sourceKey");
