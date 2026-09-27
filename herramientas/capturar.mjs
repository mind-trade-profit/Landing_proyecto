/**
 * capturar.mjs — Capturas de pantalla para revisar una landing antes de entregarla.
 *
 * Controla Edge/Chrome por el protocolo DevTools. No necesita instalar nada:
 * usa el WebSocket que ya viene en Node 22+.
 *
 * Uso:
 *   node herramientas/capturar.mjs <url> <carpeta-de-salida>
 *
 * Genera, para celular (390px) y escritorio (1440px), una tira de capturas
 * de la página entera cortada en pantallas, y reporta errores de consola.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const URL_OBJETIVO = process.argv[2];
const CARPETA      = process.argv[3];

if (!URL_OBJETIVO || !CARPETA) {
  console.error('Uso: node herramientas/capturar.mjs <url> <carpeta-de-salida>');
  process.exit(1);
}

const NAVEGADORES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
];

const VISTAS = [
  { nombre: 'movil',      ancho: 390,  alto: 844, escala: 2, movil: true  },
  { nombre: 'escritorio', ancho: 1440, alto: 900, escala: 1, movil: false }
];

const PUERTO    = 9333;
const MAX_CORTES = 12;

const dormir = ms => new Promise(r => setTimeout(r, ms));

function buscarNavegador() {
  const encontrado = NAVEGADORES.find(p => existsSync(p));
  if (!encontrado) throw new Error('No encontré Edge ni Chrome instalados.');
  return encontrado;
}

/* --- Cliente mínimo del protocolo DevTools ---------------------------------- */
class Devtools {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pendientes = new Map();
    this.oyentes = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pendientes.has(msg.id)) {
        const { ok, fallo } = this.pendientes.get(msg.id);
        this.pendientes.delete(msg.id);
        msg.error ? fallo(new Error(msg.error.message)) : ok(msg.result);
      } else if (msg.method) {
        this.oyentes.forEach(fn => fn(msg));
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
  alRecibir(fn) { this.oyentes.push(fn); }
}

async function conectar(url) {
  const ws = new WebSocket(url);
  await new Promise((ok, fallo) => {
    ws.addEventListener('open', ok, { once: true });
    ws.addEventListener('error', () => fallo(new Error('No pude conectar al navegador')), { once: true });
  });
  return new Devtools(ws);
}

