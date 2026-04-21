import { NextRequest, NextResponse } from 'next/server';
import { extractDetalleProceso } from '@/lib/secop/extract-detalle';
import { persistDetalleSecop } from '@/lib/secop/persist-detalle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = String(body?.url ?? '').trim();

    if (!url) {
      return NextResponse.json(
        { ok: false, error: 'Debes enviar la URL del proceso en el campo "url".' },
        { status: 400 }
      );
    }

    if (!url.includes('community.secop.gov.co')) {
      return NextResponse.json(
        { ok: false, error: 'La URL enviada no parece ser una ficha pública de SECOP.' },
        { status: 400 }
      );
    }

    const detalle = await extractDetalleProceso(url);
    const persisted = await persistDetalleSecop({ url, detalle });

    return NextResponse.json({
      ok: true,
      data: detalle,
      persisted,
    });
  } catch (error) {
    console.error('Error en /api/secop/detalle:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}