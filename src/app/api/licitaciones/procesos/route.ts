import { NextRequest, NextResponse } from 'next/server';
import {
  liciGetPerfiles,
  filtrarPerfilesObjetivo,
  liciGetProcesos,
  normalizarProceso,
} from '@/lib/licitaciones-info';

function parseIntSafe(value: string | null, fallback: number) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isNaN(n) ? fallback : n;
}

function clean(value: string | null) {
  const v = value?.trim();
  return v ? v : undefined;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const todos = searchParams.get('todos') === '1';
    const page = Math.max(1, parseIntSafe(searchParams.get('page'), 1));
    const limit = Math.min(30, Math.max(1, parseIntSafe(searchParams.get('limit'), 30)));
    const max = Math.min(5000, Math.max(1, parseIntSafe(searchParams.get('max'), 3000)));

    const nuevos = searchParams.get('nuevos') === '1';
    const query = clean(searchParams.get('query'));
    const camposAdicionales = clean(searchParams.get('campos_adicionales')) ?? 'fechas,documentos,fuentes';

    const ascendingParam = searchParams.get('ascending');
    const ascending =
      ascendingParam === '1' ? (1 as const)
      : ascendingParam === '0' ? (0 as const)
      : undefined;

    const todosPerfiles = await liciGetPerfiles();
    const perfilesFiltrados = filtrarPerfilesObjetivo(todosPerfiles);

    if (perfilesFiltrados.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No se encontraron perfiles objetivo.',
          perfilesDisponibles: todosPerfiles.map((p) => p.nombre_perfil),
        },
        { status: 404 }
      );
    }

    const idPerfiles = perfilesFiltrados.map((p) => p.id_perfil);
    const nombresPerfiles = perfilesFiltrados.map((p) => p.nombre_perfil);
    const perfiles = idPerfiles.join(',');

    if (todos) {
      const acumulados: unknown[] = [];
      let paginasConsultadas = 0;
      let totalApi = 0;
      let paginaActual = 1;

      while (acumulados.length < max && paginaActual <= 100) {
        const resp = await liciGetProcesos({
          perfiles,
          page: paginaActual,
          limit,
          filtrarNuevos: nuevos,
          ...(query ? { query } : {}),
          ...(typeof ascending !== 'undefined' ? { ascending } : {}),
          ...(camposAdicionales ? { camposAdicionales } : {}),
        });

        const raw = Array.isArray(resp.data)
          ? resp.data
          : Array.isArray((resp as { procesos?: unknown[] }).procesos)
            ? (resp as { procesos: unknown[] }).procesos
            : [];

        if (paginaActual === 1) {
          totalApi =
            typeof (resp as { count?: number }).count === 'number'
              ? (resp as { count: number }).count
              : typeof resp.total === 'number'
                ? resp.total
                : raw.length;
        }

        acumulados.push(...raw);
        paginasConsultadas++;

        if (raw.length < limit) break;

        paginaActual++;
        await sleep(800);
      }

      const procesos = acumulados.slice(0, max).map((p) => normalizarProceso(p as never));

      return NextResponse.json({
        ok: true,
        page: 1,
        limit,
        todos: true,
        paginas_consultadas_api: paginasConsultadas,
        total_perfiles_disponibles: todosPerfiles.length,
        total_perfiles_usados: perfilesFiltrados.length,
        perfiles_usados: perfiles,
        nombres_perfiles_usados: nombresPerfiles,
        total_resultados_api: totalApi,
        total_resultados_filtrados: procesos.length,
        total_resultados_entregados: procesos.length,
        procesos,
      });
    }

    const resp = await liciGetProcesos({
      perfiles,
      page,
      limit,
      filtrarNuevos: nuevos,
      ...(query ? { query } : {}),
      ...(typeof ascending !== 'undefined' ? { ascending } : {}),
      ...(camposAdicionales ? { camposAdicionales } : {}),
    });

    const raw = Array.isArray(resp.data)
      ? resp.data
      : Array.isArray((resp as { procesos?: unknown[] }).procesos)
        ? (resp as { procesos: typeof resp.data }).procesos ?? []
        : [];

    const procesos = raw.map(normalizarProceso);

    const totalApi =
      typeof (resp as { count?: number }).count === 'number'
        ? (resp as { count: number }).count
        : typeof resp.total === 'number'
          ? resp.total
          : procesos.length;

    return NextResponse.json({
      ok: true,
      page,
      limit,
      todos: false,
      paginas_consultadas_api: 1,
      total_perfiles_disponibles: todosPerfiles.length,
      total_perfiles_usados: perfilesFiltrados.length,
      perfiles_usados: perfiles,
      nombres_perfiles_usados: nombresPerfiles,
      total_resultados_api: totalApi,
      total_resultados_filtrados: procesos.length,
      total_resultados_entregados: procesos.length,
      procesos,
    });
  } catch (error) {
    console.error('[api/licitaciones/procesos]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor.',
      },
      { status: 500 }
    );
  }
}