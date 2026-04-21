-- AlterTable
ALTER TABLE "DeletedSolicitud" ADD COLUMN     "causalCierre" TEXT,
ADD COLUMN     "fechaAperturaSqr" TIMESTAMP(3),
ADD COLUMN     "fechaCierreSqr" TIMESTAMP(3),
ADD COLUMN     "resultadoFinal" TEXT,
ADD COLUMN     "sqrCerrada" BOOLEAN,
ADD COLUMN     "sqrCreada" BOOLEAN,
ADD COLUMN     "sqrError" TEXT,
ADD COLUMN     "sqrNumero" TEXT;

-- AlterTable
ALTER TABLE "Solicitud" ADD COLUMN     "causalCierre" TEXT,
ADD COLUMN     "fechaAperturaSqr" TIMESTAMP(3),
ADD COLUMN     "fechaCierreSqr" TIMESTAMP(3),
ADD COLUMN     "resultadoFinal" TEXT,
ADD COLUMN     "sqrCerrada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sqrCreada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sqrError" TEXT,
ADD COLUMN     "sqrNumero" TEXT,
ALTER COLUMN "estadoSolicitud" SET DEFAULT 'En revisión';

-- CreateIndex
CREATE INDEX "Solicitud_sqrNumero_idx" ON "Solicitud"("sqrNumero");

-- CreateIndex
CREATE INDEX "Solicitud_sqrCreada_idx" ON "Solicitud"("sqrCreada");

-- CreateIndex
CREATE INDEX "Solicitud_sqrCerrada_idx" ON "Solicitud"("sqrCerrada");
