// Bildschirmfoto der laufenden Vorschau (npx vite preview --port 4173) in Handy-Querformat 844x390, 2-fach. Aufruf: node werkzeuge/bildschirmfoto.cjs <ausgabe-praefix>
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('http://localhost:4173/'); await p.waitForTimeout(3600); await p.mouse.wheel(0,-300); await p.waitForTimeout(500); await p.mouse.wheel(0,-300); await p.waitForTimeout(400); await p.mouse.wheel(0,-300); await p.waitForTimeout(600);
  await p.screenshot({ path: process.argv[2] + 'a.png' });
  await b.close();
})();
