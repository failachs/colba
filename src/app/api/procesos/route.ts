import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function parseIntSafe(v: string | null, fallback: number) {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isNaN(n) ? fallback : n;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseIntSafe(searchParams.get('page'), 1));
    const limit = Math.min(100, Math.max(1, parseIntSafe(searchParams.get('limit'), 30)));
    const query = searchParams.get('query')?.trim() ?? '';
    const perfil = searchParams.get('perfil')?.trim() ?? '';
    const fuente = searchParams.get('fuente')?.trim() ?? '';
    const dpto = searchParams.get('dpto')?.trim() ?? '';
    const estado = searchParams.get('estado')?.trim() ?? '';

    const where: Record<string, unknown> = {};

    if (query) {
      where.OR = [
        { entidad: { contains: query, mode: 'insensitive' } },
        { objeto: { contains: query, mode: 'insensitive' } },
        { codigoProceso: { contains: query, mode: 'insensitive' } },
        { nombre: { contains: query, mode: 'insensitive' } },
        { departamento: { contains: query, mode: 'insensitive' } },
        { perfil: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (perfil) {
      where.perfil = { contains: perfil, mode: 'insensitive' };
    }

    if (fuente) {
      where.aliasFuente = { equals: fuente.toUpperCase() };
    }

    if (dpto) {
      where.departamento = { contains: dpto, mode: 'insensitive' };
    }

    if (estado) {
      where.estadoFuente = { contains: estado, mode: 'insensitive' };
    }

    const [total, registros] = await Promise.all([
      prisma.proceso.count({ where }),
      prisma.proceso.findMany({
        where,
        orderBy: { fechaPublicacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          externalId: true,
          codigoProceso: true,
          nombre: true,
          entidad: true,
          objeto: true,
          fuente: true,
          aliasFuente: true,
          modalidad: true,
          perfil: true,
          departamento: true,
          estadoFuente: true,
          fechaPublicacion: true,
          fechaVencimiento: true,
          valor: true,
          linkDetalle: true,
          linkSecop: true,
          linkSecopReg: true,
          totalCronogramas: true,
          totalDocumentos: true,
          lastSyncedAt: true,
          rawJson: true,
        },
      }),
    ]);

    const procesos = registros.map((r: unknown) => {
      const row = r as Record<string, unknown>;
      let raw: Record<string, unknown> = {};

      try {
        raw = row.rawJson ? (JSON.parse(String(row.rawJson)) as Record<string, unknown>) : {};
      } catch {
        raw = {};
      }

      const rawDocs =
        Array.isArray(raw['documentos_proceso']) ? (raw['documentos_proceso'] as Record<string, unknown>[])
        : Array.isArray(raw['Documentos']) ? (raw['Documentos'] as Record<string, unknown>[])
        : Array.isArray(raw['documentos']) ? (raw['documentos'] as Record<string, unknown>[])
        : [];

      const documentos = rawDocs.map((d) => ({
        nombre: String(d['nombre'] ?? d['Nombre'] ?? ''),
        ruta: String(d['ruta'] ?? d['Ruta'] ?? d['url'] ?? d['Url'] ?? ''),
        url: String(d['ruta'] ?? d['Ruta'] ?? d['url'] ?? d['Url'] ?? ''),
      }));

      const rawCron =
        Array.isArray(raw['cronogramas']) ? (raw['cronogramas'] as Record<string, unknown>[])
        : Array.isArray(raw['Cronograma']) ? (raw['Cronograma'] as Record<string, unknown>[])
        : [];

      const cronogramas = rawCron.map((cr) => ({
        nombre: String(cr['label'] ?? cr['nombre'] ?? cr['Nombre'] ?? ''),
        fecha: String(cr['fecha'] ?? cr['Fecha'] ?? ''),
      }));

      return {
        id: row.externalId ? Number(row.externalId) : row.id,
        nombre: row.nombre ?? '',
        codigoProceso: row.codigoProceso ?? '',
        fuente: row.fuente ?? '',
        aliasFuente: row.aliasFuente ?? '',
        modalidad: row.modalidad ?? '',
        fechaPublicacion:
          row.fechaPublicacion instanceof Date
            ? row.fechaPublicacion.toISOString().replace('T', ' ').slice(0, 19)
            : row.fechaPublicacion ?? null,
        fechaVencimiento:
          row.fechaVencimiento instanceof Date
            ? row.fechaVencimiento.toISOString().replace('T', ' ').slice(0, 19)
            : row.fechaVencimiento ?? null,
        entidad: row.entidad ?? '',
        objeto: row.objeto ?? '',
        valor: row.valor != null ? Number(row.valor) : null,
        departamento: row.departamento ?? '',
        estado: row.estadoFuente ?? '',
        perfil: row.perfil ?? '',
        linkDetalle: row.linkDetalle ?? '',
        linkSecop: row.linkSecop ?? '',
        linkSecopReg: row.linkSecopReg ?? '',
        fuentes: [],
        totalCronogramas: row.totalCronogramas ?? 0,
        totalDocumentos: row.totalDocumentos ?? 0,
        cronogramas,
        documentos,
        _dbId: row.id,
        lastSyncedAt: row.lastSyncedAt ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      page,
      limit,
      total_resultados_api: total,
      total_resultados_filtrados: procesos.length,
      total_resultados_entregados: procesos.length,
      procesos,
    });
  } catch (error) {
    console.error('[GET /api/procesos]', error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error al consultar procesos.',
      },
      { status: 500 }
    );
  }
}