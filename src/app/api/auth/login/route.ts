import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email y contraseña son obligatorios.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Usuario no encontrado.' },
        { status: 404 }
      );
    }

    if (user.estado !== 'Activo') {
      return NextResponse.json(
        { ok: false, error: 'El usuario está inactivo.' },
        { status: 403 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return NextResponse.json(
        { ok: false, error: 'Contraseña incorrecta.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      usuario: user.usuario,
      cargo: user.cargo,
      email: user.email,
      entidadGrupo: user.entidadGrupo,
      rol: user.rol,
    });
  } catch (error) {
    console.error('[POST /api/licitaciones/login]', error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error interno',
      },
      { status: 500 }
    );
  }
}