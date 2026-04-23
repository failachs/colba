import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { chromium } from 'playwright';
import fs from 'fs/promises';

const URL = 'https://col.licitaciones.info/detalle-contrato?random=69ea183d5916a5.20297570';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(15000);

  await page.goto(URL, { waitUntil: 'domcontentloaded' }).catch(() => null);
  await page.waitForTimeout(5000);

  const data = await page.evaluate(() => {
    const bloques = Array.from(document.querySelectorAll('div.campos-detalle-contrato.info-borde'));

    return {
      title: document.title,
      bodySnippet: (document.body?.innerText || '').slice(0, 4000),
      bloques: bloques.map((bloque) => ({
        html: bloque.outerHTML,
        text: (bloque.textContent || '').trim(),
        links: Array.from(bloque.querySelectorAll('a')).map((a) => ({
          text: (a.textContent || '').trim(),
          href: (a as HTMLAnchorElement).getAttribute('href'),
          absoluteHref: (a as HTMLAnchorElement).href,
          className: a.className,
        })),
      })),
      anchorsInfoContrato: Array.from(document.querySelectorAll('p.info-contrato a')).map((a) => ({
        text: (a.textContent || '').trim(),
        href: (a as HTMLAnchorElement).getAttribute('href'),
        absoluteHref: (a as HTMLAnchorElement).href,
        className: a.className,
      })),
      allMatchingTextAnchors: Array.from(document.querySelectorAll('a')).filter((a) =>
        (a.textContent || '').includes('secop') ||
        (a.textContent || '').includes('http')
      ).map((a) => ({
        text: (a.textContent || '').trim(),
        href: (a as HTMLAnchorElement).getAttribute('href'),
        absoluteHref: (a as HTMLAnchorElement).href,
        className: a.className,
      })),
    };
  });

  await fs.writeFile('debug-fuentes-relacionadas.json', JSON.stringify(data, null, 2), 'utf8');

  await browser.close();
  console.log('Listo: debug-fuentes-relacionadas.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});