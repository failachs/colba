import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  throw new Error('No se encontró DATABASE_URL. Verifica .env.local o .env');
}

function esLinkCssBasura(url: string | null | undefined): boolean {
  const u = String(url ?? '').toLowerCase();
  return (
    u.includes('cdnjs.cloudflare.com') ||
    u.includes('bootstrap-tour')
  );
}

function esLinkStoreBasura(url: string | null | undefined): boolean {
  const u = String(url ?? '').toLowerCase();
  return (
    u.includes('play.google.com') ||
    u.includes('apps.apple.com') ||
    u.includes('itunes.apple.com') ||
    u.includes('setcon.licitacionesinfo')
  );
}

function esSecop2Search(url: string | null | undefined): boolean {
  const u = String(url ?? '');
  return u.includes('/Public/Tendering/ContractNoticeManagement/Index') || u.includes('searchText=');
}

function esSecop1ConstruidoMalo(aliasFuente: string | null | undefined, url: string | null | undefined): boolean {
  const alias = String(aliasFuente ?? '').toUpperCase();
  const u = String(url ?? '');
  if (alias !== 'S1') return false;
  if (!u.includes('contratos.gov.co/consultas/detalleProceso.do?numConstancia=')) return false;

  const numConstancia = u.split('numConstancia=')[1] ?? '';
  const dec = decodeURIComponent(numConstancia);

  return !/^\d{2}-\d{2}-\d{6,}$/.test(dec.trim());
}

async function main() {
  const { default: prisma } = await import('@/lib/prisma');

  console.log('Iniciando reparación desde rawJson...');

  const rows = await prisma.procesoNuevo.findMany({
    select: {
      id: true,
      procesoId: true,
      codigoProceso: true,
      aliasFuente: true,
      fuente: true,
      linkDetalle: true,
      linkSecop: true,
      linkSecopReg: true,
    },
    orderBy: { id: 'desc' },
  });

  let revisados = 0;
  let actualizados = 0;
  let sinCambio = 0;
  let errores = 0;

  for (const row of rows) {
    revisados++;

    const requiereReparacion =
      esLinkCssBasura(row.linkDetalle) ||
      esLinkStoreBasura(row.linkDetalle) ||
      esSecop2Search(row.linkDetalle) ||
      esSecop1ConstruidoMalo(row.aliasFuente, row.linkDetalle);

    if (!requiereReparacion) {
      sinCambio++;
      continue;
    }

    try {
      console.log(`[${revisados}/${rows.length}] Reparando id=${row.id} codigo=${row.codigoProceso ?? ''}`);

      if (!row.procesoId) {
        console.log('  - sin procesoId relacionado, se omite');
        sinCambio++;
        continue;
      }

      const proceso = await prisma.proceso.findUnique({
        where: { id: row.procesoId },
        select: {
          id: true,
          rawJson: true,
        },
      });

      if (!proceso?.rawJson) {
        console.log('  - sin rawJson, se omite');
        sinCambio++;
        continue;
      }

      let raw: Record<string, unknown>;
      try {
        raw = JSON.parse(proceso.rawJson);
      } catch {
        console.log('  - rawJson inválido, se omite');
        sinCambio++;
        continue;
      }

      const linkOriginal = String(raw.link ?? '').trim();
      const urlFuente = String(raw.UrlFuente ?? raw.url_fuente ?? raw.LinkFuente ?? raw.link_fuente ?? '').trim();
      const urlFuenteReg = String(raw.UrlFuenteRegistrado ?? raw.url_fuente_registrado ?? raw.LinkFuenteRegistrado ?? raw.link_fuente_registrado ?? '').trim();

      const nuevoLinkDetalle = linkOriginal || row.linkDetalle || null;
      const nuevoLinkSecop = urlFuente || null;
      const nuevoLinkSecopReg = urlFuenteReg || row.linkSecopReg || null;

      await prisma.procesoNuevo.update({
        where: { id: row.id },
        data: {
          linkDetalle: nuevoLinkDetalle,
          linkSecop: nuevoLinkSecop,
          linkSecopReg: nuevoLinkSecopReg,
        },
      });

      await prisma.proceso.update({
        where: { id: row.procesoId },
        data: {
          linkDetalle: nuevoLinkDetalle,
          linkSecop: nuevoLinkSecop,
          linkSecopReg: nuevoLinkSecopReg,
          lastSyncedAt: new Date(),
        },
      });

      actualizados++;
      console.log(`  - restaurado linkDetalle: ${nuevoLinkDetalle}`);
    } catch (err) {
      errores++;
      console.error(
        `  - error en id=${row.id}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  console.log('Reparación finalizada.');
  console.log({ revisados, actualizados, sinCambio, errores });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});