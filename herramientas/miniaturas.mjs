/**
 * miniaturas.mjs — Genera las capturas que se ven en las tarjetas de la galería.
 *
 * Abre cada landing en Edge/Chrome sin ventana, le saca la barra del portafolio
 * (en la miniatura sobra) y guarda una captura de la primera pantalla en WebP,
 * que pesa una fracción de lo que pesaría un PNG.
 *
 * Uso:
 *   node herramientas/miniaturas.mjs
 *
 * Cada vez que cambie el diseño de una landing, correrlo de nuevo: las
 * miniaturas se regeneran solas y no quedan desactualizadas.
 */

import { spawn } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ   = process.cwd();
const SALIDA = join(RAIZ, 'assets', 'img');
const PUERTO = 9334;

const PAGINAS = [
  { archivo: 'landings/01-pedido-propuesta/index.html', nombre: 'captura-01' },
  { archivo: 'landings/02-recurso-gratuito/index.html', nombre: 'captura-02' },
  { archivo: 'landings/03-taller-webinar/index.html',   nombre: 'captura-03' },
  { archivo: 'landings/04-candidatos/index.html',       nombre: 'captura-04' }
];

/* La miniatura se ve chica en la tarjeta: con 1280x760 y calidad 72 alcanza
   y cada archivo queda por debajo de los 120 KB. */
const ANCHO = 1280, ALTO = 760, CALIDAD = 72;

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
mkdirSync(SALIDA, { recursive: true });

const proceso = spawn(navegador, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PUERTO}`,
  `--user-data-dir=${join(SALIDA, '.perfil')}`,
  'about:blank'
], { stdio: 'ignore' });

try {
  // Espera a que el navegador levante
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
  await pagina.enviar('Emulation.setDeviceMetricsOverride', {
    width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false
  });

  for (const p of PAGINAS) {
    const url = pathToFileURL(resolve(RAIZ, p.archivo)).href;
    await pagina.enviar('Page.navigate', { url });
    await dormir(2200);   // tipografías, animaciones de entrada y cuenta regresiva

    // La barra del portafolio no va en la miniatura: la tarjeta ya dice cuál es
    await pagina.enviar('Runtime.evaluate', {
      expression: `(() => {
        const barra = document.querySelector('.barra-porta');
        if (barra) barra.remove();
        document.body.classList.remove('con-barra');
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
        scrollTo(0, 0);
      })()`
    });
    await dormir(700);

    const { data } = await pagina.enviar('Page.captureScreenshot', {
      format: 'webp', quality: CALIDAD,
      clip: { x: 0, y: 0, width: ANCHO, height: ALTO, scale: 1 }
    });
    const destino = join(SALIDA, p.nombre + '.webp');
    writeFileSync(destino, Buffer.from(data, 'base64'));
    console.log(`${p.nombre}.webp  ${(Buffer.from(data, 'base64').length / 1024).toFixed(0)} KB`);
  }
} finally {
  proceso.kill();
}
