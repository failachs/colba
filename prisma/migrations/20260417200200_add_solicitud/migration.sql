-- CreateTable
CREATE TABLE "Solicitud" (
    "id" SERIAL NOT NULL,
    "procesoId" INTEGER,
    "procesoSourceKey" TEXT,
    "externalId" TEXT,
    "codigoProceso" TEXT,
    "nombreProceso" TEXT,
    "entidad" TEXT,
    "objeto" TEXT,
    "fuente" TEXT,
    "aliasFuente" TEXT,
    "modalidad" TEXT,
    "perfil" TEXT,
    "departamento" TEXT,
    "estadoFuente" TEXT,
    "fechaPublicacion" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "valor" DOUBLE PRECISION,
    "linkDetalle" TEXT,
    "linkSecop" TEXT,
    "linkSecopReg" TEXT,
    "estadoSolicitud" TEXT NOT NULL DEFAULT 'Abierta',
    "observacion" TEXT,
    "usuarioRegistro" TEXT,
    "emailRegistro" TEXT,
    "cargoRegistro" TEXT,
    "entidadRegistro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Solicitud_estadoSolicitud_idx" ON "Solicitud"("estadoSolicitud");

-- CreateIndex
CREATE INDEX "Solicitud_codigoProceso_idx" ON "Solicitud"("codigoProceso");

-- CreateIndex
CREATE INDEX "Solicitud_procesoSourceKey_idx" ON "Solicitud"("procesoSourceKey");
