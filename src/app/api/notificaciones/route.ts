import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/notificaciones?limit=50&soloNoLeidas=true
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') ?? '50');
    const soloNoLeidas = searchParams.get('soloNoLeidas') === 'true';

    const where = soloNoLeidas ? { leida: false } : {};

    const notifsRaw = await prisma.notificacion.findMany({
  where,
  orderBy: { creadoEn: 'desc' },
  take: limit,
});

const notificaciones = notifsRaw.map(n => {
  const datos = n.datos as Record<string, unknown> | null;
  return {
    ...n,
    fechaPublicacion: datos?.fechaPublicacion ?? null,
  };
});

    const total = await prisma.notificacion.count({ where: { leida: false } });

    return NextResponse.json({ ok: true, notificaciones, totalNoLeidas: total });
  } catch (error) {
    console.error('Error listando notificaciones:', error);
    return NextResponse.json({ error: 'No se pudieron obtener las notificaciones.' }, { status: 500 });
  }
}

// POST /api/notificaciones — crear notificación (usado por servicio externo)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const tipo          = String(body.tipo          ?? '').trim();
    const titulo        = String(body.titulo        ?? '').trim();
    const descripcion   = String(body.descripcion   ?? '').trim() || null;
    const codigoProceso = String(body.codigoProceso ?? '').trim() || null;
    const procesoId     = body.procesoId ? Number(body.procesoId) : null;
    const entidad       = String(body.entidad       ?? '').trim() || null;
    const perfil        = String(body.perfil        ?? '').trim() || null;
    const datos         = body.datos ?? null;

    if (!tipo || !titulo) {
      return NextResponse.json({ error: 'tipo y titulo son obligatorios.' }, { status: 400 });
    }

    const notif = await prisma.notificacion.create({
      data: { tipo, titulo, descripcion, codigoProceso, procesoId, entidad, perfil, datos },
    });

    return NextResponse.json({ ok: true, notificacion: notif }, { status: 201 });
  } catch (error) {
    console.error('Error creando notificación:', error);
    return NextResponse.json({ error: 'No se pudo crear la notificación.' }, { status: 500 });
  }
}

// PATCH /api/notificaciones — marcar todas como leídas
export async function PATCH() {
  try {
    await prisma.notificacion.updateMany({
      where: { leida: false },
      data: { leida: true, leidaEn: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error marcando notificaciones:', error);
    return NextResponse.json({ error: 'No se pudo actualizar.' }, { status: 500 });
  }
}