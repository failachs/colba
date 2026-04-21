import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import  prisma  from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Correo y contraseña son obligatorios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: `No existe un usuario con el correo ${email}` },
        { status: 404 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    return NextResponse.json({
      ok: true,
      message: `passwordHash actualizado para ${updated.usuario} (${updated.email})`,
    });
  } catch (error) {
    console.error('POST /api/auth/set-password error:', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar la contraseña.' },
      { status: 500 }
    );
  }
}