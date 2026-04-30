import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/notificaciones/sync
// Compara procesos nuevos y cambios recientes y genera notificaciones
// Llamar periódicamente desde un cron o desde el cliente

export async function GET() {
  try {
    const ahora = new Date();
    const hace30min = new Date(ahora.getTime() - 30 * 60 * 1000);
    const hace24h   = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);

    let creadas = 0;

    // ── 1. Procesos nuevos ────────────────────────────────────
    // Revisar ProcesoNuevo con fechaDeteccion en las últimas 24h
    const procesosNuevos = await prisma.procesoNuevo.findMany({
      where: { fechaDeteccion: { gte: hace24h } },
      orderBy: { fechaDeteccion: 'desc' },
      take: 50,
    });

    for (const p of procesosNuevos) {
      // Verificar si ya existe notificación para este proceso
      const existe = await prisma.notificacion.findFirst({
        where: {
          tipo: 'proceso_nuevo',
          codigoProceso: p.codigoProceso ?? undefined,
        },
      });

      if (!existe && p.codigoProceso) {
        await prisma.notificacion.create({
          data: {
            tipo: 'proceso_nuevo',
            titulo: `Nuevo proceso: ${p.entidad || 'Sin entidad'}`,
            descripcion: p.objeto
              ? (p.objeto.charAt(0).toUpperCase() + p.objeto.slice(1).toLowerCase()).slice(0, 120)
              : null,
            codigoProceso: p.codigoProceso,
            procesoId: p.procesoId ?? null,
            entidad: p.entidad ?? null,
            perfil: p.perfil ?? null,
            datos: {
              modalidad: p.modalidad,
              departamento: p.departamento,
              valor: p.valor,
              fuente: p.fuente,
              fechaVencimiento: p.fechaVencimiento,
              fechaPublicacion: p.fechaPublicacion,
            },
          },
        });
        creadas++;
      }
    }

    // ── 2. Cambios en cronograma ──────────────────────────────
    // Revisar ProcesoCronogramaSecop actualizado en los últimos 30 min
    const cronogramasActualizados = await prisma.procesoCronogramaSecop.findMany({
      where: { updatedAt: { gte: hace30min } },
      include: { proceso: { select: { codigoProceso: true, entidad: true, perfil: true } } },
      take: 30,
    });

    // Agrupar por proceso para no crear múltiples notificaciones del mismo proceso
    const procesosCronograma = new Map<number, typeof cronogramasActualizados[0]>();
    for (const cr of cronogramasActualizados) {
      if (!procesosCronograma.has(cr.procesoId)) {
        procesosCronograma.set(cr.procesoId, cr);
      }
    }

    for (const [procesoId, cr] of procesosCronograma) {
      const existe = await prisma.notificacion.findFirst({
        where: {
          tipo: 'cambio_cronograma',
          procesoId,
          creadoEn: { gte: hace30min },
        },
      });

      if (!existe) {
        await prisma.notificacion.create({
          data: {
            tipo: 'cambio_cronograma',
            titulo: `Cambio en cronograma: ${cr.proceso.entidad || 'Sin entidad'}`,
            descripcion: `Se actualizó la etapa "${cr.evento}" del proceso`,
            codigoProceso: cr.proceso.codigoProceso ?? null,
            procesoId,
            entidad: cr.proceso.entidad ?? null,
            perfil: cr.proceso.perfil ?? null,
            datos: { evento: cr.evento, valorTexto: cr.valorTexto },
          },
        });
        creadas++;
      }
    }

    // ── 3. Documentos nuevos ──────────────────────────────────
    // Revisar ProcesoDocumentoSecop creados en las últimas 24h
    const docsNuevos = await prisma.procesoDocumentoSecop.findMany({
      where: { fechaDetectado: { gte: hace24h } },
      include: { proceso: { select: { codigoProceso: true, entidad: true, perfil: true } } },
      take: 30,
    });

    // Agrupar por proceso
    const procesosDocs = new Map<number, typeof docsNuevos[0]>();
    for (const doc of docsNuevos) {
      if (!procesosDocs.has(doc.procesoId)) {
        procesosDocs.set(doc.procesoId, doc);
      }
    }

    for (const [procesoId, doc] of procesosDocs) {
      const countDocs = docsNuevos.filter(d => d.procesoId === procesoId).length;

      const existe = await prisma.notificacion.findFirst({
        where: {
          tipo: 'documento_nuevo',
          procesoId,
          creadoEn: { gte: hace24h },
        },
      });

      if (!existe) {
        await prisma.notificacion.create({
          data: {
            tipo: 'documento_nuevo',
            titulo: `${countDocs > 1 ? `${countDocs} documentos nuevos` : 'Documento nuevo'}: ${doc.proceso.entidad || 'Sin entidad'}`,
            descripcion: countDocs > 1
              ? `Se agregaron ${countDocs} documentos al proceso`
              : `Se agregó "${doc.nombre}" al proceso`,
            codigoProceso: doc.proceso.codigoProceso ?? null,
            procesoId,
            entidad: doc.proceso.entidad ?? null,
            perfil: doc.proceso.perfil ?? null,
            datos: { totalDocs: countDocs, primerDoc: doc.nombre },
          },
        });
        creadas++;
      }
    }

    // ── 4. Cambios de estado ──────────────────────────────────
    // Revisar ProcesoDetalleSecop actualizado recientemente con cambio de estado
    const detallesActualizados = await prisma.procesoDetalleSecop.findMany({
      where: { updatedAt: { gte: hace30min } },
      include: { proceso: { select: { codigoProceso: true, entidad: true, perfil: true, estadoFuente: true } } },
      take: 30,
    });

    for (const det of detallesActualizados) {
      if (!det.estado) continue;

      const existe = await prisma.notificacion.findFirst({
        where: {
          tipo: 'cambio_estado',
          procesoId: det.procesoId,
          creadoEn: { gte: hace30min },
        },
      });

      if (!existe) {
        await prisma.notificacion.create({
          data: {
            tipo: 'cambio_estado',
            titulo: `Cambio de estado: ${det.proceso.entidad || 'Sin entidad'}`,
            descripcion: `Estado actualizado a "${det.estado}"`,
            codigoProceso: det.proceso.codigoProceso ?? null,
            procesoId: det.procesoId,
            entidad: det.proceso.entidad ?? null,
            perfil: det.proceso.perfil ?? null,
            datos: { estadoNuevo: det.estado, fase: det.fase },
          },
        });
        creadas++;
      }
    }

    return NextResponse.json({
      ok: true,
      notificacionesCreadas: creadas,
      ejecutadoEn: ahora.toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/notificaciones/sync]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Error en sync' },
      { status: 500 }
    );
  }
}