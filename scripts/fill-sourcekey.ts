import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

function buildSourceKey(p: {
  externalId: string | null;
  linkDetalle: string | null;
  linkSecop: string | null;
  codigoProceso: string | null;
  aliasFuente: string | null;
  entidad: string | null;
  fechaPublicacion: Date | null;
  rawJson: string | null;
}) {
  const externalId = String(p.externalId ?? '').trim();
  if (externalId) return `ext:${externalId}`;

  const linkDetalle = String(p.linkDetalle ?? '').trim();
  if (linkDetalle) return `detalle:${linkDetalle}`;

  const linkSecop = String(p.linkSecop ?? '').trim();
  if (linkSecop) return `secop:${linkSecop}`;

  const codigo = String(p.codigoProceso ?? '').trim();
  const alias = String(p.aliasFuente ?? '').trim().toUpperCase();
  const entidad = String(p.entidad ?? '').trim();
  const fecha = p.fechaPublicacion ? p.fechaPublicacion.toISOString() : '';

  if (codigo || alias || entidad || fecha) {
    return `mix:${codigo}||${alias}||${entidad}||${fecha}`;
  }

  return `raw:${crypto
    .createHash('md5')
    .update(String(p.rawJson ?? ''))
    .digest('hex')}`;
}

async function main() {
  const { default: prisma } = await import('../src/lib/prisma');

  const procesos = await prisma.proceso.findMany({
    select: {
      id: true,
      externalId: true,
      linkDetalle: true,
      linkSecop: true,
      codigoProceso: true,
      aliasFuente: true,
      entidad: true,
      fechaPublicacion: true,
      rawJson: true,
      sourceKey: true,
    },
  });

  let actualizados = 0;

  for (const p of procesos) {
    if (p.sourceKey) continue;

    const sourceKey = buildSourceKey(p);

    await prisma.proceso.update({
      where: { id: p.id },
      data: { sourceKey },
    });

    actualizados++;
  }

  console.log(`Actualizados ${actualizados} procesos`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});