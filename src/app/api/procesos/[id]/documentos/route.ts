import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const dbId = Number(id);
    if (isNaN(dbId) || dbId <= 0) {
      return NextResponse.json({ ok: false, error: 'ID inválido.' }, { status: 400 });
    }

    const documentos = await prisma.procesoDocumentoSecop.findMany({
      where: { procesoId: dbId },
      orderBy: { fechaDetectado: 'asc' },
      select: {
        id: true,
        nombre: true,
        urlDocumento: true,
        fechaDetectado: true,
      },
    });

    return NextResponse.json({ ok: true, documentos });
  } catch (error) {
    console.error('[GET /api/procesos/[id]/documentos]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Error.' },
      { status: 500 }
    );
  }
}