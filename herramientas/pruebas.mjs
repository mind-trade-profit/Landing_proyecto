/**
 * pruebas.mjs — Control funcional de las 4 landings.
 *
 * capturar.mjs mira cómo se ven; esto mira si funcionan: la barra del
 * portafolio, las flechas del teclado, los formularios de demo, el
 * consentimiento obligatorio del CV y los filtros de búsquedas.
 *
 * Uso:
 *   node herramientas/pruebas.mjs
 *
 * Tiene que dar 20/20 antes de mandarle el link a una consultora.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = process.cwd();   /* se corre desde la raíz del proyecto */
const PUERTO = 9335;
const dormir = ms => new Promise(r => setTimeout(r, ms));

const NAVEGADORES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'
];

class Dt {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.p = new Map();
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.p.has(m.id)) {
        const { ok, fallo } = this.p.get(m.id); this.p.delete(m.id);
        m.error ? fallo(new Error(m.error.message)) : ok(m.result);
      }
    });
  }
  enviar(method, params = {}) {
    const id = ++this.id;
    return new Promise((ok, fallo) => {
      this.p.set(id, { ok, fallo });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.p.has(id)) { this.p.delete(id); fallo(new Error('timeout ' + method)); } }, 20000);
    });
  }
}
async function conectar(url) {
  const ws = new WebSocket(url);
  await new Promise((ok, fallo) => {
    ws.addEventListener('open', ok, { once: true });
    ws.addEventListener('error', () => fallo(new Error('sin conexión')), { once: true });
  });
  return new Dt(ws);
}

