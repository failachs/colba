// src/app/api/examenes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { obtenerExamenes } from '@/lib/examenes-cache';

function parseIntSafe(v: string | null, fb: number) {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isNaN(n) ? fb : n;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const exportAll = searchParams.get('export') === 'true';
    const page  = Math.max(1, parseIntSafe(searchParams.get('page'), 1));
    const limit = exportAll
      ? 999999
      : Math.min(200, Math.max(1, parseIntSafe(searchParams.get('limit'), 30)));
    const q = searchParams.get('q')?.trim().toLowerCase() ?? '';

    const todos = await obtenerExamenes();

    const filtrados = q
      ? todos.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q)))
      : todos;

    const total      = filtrados.length;
    const totalPages = exportAll ? 1 : Math.max(1, Math.ceil(total / limit));
    const safePage   = exportAll ? 1 : Math.min(page, totalPages);
    const data       = exportAll ? filtrados : filtrados.slice((safePage - 1) * limit, safePage * limit);

    return NextResponse.json({ ok: true, page: safePage, limit, total, totalPages, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Error consultando exámenes' },
      { status: 500 }
    );
  }
}