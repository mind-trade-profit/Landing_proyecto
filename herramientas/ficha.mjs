/**
 * ficha.mjs — Convierte ficha/ficha-referidor.html en un PDF de una página.
 *
 * Es la hoja que le das al cliente referidor para que pueda explicar el
 * trabajo sin tener que explicarlo él. Si cambian los precios, se toca el HTML
 * y se vuelve a correr esto.
 *
 * Uso:
 *   node herramientas/ficha.mjs
 *
 * Avisa si el PDF se fue a dos páginas: la ficha tiene que entrar en una.
 */

import { spawn } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ   = process.cwd();
const ORIGEN = 'ficha/ficha-referidor.html';
const DESTINO = join(RAIZ, 'ficha', 'ficha-referidor.pdf');
const PUERTO = 9337;

const NAVEGADORES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
];

const dormir = ms => new Promise(r => setTimeout(r, ms));

class Devtools {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pendientes = new Map();
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pendientes.has(msg.id)) {
        const { ok, fallo } = this.pendientes.get(msg.id);
        this.pendientes.delete(msg.id);
        msg.error ? fallo(new Error(msg.error.message)) : ok(msg.result);
      }
    });
  }
  enviar(method, params = {}) {
    const id = ++this.id;
    return new Promise((ok, fallo) => {
      this.pendientes.set(id, { ok, fallo });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pendientes.has(id)) { this.pendientes.delete(id); fallo(new Error('timeout: ' + method)); }
      }, 30000);
    });
  }
}

async function conectar(url) {
  const ws = new WebSocket(url);
  await new Promise((ok, fallo) => {
    ws.addEventListener('open', ok, { once: true });
    ws.addEventListener('error', () => fallo(new Error('No pude conectar al navegador')), { once: true });
  });
  return new Devtools(ws);
}

const navegador = NAVEGADORES.find(p => existsSync(p));
if (!navegador) { console.error('No encontré Edge ni Chrome instalados.'); process.exit(1); }

const proceso = spawn(navegador, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PUERTO}`,
  `--user-data-dir=${join(RAIZ, 'ficha', '.perfil')}`,
  'about:blank'
], { stdio: 'ignore' });

try {
  let info = null;
  for (let i = 0; i < 60 && !info; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PUERTO}/json/version`);
      if (r.ok) info = await r.json();
    } catch { await dormir(250); }
  }
  if (!info) throw new Error('El navegador no respondió en el puerto de depuración.');

  const dt = await conectar(info.webSocketDebuggerUrl);
  const { targetId } = await dt.enviar('Target.createTarget', { url: 'about:blank' });
  const lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json();
  const pagina = await conectar(lista.find(t => t.id === targetId).webSocketDebuggerUrl);

  await pagina.enviar('Page.enable');
  await pagina.enviar('Runtime.enable');
  /* A4 a 96 dpi: 794 x 1123 px. Sirve para medir cuánto sobra antes de imprimir. */
  await pagina.enviar('Emulation.setDeviceMetricsOverride', {
    width: 794, height: 1123, deviceScaleFactor: 1, mobile: false
  });
  await pagina.enviar('Page.navigate', { url: pathToFileURL(resolve(RAIZ, ORIGEN)).href });
  await dormir(2200);   // tipografías

  /* El min-height de la hoja falsea la medida: se saca, se mide y se repone */
  const { result: alto } = await pagina.enviar('Runtime.evaluate', {
    expression: `(() => {
      const previo = document.body.style.minHeight;
      document.body.style.minHeight = '0';
      const h = document.body.scrollHeight;
      document.body.style.minHeight = previo;
      return h;
    })()`, returnByValue: true
  });
  const mm = (alto.value / 794 * 210).toFixed(0);   // px -> mm con el ancho como regla
  console.log(`contenido: ${mm} mm de los 297 mm de un A4`);

  const { data } = await pagina.enviar('Page.printToPDF', {
    printBackground: true,
    paperWidth: 8.27, paperHeight: 11.69,        /* A4 en pulgadas */
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
    preferCSSPageSize: true
  });

  const bytes = Buffer.from(data, 'base64');
  writeFileSync(DESTINO, bytes);

  /* Contar páginas alcanza con mirar cuántos objetos /Type /Page hay */
  const paginas = (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`ficha-referidor.pdf  ${(bytes.length / 1024).toFixed(0)} KB  ·  ${paginas} página(s)`);
  if (paginas > 1) {
    console.log('\n⚠️  Se fue a más de una página. Achicá algún bloque del HTML: la ficha');
    console.log('   tiene que entrar en una sola hoja para que se reenvíe sin fricción.');
  }
} finally {
  proceso.kill();
}