const nav = NAVEGADORES.find(p => existsSync(p));
const proc = spawn(nav, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${join(RAIZ, '.tmp-perfil')}`, 'about:blank'], { stdio: 'ignore' });

const resultados = [];
const revisar = (nombre, ok, detalle = '') => resultados.push({ nombre, ok, detalle });

try {
  let info = null;
  for (let i = 0; i < 60 && !info; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PUERTO}/json/version`); if (r.ok) info = await r.json(); }
    catch { await dormir(250); }
  }
  const dt = await conectar(info.webSocketDebuggerUrl);
  const { targetId } = await dt.enviar('Target.createTarget', { url: 'about:blank' });
  const lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json();
  const pag = await conectar(lista.find(t => t.id === targetId).webSocketDebuggerUrl);
  await pag.enviar('Page.enable'); await pag.enviar('Runtime.enable');
  await pag.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

  const evaluar = async expr => {
    const { result } = await pag.enviar('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return result.value;
  };
  const ir = async archivo => {
    await pag.enviar('Page.navigate', { url: pathToFileURL(resolve(RAIZ, archivo)).href });
    await dormir(1400);
  };

  const carpetas = ['01-pedido-propuesta', '02-recurso-gratuito', '03-taller-webinar', '04-candidatos'];

  // --- Barra del portafolio en las 4 ---
  for (let i = 0; i < carpetas.length; i++) {
    await ir(`landings/${carpetas[i]}/index.html`);
    const r = await evaluar(`JSON.stringify({
      barra: !!document.querySelector('.barra-porta'),
      indice: (document.querySelector('.bp-indice')||{}).textContent,
      prev: (document.querySelector('.bp-anterior')||{}).getAttribute ? document.querySelector('.bp-anterior').getAttribute('href') : null,
      prevOff: (document.querySelector('.bp-anterior')||{}).getAttribute ? document.querySelector('.bp-anterior').getAttribute('aria-disabled') : null,
      next: document.querySelector('.bp-siguiente') ? document.querySelector('.bp-siguiente').getAttribute('href') : null,
      nextOff: document.querySelector('.bp-siguiente') ? document.querySelector('.bp-siguiente').getAttribute('aria-disabled') : null,
      galeria: document.querySelector('.bp-galeria') ? document.querySelector('.bp-galeria').getAttribute('href') : null,
      quiero: document.querySelector('.bp-quiero') ? document.querySelector('.bp-quiero').href.slice(0,30) : null,
      conBarra: document.body.classList.contains('con-barra'),
      wa: (document.querySelector('[data-wa]')||{}).href || null
    })`);
    const d = JSON.parse(r);
    revisar(`${carpetas[i]} · barra "${d.indice}"`, d.barra && d.indice === `${i + 1} de 4` && d.conBarra, JSON.stringify(d));
    const prevEsperado = i === 0 ? null : `../${carpetas[i - 1]}/`;
    const nextEsperado = i === 3 ? null : `../${carpetas[i + 1]}/`;
    revisar(`${carpetas[i]} · anterior/siguiente`,
      (i === 0 ? d.prevOff === 'true' : d.prev === prevEsperado) &&
      (i === 3 ? d.nextOff === 'true' : d.next === nextEsperado),
      `prev=${d.prev} next=${d.next}`);
    revisar(`${carpetas[i]} · WhatsApp desde CONFIG`, !!d.wa && d.wa.startsWith('https://wa.me/'), d.wa);
  }

  // --- Flecha del teclado ---
  await ir('landings/01-pedido-propuesta/index.html');
  await pag.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await dormir(1200);
  const urlDespues = await evaluar('location.pathname');
  revisar('Flecha derecha lleva a la landing 2', urlDespues.includes('02-recurso-gratuito'), urlDespues);

  // --- Formulario de demo: valida y no envía ---
  await ir('landings/01-pedido-propuesta/index.html');
  const vacio = await evaluar(`(() => {
    const f = document.querySelector('form[data-demo]');
    f.querySelector('button[type=submit]').click();
    return document.querySelector('.form-ok').classList.contains('is-visible');
  })()`);
  revisar('Formulario vacío NO muestra confirmación', vacio === false, String(vacio));

  const lleno = await evaluar(`(() => {
    const f = document.querySelector('form[data-demo]');
    f.nombre.value='Prueba'; f.empresa.value='Prueba SA'; f.puesto.value='Operario'; f.telefono.value='3870000000';
    f.querySelector('button[type=submit]').click();
    return { ok: document.querySelector('.form-ok').classList.contains('is-visible'), limpio: f.nombre.value === '', url: location.href.split('#')[0] };
  })()`);
  revisar('Formulario completo muestra confirmación y se limpia', lleno.ok && lleno.limpio, JSON.stringify(lleno));

  // --- Consentimiento obligatorio en la carga de CV ---
  await ir('landings/04-candidatos/index.html');
  const consent = await evaluar(`(() => {
    const f = document.querySelector('#cargar-cv form[data-demo]');
    const c = f.querySelector('input[name=consentimiento]');
    return { requerido: c.required, tildado: c.checked };
  })()`);
  revisar('CV: consentimiento requerido y sin tildar', consent.requerido && !consent.tildado, JSON.stringify(consent));

  // --- Filtros de búsquedas ---
  const filtros = await evaluar(`(() => {
    const visibles = () => [...document.querySelectorAll('[data-busqueda]')].filter(t => !t.hidden).length;
    const inicio = visibles();
    const sel = document.querySelector('[data-filtro=zona]');
    sel.value = 'tucuman'; sel.dispatchEvent(new Event('change'));
    const tuc = visibles();
    const conteo = document.querySelector('[data-conteo]').textContent;
    const s2 = document.querySelector('[data-filtro=rubro]');
    s2.value = 'it'; s2.dispatchEvent(new Event('change'));
    const vacio = visibles();
    const cartel = !document.querySelector('[data-sin-resultados]').hidden;
    return { inicio, tuc, conteo, vacio, cartel };
  })()`);
  revisar('Filtro por zona deja 2 de 8', filtros.inicio === 8 && filtros.tuc === 2, JSON.stringify(filtros));
  revisar('Sin resultados muestra el cartel', filtros.vacio === 0 && filtros.cartel === true, JSON.stringify(filtros));

  // --- Galería: sin barra y con las 4 capturas ---
  await ir('index.html');
  const gal = await evaluar(`JSON.stringify({
    barra: !!document.querySelector('.barra-porta'),
    capturas: [...document.images].filter(i => i.complete && i.naturalWidth > 0).length,
    enlaces: [...document.querySelectorAll('a[href^="landings/"]')].length
  })`);
  const g = JSON.parse(gal);
  revisar('Galería sin barra del portafolio', g.barra === false, gal);
  revisar('Galería: 4 capturas cargadas', g.capturas === 4, gal);

} finally {
  proc.kill();
}

let fallan = 0;
for (const r of resultados) {
  if (!r.ok) fallan++;
  console.log(`${r.ok ? 'OK  ' : 'FALLA'} ${r.nombre}${r.ok ? '' : '  → ' + r.detalle}`);
}
console.log(`\n${resultados.length - fallan}/${resultados.length} verificaciones pasaron`);
