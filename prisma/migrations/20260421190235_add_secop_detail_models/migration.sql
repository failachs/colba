-- CreateTable
CREATE TABLE "ProcesoDetalleSecop" (
    "id" SERIAL NOT NULL,
    "procesoId" INTEGER NOT NULL,
    "urlConsulta" TEXT,
    "urlFinal" TEXT,
    "titulo" TEXT,
    "estado" TEXT,
    "fase" TEXT,
    "tipoProceso" TEXT,
    "tipoContrato" TEXT,
    "justificacionModalidad" TEXT,
    "duracionContrato" TEXT,
    "fechaTerminacion" TIMESTAMP(3),
    "direccionEjecucion" TEXT,
    "codigoUnspsc" TEXT,
    "unspscAdicionales" JSONB,
    "esMipymes" BOOLEAN,
    "esPaa" BOOLEAN,
    "vigenciaPaa" TEXT,
    "misionVision" TEXT,
    "valorAdquisiciones" DOUBLE PRECISION,
    "valorTotalProceso" DOUBLE PRECISION,
    "cuestionarioJson" JSONB,
    "informacionPresupuestal" JSONB,
    "textoPlano" TEXT,
    "hashDetalle" TEXT,
    "capturadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcesoDetalleSecop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcesoCronogramaSecop" (
    "id" SERIAL NOT NULL,
    "procesoId" INTEGER NOT NULL,
    "evento" TEXT NOT NULL,
    "valorTexto" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "zonaHoraria" TEXT,
    "orden" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcesoCronogramaSecop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcesoDocumentoSecop" (
    "id" SERIAL NOT NULL,
    "procesoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "urlDocumento" TEXT,
    "tipoDocumento" TEXT,
    "extension" TEXT,
    "hashArchivo" TEXT,
    "rutaLocal" TEXT,
    "mimeType" TEXT,
    "tamanoBytes" INTEGER,
    "textoExtraido" TEXT,
    "descargado" BOOLEAN NOT NULL DEFAULT false,
    "procesado" BOOLEAN NOT NULL DEFAULT false,
    "fechaDetectado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcesoDocumentoSecop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcesoSnapshotSecop" (
    "id" SERIAL NOT NULL,
    "procesoId" INTEGER NOT NULL,
    "urlConsulta" TEXT,
    "hashContenido" TEXT,
    "payloadJson" JSONB NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcesoSnapshotSecop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcesoDetalleSecop_procesoId_key" ON "ProcesoDetalleSecop"("procesoId");

-- CreateIndex
CREATE INDEX "ProcesoDetalleSecop_estado_idx" ON "ProcesoDetalleSecop"("estado");

-- CreateIndex
CREATE INDEX "ProcesoDetalleSecop_capturadoEn_idx" ON "ProcesoDetalleSecop"("capturadoEn");

-- CreateIndex
CREATE INDEX "ProcesoCronogramaSecop_procesoId_idx" ON "ProcesoCronogramaSecop"("procesoId");

-- CreateIndex
CREATE INDEX "ProcesoCronogramaSecop_evento_idx" ON "ProcesoCronogramaSecop"("evento");

-- CreateIndex
CREATE INDEX "ProcesoDocumentoSecop_procesoId_idx" ON "ProcesoDocumentoSecop"("procesoId");

-- CreateIndex
CREATE INDEX "ProcesoDocumentoSecop_nombre_idx" ON "ProcesoDocumentoSecop"("nombre");

-- CreateIndex
CREATE INDEX "ProcesoDocumentoSecop_descargado_idx" ON "ProcesoDocumentoSecop"("descargado");

-- CreateIndex
CREATE INDEX "ProcesoDocumentoSecop_procesado_idx" ON "ProcesoDocumentoSecop"("procesado");

-- CreateIndex
CREATE INDEX "ProcesoSnapshotSecop_procesoId_idx" ON "ProcesoSnapshotSecop"("procesoId");

-- CreateIndex
CREATE INDEX "ProcesoSnapshotSecop_creadoEn_idx" ON "ProcesoSnapshotSecop"("creadoEn");

-- AddForeignKey
ALTER TABLE "ProcesoDetalleSecop" ADD CONSTRAINT "ProcesoDetalleSecop_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "Proceso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoCronogramaSecop" ADD CONSTRAINT "ProcesoCronogramaSecop_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "Proceso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoDocumentoSecop" ADD CONSTRAINT "ProcesoDocumentoSecop_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "Proceso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoSnapshotSecop" ADD CONSTRAINT "ProcesoSnapshotSecop_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "Proceso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
