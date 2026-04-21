-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "cedula" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "entidadGrupo" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "firmaDigital" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletedUser" (
    "id" SERIAL NOT NULL,
    "originalUserId" INTEGER,
    "cedula" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "entidadGrupo" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "firmaDigital" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedByUsuario" TEXT,
    "deletedByEmail" TEXT,
    "deletedByCargo" TEXT,

    CONSTRAINT "DeletedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proceso" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT,
    "codigoProceso" TEXT,
    "nombre" TEXT,
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
    "totalCronogramas" INTEGER NOT NULL DEFAULT 0,
    "totalDocumentos" INTEGER NOT NULL DEFAULT 0,
    "rawJson" TEXT,
    "hashContenido" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Proceso_externalId_key" ON "Proceso"("externalId");

-- CreateIndex
CREATE INDEX "Proceso_codigoProceso_idx" ON "Proceso"("codigoProceso");

-- CreateIndex
CREATE INDEX "Proceso_perfil_idx" ON "Proceso"("perfil");

-- CreateIndex
CREATE INDEX "Proceso_aliasFuente_idx" ON "Proceso"("aliasFuente");

-- CreateIndex
CREATE INDEX "Proceso_departamento_idx" ON "Proceso"("departamento");

-- CreateIndex
CREATE INDEX "Proceso_estadoFuente_idx" ON "Proceso"("estadoFuente");

-- CreateIndex
CREATE INDEX "Proceso_fechaPublicacion_idx" ON "Proceso"("fechaPublicacion");

-- CreateIndex
CREATE INDEX "Proceso_fechaVencimiento_idx" ON "Proceso"("fechaVencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "Proceso_codigoProceso_aliasFuente_key" ON "Proceso"("codigoProceso", "aliasFuente");
