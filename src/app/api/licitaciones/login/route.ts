import { NextRequest, NextResponse } from 'next/server';
import  prisma  from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Correo y contraseña son obligatorios.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    if (user.estado?.toLowerCase() !== 'activo') {
      return NextResponse.json(
        { error: 'El usuario se encuentra inactivo.' },
        { status: 403 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'El usuario no tiene contraseña configurada.' },
        { status: 400 }
      );
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);

    if (!passwordOk) {
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
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
    console.error('Error en login:', error);

    return NextResponse.json(
      { error: 'No se pudo iniciar sesión.' },
      { status: 500 }
    );
  }
}