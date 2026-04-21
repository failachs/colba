import { NextRequest, NextResponse } from 'next/server';
import { sincronizarProcesos } from '@/lib/procesos-sync';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const maxResultados =
      typeof body?.maxResultados === 'number' ? body.maxResultados : 3000;

    const limitPorPagina =
      typeof body?.limitPorPagina === 'number' ? body.limitPorPagina : 30;

    const metrics = await sincronizarProcesos({
      maxResultados,
      limitPorPagina,
    });

    return NextResponse.json(metrics, {
      status: metrics.ok ? 200 : 500,
    });
  } catch (error) {
    console.error('[POST /api/procesos/sync]', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al sincronizar procesos.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Usa POST para ejecutar la sincronización.',
    },
    { status: 405 }
  );
}