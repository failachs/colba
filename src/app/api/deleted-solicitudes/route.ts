// src/app/api/deleted-solicitudes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function str(v: unknown, fb = '') { return v != null ? String(v) : fb; }
function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function serializeDeleted(s: Record<string, unknown>) {
  return {
    ...s,
    valor:            s.valor != null ? Number(s.valor) : null,
    fechaPublicacion: s.fechaPublicacion instanceof Date ? s.fechaPublicacion.toISOString() : (s.fechaPublicacion ?? null),
    fechaVencimiento: s.fechaVencimiento instanceof Date ? s.fechaVencimiento.toISOString() : (s.fechaVencimiento ?? null),
    fechaCierre:      s.fechaCierre      instanceof Date ? s.fechaCierre.toISOString()      : (s.fechaCierre      ?? null),
    createdAt:        s.createdAt        instanceof Date ? s.createdAt.toISOString()        : (s.createdAt        ?? null),
    updatedAt:        s.updatedAt        instanceof Date ? s.updatedAt.toISOString()        : (s.updatedAt        ?? null),
    deletedAt:        s.deletedAt        instanceof Date ? s.deletedAt.toISOString()        : s.deletedAt,
  };
}

// ── GET /api/deleted-solicitudes ─────────────────────────────────────────────
export async function GET() {
  try {
    const registros = await prisma.deletedSolicitud.findMany({
      orderBy: { deletedAt: 'desc' },
    });

    return NextResponse.json({
      ok: true,
      solicitudes: registros.map((s: unknown) =>
        serializeDeleted(s as Record<string, unknown>)
      ),
    });
  } catch (err) {
    console.error('[GET /api/deleted-solicitudes]', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    );
  }
}

// ── PATCH /api/deleted-solicitudes — recuperar solicitud ─────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'id es requerido' }, { status: 400 });
    }

    const deleted = await prisma.deletedSolicitud.findUnique({
      where: { id: Number(id) },
    });

    if (!deleted) {
      return NextResponse.json({ ok: false, error: 'Registro no encontrado' }, { status: 404 });
    }

    const originalId = deleted.originalId;
    let idToUse: number | undefined = undefined;

    if (originalId) {
      const existe = await prisma.solicitud.findUnique({ where: { id: originalId } });
      if (!existe) idToUse = originalId;
    }

    const restored = await prisma.solicitud.create({
      data: {
        ...(idToUse ? { id: idToUse } : {}),
        procesoId:        deleted.procesoId,
        procesoSourceKey: str(deleted.procesoSourceKey),
        externalId:       deleted.externalId,
        codigoProceso:    str(deleted.codigoProceso),
        nombreProceso:    str(deleted.nombreProceso),
        entidad:          str(deleted.entidad),
        objeto:           str(deleted.objeto),
        fuente:           str(deleted.fuente),
        aliasFuente:      str(deleted.aliasFuente),
        modalidad:        str(deleted.modalidad),
        perfil:           str(deleted.perfil),
        departamento:     str(deleted.departamento),
        estadoFuente:     str(deleted.estadoFuente),
        fechaPublicacion: deleted.fechaPublicacion ? toDate(deleted.fechaPublicacion) : null,
        fechaVencimiento: deleted.fechaVencimiento ? toDate(deleted.fechaVencimiento) : null,
        valor:            deleted.valor,
        linkDetalle:      str(deleted.linkDetalle),
        linkSecop:        str(deleted.linkSecop),
        linkSecopReg:     str(deleted.linkSecopReg),
        estadoSolicitud:  str(deleted.estadoSolicitud) || 'En revisión',
        observacion:      deleted.observacion,
        ciudad:           str(deleted.ciudad),
        sede:             str(deleted.sede),
        plataforma:       str(deleted.plataforma),
        fechaCierre:      deleted.fechaCierre ? toDate(deleted.fechaCierre) : null,
        procStep:         deleted.procStep ?? 0,
        procData:         deleted.procData ?? {},
        obsData:          deleted.obsData ?? [],
        docData:          deleted.docData ?? [],
        asignaciones:     deleted.asignaciones ?? [],
        revisor:          str(deleted.revisor),
        aprobador:        str(deleted.aprobador),
        usuarioRegistro:  str(deleted.usuarioRegistro),
        emailRegistro:    str(deleted.emailRegistro),
        cargoRegistro:    str(deleted.cargoRegistro),
        entidadRegistro:  str(deleted.entidadRegistro),
      },
    });

    await prisma.deletedSolicitud.delete({ where: { id: Number(id) } });

    return NextResponse.json({ ok: true, solicitud: restored });

  } catch (err) {
    console.error('[PATCH /api/deleted-solicitudes]', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    );
  }
}