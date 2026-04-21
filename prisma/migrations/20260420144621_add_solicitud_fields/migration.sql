-- AlterTable
ALTER TABLE "Solicitud" ADD COLUMN     "aprobador" TEXT,
ADD COLUMN     "asignaciones" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "docData" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "fechaCierre" TIMESTAMP(3),
ADD COLUMN     "obsData" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "plataforma" TEXT,
ADD COLUMN     "procData" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "procStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "revisor" TEXT,
ADD COLUMN     "sede" TEXT;
