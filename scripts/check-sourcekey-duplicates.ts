import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
  const { default: prisma } = await import('../src/lib/prisma');

  const rows = await prisma.proceso.groupBy({
    by: ['sourceKey'],
    _count: {
      sourceKey: true,
    },
    where: {
      sourceKey: {
        not: '',
      },
    },
    having: {
      sourceKey: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  console.log(`Duplicados encontrados: ${rows.length}`);

  if (rows.length > 0) {
    console.log(rows.slice(0, 20));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});