import { chromium } from 'playwright';

function limpiarUrl(url: string): string {
  return url
    .trim()
    .replace(/[)"'>\]]+$/, '')
    .replace(/&amp;/g, '&');
}

function extraerUrls(texto: string): string[] {
  const matches = texto.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  return [...new Set(matches.map(limpiarUrl))];
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

function esSecop2SearchUrl(url: string): boolean {
  return (
    url.includes('/Public/Tendering/ContractNoticeManagement/Index') ||
    url.includes('searchText=')
  );
}

function esLicitacionesInfoUrl(url: string): boolean {
  return url.includes('licitaciones.info');
}

function esBasura(url: string): boolean {
  const u = url.toLowerCase();

  return (
    u.includes('play.google.com') ||
    u.includes('apps.apple.com') ||
    u.includes('itunes.apple.com') ||
    u.includes('facebook.com') ||
    u.includes('instagram.com') ||
    u.includes('linkedin.com') ||
    u.includes('twitter.com') ||
    u.includes('youtube.com') ||
    u.includes('wa.me') ||
    u.includes('mailto:') ||
    u.includes('cdnjs.cloudflare.com') ||
    u.includes('cdn.jsdelivr.net') ||
    u.includes('bootstrap-tour') ||
    u.includes('daterangepicker.css') ||
    u.includes('setcon.licitacionesinfo')
  );
}

function esCandidatoUtil(url: string): boolean {
  const u = limpiarUrl(url);
  if (!/^https?:\/\//i.test(u)) return false;
  if (esBasura(u)) return false;
  return true;
}

function priorizarUrl(urls: string[]): string | null {
  const limpias = [...new Set(urls.map(limpiarUrl).filter(esCandidatoUtil))];

  const secop2 = limpias.find(esSecop2Url);
  if (secop2) return secop2;

  const secop1 = limpias.find(esSecop1Url);
  if (secop1) return secop1;

  const privada = limpias.find(
    (u) => !esLicitacionesInfoUrl(u) && !esSecop2SearchUrl(u)
  );
  if (privada) return privada;

  return null;
}

export async function resolverLinkRealDesdeLicitacionesInfo(url: string): Promise<string> {
  const browser = await chromium.launch({
    headless: true,
    timeout: 15000,
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(12000);

  try {
    console.log('[resolver-link-real] Abriendo:', url);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 12000,
    }).catch(() => null);

    await page.waitForTimeout(4000);

    const bodyText = await page.locator('body').innerText().catch(() => '');
    const urls = extraerUrls(bodyText);

    const elegida = priorizarUrl(urls);

    if (elegida) {
      console.log('[resolver-link-real] Link elegido desde texto visible:', elegida);
      return elegida;
    }

    console.log('[resolver-link-real] No se encontró link mejor, se deja original');
    return url;
  } finally {
    await page.close().catch(() => null);
    await browser.close().catch(() => null);
  }
}