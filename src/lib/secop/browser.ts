import fs from 'fs';
import path from 'path';
import { chromium, type BrowserContext } from 'playwright';

export async function getSecopPersistentContext(): Promise<BrowserContext> {
  const userDataDir = path.join(process.cwd(), '.playwright', 'secop-profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  const options = {
    headless: false,
    channel: 'msedge',
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    args: ['--start-maximized'],
  };

  const context = await chromium.launchPersistentContext(userDataDir, options);
  return context;
}