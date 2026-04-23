import { chromium } from 'playwright';

function extraerUrls(texto: string): string[] {
  const matches = texto.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  return [...new Set(matches)];
}

function isSecop1Url(url: string): boolean {
  return url.includes('contratos.gov.co/consultas/detalleProceso.do?numConstancia=');
}

function isSecop2DetailUrl(url: string): boolean {
  return url.includes('/Public/Tendering/OpportunityDetail/Index?noticeUID=');
}

function isSecop2SearchUrl(url: string): boolean {
  return (
    url.includes('/Public/Tendering/ContractNoticeManagement/Index') ||
    url.includes('searchText=')
  );
}

function isLicitacionesInfoUrl(url: string): boolean {
  return url.includes('licitaciones.info');
}

function priorizarUrl(urls: string[]): string | null {
  const limpias = urls.map((u) => u.trim());

  const secop2 = limpias.find(isSecop2DetailUrl);
  if (secop2) return secop2;

  const secop1 = limpias.find(isSecop1Url);
  if (secop1) return secop1;

  const privada = limpias.find(
    (u) => !isLicitacionesInfoUrl(u) && !isSecop2SearchUrl(u)
  );
  if (privada) return privada;

  return null;
}

export async function resolverLinkRealDesdeLicitacionesInfo(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const encontrados = new Set<string>();

  page.on('request', (req) => {
    const u = req.url();
    if (u.startsWith('http')) encontrados.add(u);
  });

  page.on('response', (res) => {
    const u = res.url();
    if (u.startsWith('http')) encontrados.add(u);
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    const html = await page.content();
    for (const u of extraerUrls(html)) encontrados.add(u);

    const hrefs = await page.$$eval('a', (anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).href).filter(Boolean)
    );
    for (const u of hrefs) encontrados.add(u);

    const scripts = await page.$$eval('script', (nodes) =>
      nodes.map((n) => n.textContent || '').join('\n')
    );
    for (const u of extraerUrls(scripts)) encontrados.add(u);

    const elegida = priorizarUrl([...encontrados]);
    return elegida ?? url;
  } finally {
    await browser.close();
  }
}