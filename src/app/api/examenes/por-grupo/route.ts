// src/app/api/examenes/por-grupo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { obtenerExamenes } from '@/lib/examenes-cache';

function parseIntSafe(v: unknown, fb: number) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isNaN(n) ? fb : n;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      grupo_exam,
      codmun,
      q,
      search,
      page: pageRaw,
      limit: limitRaw,
      export: exportAllRaw,
    } = body;

    const exportAll = exportAllRaw === true;
    const page = Math.max(1, parseIntSafe(pageRaw, 1));
    const limit = exportAll
      ? 999999
      : Math.min(200, Math.max(1, parseIntSafe(limitRaw, 30)));

    const textoBusqueda = String(q || search || '').trim().toLowerCase();

    if (!grupo_exam && !codmun && !textoBusqueda) {
      return NextResponse.json(
        { ok: false, error: 'Se requiere grupo_exam, codmun o búsqueda' },
        { status: 400 }
      );
    }

    const todos = await obtenerExamenes();

    let filtrados = todos;

    if (grupo_exam) {
      const g = String(grupo_exam).trim().toLowerCase();
      filtrados = filtrados.filter((r) =>
        String(r.cod_grupo_exam ?? '').toLowerCase().includes(g)
      );
    }

    if (codmun) {
      const c = String(codmun).trim().toLowerCase();
      filtrados = filtrados.filter((r) =>
        String(r.codmun ?? '').toLowerCase().includes(c)
      );
    }

    if (textoBusqueda) {
      filtrados = filtrados.filter((r) =>
        Object.values(r).some((v) =>
          String(v ?? '').toLowerCase().includes(textoBusqueda)
        )
      );
    }

    const total = filtrados.length;
    const totalPages = exportAll ? 1 : Math.max(1, Math.ceil(total / limit));
    const safePage = exportAll ? 1 : Math.min(page, totalPages);
    const data = exportAll
      ? filtrados
      : filtrados.slice((safePage - 1) * limit, safePage * limit);

    return NextResponse.json({
      ok: true,
      page: safePage,
      limit,
      total,
      totalPages,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error consultando exámenes por grupo',
      },
      { status: 500 }
    );
  }
}