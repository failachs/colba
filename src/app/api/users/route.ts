import { NextResponse } from 'next/server';
import  prisma  from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error listando usuarios:', error);
    return NextResponse.json(
      { error: 'No se pudieron consultar los usuarios.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const cedula = String(body.cedula ?? '').trim();
    const usuario = String(body.usuario ?? '').trim().toLowerCase();
    const entidadGrupo = String(body.entidadGrupo ?? '').trim();
    const cargo = String(body.cargo ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const celular = String(body.celular ?? '').trim();
    const rol = String(body.rol ?? '').trim();
    const estado = String(body.estado ?? 'Activo').trim();
    const firmaDigital = String(body.firmaDigital ?? '').trim();
    const password = String(body.password ?? '').trim();

    if (!cedula) {
      return NextResponse.json(
        { error: 'La cédula es obligatoria.' },
        { status: 400 }
      );
    }

    if (!celular) {
      return NextResponse.json(
        { error: 'El celular es obligatorio.' },
        { status: 400 }
      );
    }

    if (!entidadGrupo) {
      return NextResponse.json(
        { error: 'La entidad del grupo es obligatoria.' },
        { status: 400 }
      );
    }

    if (!cargo) {
      return NextResponse.json(
        { error: 'El cargo es obligatorio.' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'El email es obligatorio.' },
        { status: 400 }
      );
    }

    if (!usuario) {
      return NextResponse.json(
        { error: 'El usuario es obligatorio.' },
        { status: 400 }
      );
    }

    if (!rol) {
      return NextResponse.json(
        { error: 'El rol es obligatorio.' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'La contraseña es obligatoria.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    // Verificar duplicados
    const existingCedula = await prisma.user.findFirst({
      where: { cedula },
    });

    if (existingCedula) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con esa cédula.' },
        { status: 409 }
      );
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email.' },
        { status: 409 }
      );
    }

    const existingUsuario = await prisma.user.findFirst({
      where: { usuario },
    });

    if (existingUsuario) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese nombre de usuario.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        cedula,
        celular,
        entidadGrupo,
        cargo,
        email,
        usuario,
        rol,
        estado,
        firmaDigital: firmaDigital || null,
        passwordHash,
      },
    });

    const { passwordHash: _ph, ...userSinHash } = user;

    return NextResponse.json(userSinHash, { status: 201 });
  } catch (error) {
    console.error('Error creando usuario:', error);
    return NextResponse.json(
      { error: 'No se pudo guardar el usuario.' },
      { status: 500 }
    );
  }
}