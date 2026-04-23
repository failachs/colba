import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  throw new Error('No se encontró DATABASE_URL. Verifica .env.local o .env');
}

function esLinkLicitacionesInfo(url: string | null | undefined): boolean {
  return String(url ?? '').includes('licitaciones.info/detalle-contrato');
}

function esSecop1Url(url: string): boolean {
  return url.includes('contratos.gov.co/consultas/detalleProceso.do?numConstancia=');
}

function esSecop2Url(url: string): boolean {
  return (
    url.includes('/Public/Tendering/OpportunityDetail/Index?noticeUID=') ||
    url.includes('/CO1BusinessLine/Tendering/ContractNoticeView/Index?')
  );
}

function esLinkBasura(url: string | null | undefined): boolean {
  const u = String(url ?? '').toLowerCase();
  return (
    u.includes('play.google.com') ||
    u.includes('apps.apple.com') ||
    u.includes('itunes.apple.com') ||
    u.includes('setcon.licitacionesinfo') ||
    u.includes('cdnjs.cloudflare.com') ||
    u.includes('cdn.jsdelivr.net') ||
    u.includes('bootstrap-tour') ||
    u.includes('daterangepicker.css')
  );
}

async function main() {
  const [{ default: prisma }, { resolverLinkRealDesdeLicitacionesInfo }] =
    await Promise.all([
      import('@/lib/prisma'),
      import('@/lib/resolver-link-real'),
    ]);

  console.log('Iniciando backfill de links en ProcesoNuevo...');

  const rows = await prisma.procesoNuevo.findMany({
    where: {
      linkDetalle: {
        contains: 'licitaciones.info/detalle-contrato',
      },
    },
    select: {
      id: true,
      procesoId: true,
      codigoProceso: true,
      fuente: true,
      aliasFuente: true,
      linkDetalle: true,
      linkSecop: true,
      linkSecopReg: true,
    },
    take: 5,
  });

  console.log(`Registros candidatos: ${rows.length}`);

  let revisados = 0;
  let actualizados = 0;
  let sinCambio = 0;
  let errores = 0;

  for (const row of rows) {
    revisados++;

    try {
      const actual = String(row.linkDetalle ?? '').trim();

      if (!esLinkLicitacionesInfo(actual)) {
        sinCambio++;
        continue;
      }

      console.log(`[${revisados}/${rows.length}] Resolviendo ${row.codigoProceso ?? row.id} ...`);
      console.log(`  - actual: ${actual}`);

      const linkReal = await resolverLinkRealDesdeLicitacionesInfo(actual);

      const invalido =
        !linkReal ||
        linkReal === actual ||
        esLinkBasura(linkReal);

      if (invalido) {
        console.log('  - sin cambio');
        sinCambio++;
        continue;
      }

      const nuevoLinkSecop =
        row.linkSecop ||
        (esSecop1Url(linkReal) || esSecop2Url(linkReal) ? linkReal : null);

      await prisma.procesoNuevo.update({
        where: { id: row.id },
        data: {
          linkDetalle: linkReal,
          linkSecop: nuevoLinkSecop,
        },
      });

      if (row.procesoId) {
        await prisma.proceso.update({
          where: { id: row.procesoId },
          data: {
            linkDetalle: linkReal,
            linkSecop: nuevoLinkSecop,
            lastSyncedAt: new Date(),
          },
        });
      }

      actualizados++;
      console.log(`  - actualizado a: ${linkReal}`);
    } catch (err) {
      errores++;
      console.error(
        `  - error en ${row.codigoProceso ?? row.id}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  console.log('Backfill finalizado.');
  console.log({ revisados, actualizados, sinCambio, errores });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error fatal en backfill:', err);
  process.exit(1);
});