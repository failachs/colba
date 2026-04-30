// src/app/api/users/cambiar-password/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actual, nueva } = body as { actual?: string; nueva?: string };

    if (!actual || !nueva) {
      return NextResponse.json({ ok: false, message: 'Faltan campos requeridos.' }, { status: 400 });
    }

    if (nueva.length < 6) {
      return NextResponse.json({ ok: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    if (actual === nueva) {
      return NextResponse.json({ ok: false, message: 'La nueva contraseña no puede ser igual a la actual.' }, { status: 400 });
    }

    // ── TODO: conectar con tu lógica de autenticación ──────────
    // Ejemplo con Prisma + bcrypt:
    //
    // import { getServerSession } from 'next-auth';
    // import { prisma } from '@/lib/prisma';
    // import bcrypt from 'bcryptjs';
    //
    // const session = await getServerSession();
    // if (!session?.user?.email) {
    //   return NextResponse.json({ ok: false, message: 'No autenticado.' }, { status: 401 });
    // }
    //
    // const user = await prisma.usuario.findUnique({ where: { email: session.user.email } });
    // if (!user) return NextResponse.json({ ok: false, message: 'Usuario no encontrado.' }, { status: 404 });
    //
    // const valid = await bcrypt.compare(actual, user.passwordHash);
    // if (!valid) return NextResponse.json({ ok: false, message: 'Contraseña actual incorrecta.' }, { status: 401 });
    //
    // const hash = await bcrypt.hash(nueva, 12);
    // await prisma.usuario.update({ where: { id: user.id }, data: { passwordHash: hash } });
    // ──────────────────────────────────────────────────────────

    // Respuesta de éxito (reemplazar cuando conectes la BD)
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[cambiar-password]', err);
    return NextResponse.json({ ok: false, message: 'Error interno del servidor.' }, { status: 500 });
  }
}