async function esperarNavegador() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PUERTO}/json/version`);
      if (r.ok) return await r.json();
    } catch { /* todavía no levantó */ }
    await dormir(250);
  }
  throw new Error('El navegador no respondió en el puerto de depuración.');
}

/* --- Programa principal ------------------------------------------------------ */
const navegador = buscarNavegador();
mkdirSync(CARPETA, { recursive: true });

const proceso = spawn(navegador, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-features=Translate,MediaRouter',
  `--remote-debugging-port=${PUERTO}`,
  `--user-data-dir=${join(CARPETA, '.perfil')}`,
  'about:blank'
], { stdio: 'ignore' });

const resumen = { errores: [], vistas: [] };

try {
  const info = await esperarNavegador();
  const dt = await conectar(info.webSocketDebuggerUrl);

  const { targetId } = await dt.enviar('Target.createTarget', { url: 'about:blank' });
  const lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json();
  const objetivo = lista.find(t => t.id === targetId);
  const pagina = await conectar(objetivo.webSocketDebuggerUrl);

  await pagina.enviar('Page.enable');
  await pagina.enviar('Runtime.enable');
  await pagina.enviar('Log.enable');
  await pagina.enviar('Network.enable');

  // Registra errores de consola y peticiones fallidas
  pagina.alRecibir(m => {
    if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(m.params.entry.level)) {
      resumen.errores.push(`[${m.params.entry.level}] ${m.params.entry.text}`);
    }
    if (m.method === 'Runtime.exceptionThrown') {
      resumen.errores.push(`[excepción] ${m.params.exceptionDetails.text}`);
    }
    if (m.method === 'Network.loadingFailed' && !m.params.canceled) {
      resumen.errores.push(`[red] falló ${m.params.type}: ${m.params.errorText}`);
    }
  });

  for (const v of VISTAS) {
    await pagina.enviar('Emulation.setDeviceMetricsOverride', {
      width: v.ancho, height: v.alto, deviceScaleFactor: v.escala, mobile: v.movil
    });

    const cargada = new Promise(ok => {
      const fn = m => { if (m.method === 'Page.loadEventFired') ok(); };
      pagina.alRecibir(fn);
    });
    await pagina.enviar('Page.navigate', { url: URL_OBJETIVO });
    await cargada;
    await dormir(1200);

    // Recorre la página para que carguen las imágenes diferidas y las animaciones
    const { result: alto } = await pagina.enviar('Runtime.evaluate', {
      expression: `(async () => {
        const esperar = ms => new Promise(r => setTimeout(r, ms));
        const h = document.documentElement.scrollHeight;
        for (let y = 0; y <= h; y += ${v.alto}) { scrollTo(0, y); await esperar(320); }
        scrollTo(0, 0); await esperar(500);
        return document.documentElement.scrollHeight;
      })()`,
      awaitPromise: true, returnByValue: true
    });
    const altoTotal = alto.value;
    await dormir(2500);

    const cortes = Math.min(Math.ceil(altoTotal / v.alto), MAX_CORTES);
    for (let i = 0; i < cortes; i++) {
      const y = i * v.alto;
      await pagina.enviar('Runtime.evaluate', { expression: `scrollTo(0, ${y})` });
      await dormir(500);
      const { data } = await pagina.enviar('Page.captureScreenshot', { format: 'png' });
      const archivo = join(CARPETA, `${v.nombre}-${String(i + 1).padStart(2, '0')}.png`);
      writeFileSync(archivo, Buffer.from(data, 'base64'));
    }
    resumen.vistas.push({ vista: v.nombre, ancho: v.ancho, altoTotal, cortes });
  }

  // Datos útiles para el checklist de calidad
  const { result: chequeo } = await pagina.enviar('Runtime.evaluate', {
    expression: `(() => {
      const imgs = [...document.images];
      return JSON.stringify({
        imgsTotal: imgs.length,
        imgsRotas: imgs.filter(i => i.src && (!i.complete || i.naturalWidth === 0)).map(i => i.src.slice(0, 70)),
        // Un alt vacío es correcto en imágenes decorativas marcadas con aria-hidden
        // o sin src todavía: no se cuentan como error.
        imgsSinAlt: imgs.filter(i => !i.alt && i.src && i.getAttribute('aria-hidden') !== 'true').length,
        desbordeHorizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        bajoContraste: (() => {
          const lum = c => {
            const p = (c.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
            if (p.length < 3) return null;
            const [r, g, b] = p.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          // Busca el fondo pintado más cercano. Si por el camino hay una imagen o
          // un degradado, devuelve null: sobre eso el contraste no se puede medir
          // de forma fiable y marcarlo daría un falso positivo.
          const fondo = el => {
            let n = el;
            while (n && n !== document.documentElement) {
              const cs = getComputedStyle(n);
              if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
              const bg = cs.backgroundColor;
              if (bg && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) return bg;
              n = n.parentElement;
            }
            return 'rgb(255, 255, 255)';
          };
          // Texto apoyado sobre una foto: el contraste depende del píxel de la
          // imagen, no de un color, así que no se puede medir acá.
          const fotos = [...document.images].map(i => i.getBoundingClientRect()).filter(r => r.width > 0);
          const sobreFoto = el => {
            const r = el.getBoundingClientRect();
            return fotos.some(q => r.left >= q.left - 2 && r.right <= q.right + 2 &&
                                   r.top >= q.top - 2 && r.bottom <= q.bottom + 2);
          };

          const malos = [];
          document.querySelectorAll('p,span,li,label,dt,dd,a,b,h1,h2,h3,button').forEach(el => {
            if (!el.textContent.trim() || el.offsetParent === null) return;
            if (el.querySelector('p,span,li,h1,h2,h3,button')) return;   // sólo hojas de texto
            if (el.closest('[aria-hidden="true"]')) return;              // decorativo
            if (sobreFoto(el)) return;
            const bg = fondo(el);
            if (!bg) return;                                             // sobre imagen o degradado
            if (/rgba\\([^)]*,\\s*0?\\.\\d+\\)/.test(bg)) return;            // fondo traslúcido: no medible
            const cs = getComputedStyle(el);
            const px = parseFloat(cs.fontSize);
            const grande = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
            const minimo = grande ? 3 : 4.5;
            const a = lum(cs.color), b = lum(bg);
            if (a === null || b === null) return;
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            if (ratio < minimo) malos.push({ texto: el.textContent.trim().slice(0, 40), px: Math.round(px), ratio: +ratio.toFixed(2), minimo });
          });
          return malos.slice(0, 12);
        })()
      });
    })()`,
    returnByValue: true
  });
  resumen.chequeo = JSON.parse(chequeo.value);

  console.log(JSON.stringify(resumen, null, 2));
} finally {
  proceso.kill();
}
