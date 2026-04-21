import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import Database from 'better-sqlite3';

async function main() {
  const { default: prisma } = await import('../src/lib/prisma');

  const sqlitePath = './dev.db';
  const db = new Database(sqlitePath, { readonly: true });

  const sqliteUsers = db
    .prepare(`
      SELECT
        id,
        cedula,
        celular,
        entidadGrupo,
        cargo,
        email,
        usuario,
        rol,
        estado,
        firmaDigital,
        passwordHash,
        createdAt,
        updatedAt
      FROM User
    `)
    .all() as Array<{
      id: number;
      cedula: string;
      celular: string;
      entidadGrupo: string;
      cargo: string;
      email: string;
      usuario: string;
      rol: string;
      estado: string;
      firmaDigital: string | null;
      passwordHash: string;
      createdAt: string;
      updatedAt: string;
    }>;

  const sqliteDeletedUsers = db
    .prepare(`
      SELECT
        id,
        originalUserId,
        cedula,
        celular,
        entidadGrupo,
        cargo,
        email,
        usuario,
        rol,
        estado,
        firmaDigital,
        createdAt,
        updatedAt,
        deletedAt,
        deletedByUsuario,
        deletedByEmail,
        deletedByCargo
      FROM DeletedUser
    `)
    .all() as Array<{
      id: number;
      originalUserId: number | null;
      cedula: string;
      celular: string;
      entidadGrupo: string;
      cargo: string;
      email: string;
      usuario: string;
      rol: string;
      estado: string;
      firmaDigital: string | null;
      createdAt: string;
      updatedAt: string;
      deletedAt: string;
      deletedByUsuario: string | null;
      deletedByEmail: string | null;
      deletedByCargo: string | null;
    }>;

  let usersInsertados = 0;
  let usersOmitidos = 0;

  for (const u of sqliteUsers) {
    const existe = await prisma.user.findUnique({
      where: { email: u.email.toLowerCase() },
      select: { id: true },
    });

    if (existe) {
      usersOmitidos++;
      continue;
    }

    await prisma.user.create({
      data: {
        cedula: u.cedula,
        celular: u.celular,
        entidadGrupo: u.entidadGrupo,
        cargo: u.cargo,
        email: u.email.toLowerCase(),
        usuario: u.usuario.toLowerCase(),
        rol: u.rol,
        estado: u.estado,
        firmaDigital: u.firmaDigital || null,
        passwordHash: u.passwordHash,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      },
    });

    usersInsertados++;
  }

  let deletedInsertados = 0;
  let deletedOmitidos = 0;

  for (const u of sqliteDeletedUsers) {
    const existe = await prisma.deletedUser.findFirst({
      where: {
        email: u.email.toLowerCase(),
        deletedAt: new Date(u.deletedAt),
      },
      select: { id: true },
    });

    if (existe) {
      deletedOmitidos++;
      continue;
    }

    await prisma.deletedUser.create({
      data: {
        originalUserId: u.originalUserId,
        cedula: u.cedula,
        celular: u.celular,
        entidadGrupo: u.entidadGrupo,
        cargo: u.cargo,
        email: u.email.toLowerCase(),
        usuario: u.usuario.toLowerCase(),
        rol: u.rol,
        estado: u.estado,
        firmaDigital: u.firmaDigital || null,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
        deletedAt: new Date(u.deletedAt),
        deletedByUsuario: u.deletedByUsuario || null,
        deletedByEmail: u.deletedByEmail || null,
        deletedByCargo: u.deletedByCargo || null,
      },
    });

    deletedInsertados++;
  }

  db.close();
  await prisma.$disconnect();

  console.log('Migración completada');
  console.log({
    usersInsertados,
    usersOmitidos,
    deletedInsertados,
    deletedOmitidos,
  });
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});