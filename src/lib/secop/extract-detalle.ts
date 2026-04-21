import { getSecopPersistentContext } from './browser';

export type DocumentoSecop = {
  nombre: string;
  href?: string;
};

export type EventoCronograma = {
  evento: string;
  valor: string;
};

export type DetalleSecop = {
  url: string;
  urlFinal?: string;
  titulo?: string;
  estado?: string;
  documentos: DocumentoSecop[];
  cronograma: EventoCronograma[];
  textoPlano?: string;
};

function normalizarTexto(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function deduplicarDocumentos(items: DocumentoSecop[]): DocumentoSecop[] {
  const seen = new Set<string>();
  const out: DocumentoSecop[] = [];

  for (const item of items) {
    const key = `${item.nombre}||${item.href ?? ''}`.toLowerCase();
    if (!key.trim() || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function extraerCronogramaDesdeTexto(texto: string): EventoCronograma[] {
  const lineas = texto
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

  const eventosObjetivo = [
    'Fecha de Firma del Contrato',
    'Fecha de inicio de ejecución del contrato',
    'Plazo de ejecución del contrato',
    'Fecha de publicación',
    'Fecha de terminación del contrato',
    'Fecha de recepción de ofertas',
    'Fecha de presentación de ofertas',
  ];

  const resultado: EventoCronograma[] = [];

  for (let i = 0; i < lineas.length; i++) {
    const actual = lineas[i];

    for (const evento of eventosObjetivo) {
      if (actual.toLowerCase() === evento.toLowerCase()) {
        let valor = '';

        for (let j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
          const candidato = lineas[j];
          if (
            candidato &&
            !eventosObjetivo.some((e) => e.toLowerCase() === candidato.toLowerCase())
          ) {
            valor = candidato;
            break;
          }
        }

        resultado.push({ evento, valor });
      }
    }
  }

  const seen = new Set<string>();
  return resultado.filter((item) => {
    const key = `${item.evento}|${item.valor}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function extractDetalleProceso(url: string): Promise<DetalleSecop> {
  const context = await getSecopPersistentContext();
  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });

    await page.waitForTimeout(6000);

    const urlFinal = page.url();
    const bodyTextRaw = await page.locator('body').innerText();

    const esCaptcha =
      urlFinal.toLowerCase().includes('/public/common/googlerecaptcha/') ||
      bodyTextRaw.toLowerCase().includes('complete la validación para acceder a la página') ||
      bodyTextRaw.toLowerCase().includes('no soy un robot');

    if (esCaptcha) {
      throw new Error('SECOP redirigió al CAPTCHA. Resuelve la validación y vuelve a intentar.');
    }

    const titulo =
      normalizarTexto(await page.locator('h1').first().textContent().catch(() => '')) ||
      undefined;

    let estado: string | undefined;
    const estadosPosibles = [
      'Publicado',
      'Presentación de oferta',
      'Adjudicado',
      'Evaluación',
      'Observaciones',
      'Borrador',
      'Cancelado',
      'Cerrado',
    ];

    for (const estadoPosible of estadosPosibles) {
      if (bodyTextRaw.includes(estadoPosible)) {
        estado = estadoPosible;
        break;
      }
    }

    const documentos: DocumentoSecop[] = [];
    const links = page.locator('a');
    const totalLinks = await links.count();

    for (let i = 0; i < totalLinks; i++) {
      const link = links.nth(i);
      const text = normalizarTexto(await link.textContent().catch(() => ''));
      const href = await link.getAttribute('href').catch(() => null);

      const pareceDocumento =
        text.toLowerCase().endsWith('.pdf') ||
        text.toLowerCase().endsWith('.doc') ||
        text.toLowerCase().endsWith('.docx') ||
        text.toLowerCase().endsWith('.xls') ||
        text.toLowerCase().endsWith('.xlsx') ||
        text.toLowerCase().includes('descargar');

      if (!pareceDocumento) continue;

      documentos.push({
        nombre: text || 'Descargar',
        href: href ?? undefined,
      });
    }

    const cronograma = extraerCronogramaDesdeTexto(bodyTextRaw);

    await page.screenshot({
      path: 'secop-detalle.png',
      fullPage: true,
    });

    return {
      url,
      urlFinal,
      titulo,
      estado,
      documentos: deduplicarDocumentos(documentos),
      cronograma,
      textoPlano: bodyTextRaw,
    };
  } finally {
    await page.close();
  }
}