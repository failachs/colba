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

  const network: string[] = [];

  page.on('request', (req) => {
    const u = req.url();
    if (/secop|notice|opportunity|contract|fuente|related|licitaciones/i.test(u)) {
      network.push(`REQUEST ${u}`);
    }
  });

  page.on('response', async (res) => {
    const u = res.url();
    if (/secop|notice|opportunity|contract|fuente|related|licitaciones/i.test(u)) {
      network.push(`RESPONSE ${u}`);
      const ct = (res.headers()['content-type'] || '').toLowerCase();

      if (ct.includes('json') || ct.includes('html') || ct.includes('text')) {
        try {
          const body = await res.text();
          if (/CO1\.NTC|OpportunityDetail|ContractNoticeView|detalleProceso\.do|secop/i.test(body)) {
            network.push(`BODY_MATCH ${u}\n${body.slice(0, 4000)}\n---`);
          }
        } catch {
          // ignorar
        }
      }
    }
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded' }).catch(() => null);
  await page.waitForTimeout(5000);

  const bodyText = await page.locator('body').innerText().catch(() => '');
  const anchors = await page.$$eval('a', (els) =>
    els.map((a) => ({
      text: (a.textContent || '').trim(),
      href: (a as HTMLAnchorElement).href || '',
    }))
  ).catch(() => []);

  await fs.writeFile('debug-body.txt', bodyText, 'utf8');
  await fs.writeFile('debug-anchors.json', JSON.stringify(anchors, null, 2), 'utf8');
  await fs.writeFile('debug-network.txt', network.join('\n\n'), 'utf8');

  await browser.close();
  console.log('Listo: debug-body.txt, debug-anchors.json, debug-network.txt');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});