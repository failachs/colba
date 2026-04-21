import readline from 'readline';
import { getSecopPersistentContext } from './browser';

function waitForEnter(message: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const context = await getSecopPersistentContext();
  const page = context.pages()[0] ?? await context.newPage();

  await page.goto('https://community.secop.gov.co/', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });

  console.log('\nResuelve el CAPTCHA manualmente en el navegador.\n');
  await waitForEnter('Cuando ya hayas entrado y veas que SECOP cargó, presiona ENTER aquí... ');

  console.log('\nSesión guardada en el perfil persistente.\n');
  console.log('Puedes cerrar el navegador o dejarlo abierto.');

  await context.close();
}

main().catch((error) => {
  console.error('Error en secop:login', error);
  process.exit(1);
});