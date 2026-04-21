import { NextResponse } from 'next/server';
import { liciGetPerfiles } from '@/lib/licitaciones-info';

export async function GET() {
  try {
    const perfiles = await liciGetPerfiles();

    return NextResponse.json({
      ok: true,
      perfiles,
    });
  } catch (error) {
    console.error('[GET /api/licitaciones/perfiles]', error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error interno',
      },
      { status: 500 }
    );
  }
}