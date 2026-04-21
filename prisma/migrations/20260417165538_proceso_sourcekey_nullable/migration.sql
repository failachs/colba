-- DropIndex
DROP INDEX "Proceso_codigoProceso_aliasFuente_key";

-- AlterTable
ALTER TABLE "Proceso" ADD COLUMN     "sourceKey" TEXT;
