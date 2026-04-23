import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  throw new Error('No se encontró DATABASE_URL. Verifica .env.local o .env');
}

async function main() {
  const { default: prisma } = await import('@/lib/prisma');

  const rows = await prisma.procesoNuevo.findMany({
    select: {
      id: true,
      codigoProceso: true,
      fuente: true,
      aliasFuente: true,
      linkDetalle: true,
      linkSecop: true,
      linkSecopReg: true,
    },
    orderBy: { id: 'desc' },
    take: 20,
  });

  for (const row of rows) {
    console.log('------------------------------');
    console.log('id:', row.id);
    console.log('codigoProceso:', row.codigoProceso);
    console.log('fuente:', row.fuente);
    console.log('aliasFuente:', row.aliasFuente);
    console.log('linkDetalle:', row.linkDetalle);
    console.log('linkSecop:', row.linkSecop);
    console.log('linkSecopReg:', row.linkSecopReg);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});