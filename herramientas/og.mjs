/**
 * og.mjs — Genera las imágenes de vista previa (og:image) de 1200x630.
 *
 * Son las que se ven cuando alguien pega el link en WhatsApp, LinkedIn o
 * Facebook. Sin ellas el link se comparte vacío, que es la diferencia entre
 * que lo abran y que lo pasen de largo.
 *
 * Usa herramientas/plantilla-og.html: le cambia los textos a cada una y le
 * saca una captura. Para retocar el diseño, se toca la plantilla.
 *
 * Uso:
 *   node herramientas/og.mjs
 */

import { spawn } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ   = process.cwd();
const SALIDA = join(RAIZ, 'assets', 'img');
const PUERTO = 9336;
const ANCHO = 1200, ALTO = 630;

/* PNG y no WebP: las vistas previas de WhatsApp y LinkedIn siguen siendo más
   confiables con PNG o JPEG. Con colores planos igual pesan poco. */
const PAGINAS = [
  {
    nombre: 'og-galeria', tema: 'clara',
    marca: 'Landings embudo para consultoras de RR. HH.',
    bajada: 'Portafolio de landings a medida · Argentina',
    titulo: 'Landings que traen <em>empresas con vacantes</em> y candidatos',
    chip: '4 demos navegables', accion: 'Ver el portafolio'
  },
  {
    nombre: 'og-01', tema: 'oscura',
    titulo: 'Cubrimos tu vacante con <em>tres finalistas evaluados</em>',
    chip: 'Para empresas', accion: 'Pedir propuesta'
  },
  {
    nombre: 'og-02', tema: 'clara',
    titulo: 'La plantilla para definir un puesto <em>antes</em> del aviso',
    chip: 'Descarga gratuita', accion: 'Descargar el PDF'
  },
  {
    nombre: 'og-03', tema: 'oscura',
    titulo: 'Entrevistar por competencias en <em>45 minutos</em>',
    chip: 'Taller en vivo · gratis', accion: 'Reservar mi lugar'
  },
  {
    nombre: 'og-04', tema: 'clara',
    titulo: 'Encontrá tu próximo trabajo en <em>el norte</em>',
    chip: 'Búsquedas abiertas', accion: 'Cargar mi CV'
  }
];

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
  `--user-data-dir=${join(SALIDA, '.perfil-og')}`,
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
  await pagina.enviar('Emulation.setDeviceMetricsOverride', {
    width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false
  });

  const plantilla = pathToFileURL(resolve(RAIZ, 'herramientas/plantilla-og.html')).href;

  for (const p of PAGINAS) {
    await pagina.enviar('Page.navigate', { url: plantilla });
    await dormir(1500);   // que carguen las tipografías

    await pagina.enviar('Runtime.evaluate', {
      expression: `(() => {
        const d = ${JSON.stringify(p)};
        document.body.className = d.tema === 'clara' ? 'clara' : '';
        if (d.marca)  document.getElementById('marca').textContent  = d.marca;
        if (d.bajada) document.getElementById('bajada').textContent = d.bajada;
        document.getElementById('titulo').innerHTML = d.titulo;
        document.getElementById('chip').textContent = d.chip;
        document.getElementById('accion').textContent = d.accion;
      })()`
    });
    await dormir(400);

    const { data } = await pagina.enviar('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: ANCHO, height: ALTO, scale: 1 }
    });
    const bytes = Buffer.from(data, 'base64');
    writeFileSync(join(SALIDA, p.nombre + '.png'), bytes);
    console.log(`${p.nombre}.png  ${(bytes.length / 1024).toFixed(0)} KB`);
  }
} finally {
  proceso.kill();
}
