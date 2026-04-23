import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  throw new Error('No se encontró DATABASE_URL. Verifica .env.local o .env');
}

function normalizeUrl(url: unknown): string {
  return String(url ?? '').trim();
}

function construirDesdeRaw(raw: Record<string, unknown>) {
  const aliasFuente = String(raw['alias_fuente'] ?? '').trim().toUpperCase();
  const linkReal = normalizeUrl(raw['Link']);
  const rawLinkLicitaciones = normalizeUrl(raw['link']);
  const random = normalizeUrl(raw['Random']);
  const idUltimaFase = normalizeUrl(raw['idUltimaFase']);
  const urlSecop2RegistradosBase = normalizeUrl(raw['url_secop2_registrados']);

  let linkDetalle = '';
  let linkSecop: string | null = null;
  let linkSecopReg: string | null = null;

  if (linkReal) {
    linkDetalle = linkReal;
  }

  if (aliasFuente === 'S2') {
    linkSecop = linkReal || null;

    if (urlSecop2RegistradosBase && idUltimaFase) {
      linkSecopReg = `${urlSecop2RegistradosBase}${idUltimaFase}`;
    }
  } else if (aliasFuente === 'S1') {
    linkSecop = linkReal || null;
  }

  if (!linkDetalle) {
    if (rawLinkLicitaciones) {
      linkDetalle = rawLinkLicitaciones;
    } else if (random) {
      linkDetalle = `https://col.licitaciones.info/detalle-contrato?random=${encodeURIComponent(random)}`;
    }
  }

  return {
    aliasFuente,
    linkDetalle: linkDetalle || null,
    linkSecop,
    linkSecopReg,
  };
}

async function main() {
  const { default: prisma } = await import('@/lib/prisma');

  console.log('Reconstruyendo links desde rawJson...');

  const procesos = await prisma.proceso.findMany({
    select: {
      id: true,
      sourceKey: true,
      codigoProceso: true,
      aliasFuente: true,
      rawJson: true,
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

  for (const proc of procesos) {
    revisados++;

    try {
      if (!proc.rawJson) {
        sinCambio++;
        continue;
      }

      let raw: Record<string, unknown>;
      try {
        raw = JSON.parse(proc.rawJson);
      } catch {
        sinCambio++;
        continue;
      }

      const nuevo = construirDesdeRaw(raw);

      const actualDetalle = normalizeUrl(proc.linkDetalle) || null;
      const actualSecop = normalizeUrl(proc.linkSecop) || null;
      const actualSecopReg = normalizeUrl(proc.linkSecopReg) || null;

      const cambia =
        actualDetalle !== nuevo.linkDetalle ||
        actualSecop !== nuevo.linkSecop ||
        actualSecopReg !== nuevo.linkSecopReg;

      if (!cambia) {
        sinCambio++;
        continue;
      }

      await prisma.proceso.update({
        where: { id: proc.id },
        data: {
          linkDetalle: nuevo.linkDetalle,
          linkSecop: nuevo.linkSecop,
          linkSecopReg: nuevo.linkSecopReg,
          lastSyncedAt: new Date(),
        },
      });

      await prisma.procesoNuevo.updateMany({
        where: { procesoId: proc.id },
        data: {
          linkDetalle: nuevo.linkDetalle,
          linkSecop: nuevo.linkSecop,
          linkSecopReg: nuevo.linkSecopReg,
        },
      });

      actualizados++;
      console.log(
        `[${revisados}/${procesos.length}] OK ${proc.codigoProceso ?? proc.id} -> ${nuevo.linkDetalle ?? 'null'}`
      );
    } catch (err) {
      errores++;
      console.error(
        `[${revisados}/${procesos.length}] ERROR ${proc.codigoProceso ?? proc.id}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  console.log('Reconstrucción finalizada.');
  console.log({ revisados, actualizados, sinCambio, errores });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});