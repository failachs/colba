import crypto from 'crypto';
import prisma from '@/lib/prisma';
import type { DetalleSecop } from './extract-detalle';

function hashString(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parseDateMaybe(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function detectExtension(nombre?: string | null) {
  if (!nombre) return null;
  const lower = nombre.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.doc')) return 'doc';
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.xls')) return 'xls';
  if (lower.endsWith('.xlsx')) return 'xlsx';
  return null;
}

function inferCodigoProcesoFromUrl(url?: string | null) {
  if (!url) return null;
  const match = url.match(/noticeUID=([^&]+)/i);
  return match?.[1] ?? null;
}

async function findExistingProceso(url: string, detalle: DetalleSecop) {
  const urlFinal = detalle.urlFinal || null;

  const candidates = [url, detalle.url, urlFinal]
    .filter(Boolean)
    .map((x) => String(x).trim());

  if (candidates.length === 0) return null;

  const proceso = await prisma.proceso.findFirst({
    where: {
      OR: [
        { linkDetalle: { in: candidates } },
        { linkSecop: { in: candidates } },
        { linkSecopReg: { in: candidates } },
      ],
    },
  });

  return proceso;
}

export async function persistDetalleSecop(input: {
  url: string;
  detalle: DetalleSecop;
}) {
  const { url, detalle } = input;

  const codigoProceso = inferCodigoProcesoFromUrl(detalle.urlFinal || detalle.url || url);
  const textoPlano = detalle.textoPlano || '';

  const hashDetalle = hashString(
    JSON.stringify({
      url: detalle.url,
      urlFinal: detalle.urlFinal,
      titulo: detalle.titulo,
      estado: detalle.estado,
      documentos: detalle.documentos,
      cronograma: detalle.cronograma,
      textoPlano,
    })
  );

  const procesoExistente = await findExistingProceso(url, detalle);

  const proceso = procesoExistente
    ? await prisma.proceso.update({
        where: { id: procesoExistente.id },
        data: {
          codigoProceso: procesoExistente.codigoProceso || codigoProceso || undefined,
          nombre: detalle.titulo || procesoExistente.nombre || undefined,
          estadoFuente: detalle.estado || procesoExistente.estadoFuente || undefined,
          linkDetalle: detalle.url || procesoExistente.linkDetalle || undefined,
          linkSecop: detalle.urlFinal || detalle.url || procesoExistente.linkSecop || undefined,
          totalCronogramas: detalle.cronograma.length,
          totalDocumentos: detalle.documentos.length,
          hashContenido: hashDetalle,
          rawJson: JSON.stringify(detalle),
          lastSyncedAt: new Date(),
        },
      })
    : await prisma.proceso.create({
        data: {
          sourceKey: `SECOP_DETAIL:${codigoProceso || hashString(url)}`,
          externalId: codigoProceso || null,
          codigoProceso: codigoProceso || null,
          nombre: detalle.titulo || null,
          entidad: null,
          objeto: null,
          fuente: 'SECOP II',
          aliasFuente: 'S2',
          modalidad: null,
          perfil: null,
          departamento: null,
          estadoFuente: detalle.estado || null,
          fechaPublicacion: null,
          fechaVencimiento: null,
          valor: null,
          linkDetalle: detalle.url || null,
          linkSecop: detalle.urlFinal || detalle.url || null,
          linkSecopReg: null,
          totalCronogramas: detalle.cronograma.length,
          totalDocumentos: detalle.documentos.length,
          rawJson: JSON.stringify(detalle),
          hashContenido: hashDetalle,
          lastSyncedAt: new Date(),
        },
      });

  await prisma.procesoDetalleSecop.upsert({
    where: { procesoId: proceso.id },
    update: {
      urlConsulta: detalle.url,
      urlFinal: detalle.urlFinal || null,
      titulo: detalle.titulo || null,
      estado: detalle.estado || null,
      textoPlano,
      hashDetalle,
      capturadoEn: new Date(),
    },
    create: {
      procesoId: proceso.id,
      urlConsulta: detalle.url,
      urlFinal: detalle.urlFinal || null,
      titulo: detalle.titulo || null,
      estado: detalle.estado || null,
      textoPlano,
      hashDetalle,
      capturadoEn: new Date(),
    },
  });

  await prisma.procesoCronogramaSecop.deleteMany({
    where: { procesoId: proceso.id },
  });

  if (detalle.cronograma.length > 0) {
    await prisma.procesoCronogramaSecop.createMany({
      data: detalle.cronograma.map((item, index) => ({
        procesoId: proceso.id,
        evento: item.evento,
        valorTexto: item.valor || null,
        fechaInicio: parseDateMaybe(item.valor),
        fechaFin: null,
        zonaHoraria: null,
        orden: index + 1,
      })),
    });
  }

  await prisma.procesoDocumentoSecop.deleteMany({
    where: { procesoId: proceso.id },
  });

  if (detalle.documentos.length > 0) {
    await prisma.procesoDocumentoSecop.createMany({
      data: detalle.documentos.map((doc) => ({
        procesoId: proceso.id,
        nombre: doc.nombre || 'Documento',
        urlDocumento: doc.href || null,
        tipoDocumento: detectExtension(doc.nombre),
        extension: detectExtension(doc.nombre),
        hashArchivo: null,
        rutaLocal: null,
        mimeType: null,
        tamanoBytes: null,
        textoExtraido: null,
        descargado: false,
        procesado: false,
      })),
    });
  }

  await prisma.procesoSnapshotSecop.create({
    data: {
      procesoId: proceso.id,
      urlConsulta: detalle.url,
      hashContenido: hashDetalle,
      payloadJson: {
        url,
        detalle,
      },
    },
  });

  return {
    procesoId: proceso.id,
    sourceKey: proceso.sourceKey,
    codigoProceso: proceso.codigoProceso,
    totalCronogramas: detalle.cronograma.length,
    totalDocumentos: detalle.documentos.length,
    hashDetalle,
    reusedProceso: Boolean(procesoExistente),
  };
}