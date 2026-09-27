/**
 * configurar.mjs — Pone el WhatsApp real y la dirección final en todo el repo.
 *
 * Son los dos datos que están repartidos en varios archivos y que, si se
 * cambian a mano, siempre queda uno sin cambiar.
 *
 * Uso:
 *   node herramientas/configurar.mjs --whatsapp=5493875551234
 *   node herramientas/configurar.mjs --base=https://julianbianchi.github.io/landings-rrhh
 *   node herramientas/configurar.mjs --whatsapp=549... --base=https://...
 *
 * El WhatsApp va con código de país y SIN +, espacios ni guiones:
 *   (0387) 15-456-7890  ->  5493874567890
 *
 * La dirección va sin barra al final. Si más adelante ponés un dominio propio,
 * se vuelve a correr con la nueva y listo.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const RAIZ = process.cwd();

const args = Object.fromEntries(process.argv.slice(2)
  .filter(a => a.startsWith('--'))
  .map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.join('=')]; }));

if (!args.whatsapp && !args.base) {
  console.error('Nada que hacer. Pasá --whatsapp=... y/o --base=...');
  process.exit(1);
}
if (args.whatsapp && !/^\d{10,15}$/.test(args.whatsapp)) {
  console.error(`"${args.whatsapp}" no parece un número válido: sólo dígitos, con código de país y sin +.`);
  process.exit(1);
}
if (args.base && !/^https?:\/\/[^\s]+[^/]$/.test(args.base)) {
  console.error(`"${args.base}" no parece una dirección válida. Va completa y sin barra al final.`);
  process.exit(1);
}

/* Lo que hay hoy en el repo y hay que reemplazar */
const BASE_ACTUAL = 'https://mind-trade-profit.github.io/landings-rrhh';

const CARPETAS_IGNORADAS = new Set(['.git', 'node_modules', 'capturas', 'assets']);

function archivos(dir) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    if (nombre.startsWith('.') || CARPETAS_IGNORADAS.has(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) { salida.push(...archivos(ruta)); continue; }
    if (['.html', '.js', '.md'].includes(extname(nombre))) salida.push(ruta);
  }
  return salida;
}

/* assets/js sí se revisa: ahí vive nav.js con tu WhatsApp */
const lista = [...archivos(RAIZ), join(RAIZ, 'assets', 'js', 'nav.js')];

let tocados = 0, cambios = 0;

for (const ruta of new Set(lista)) {
  const original = readFileSync(ruta, 'utf8');
  let texto = original;

  if (args.whatsapp) {
    /* Cualquier número de relleno que esté cargado hoy en un CONFIG o en nav.js */
    texto = texto.replace(/(whatsapp:\s*')(\d+)(')/g, (_, a, n, c) => {
      if (n !== args.whatsapp) cambios++;
      return a + args.whatsapp + c;
    });
    texto = texto.replace(/https:\/\/wa\.me\/\d+/g, 'https://wa.me/' + args.whatsapp);
  }

  if (args.base) {
    const antes = texto;
    texto = texto.split(BASE_ACTUAL).join(args.base);
    if (texto !== antes) cambios++;
  }

  if (texto !== original) {
    writeFileSync(ruta, texto);
    tocados++;
    console.log('  actualizado  ' + ruta.replace(RAIZ + '\\', '').replace(RAIZ + '/', ''));
  }
}

console.log(`\n${tocados} archivo(s) actualizado(s).`);
if (args.base) {
  console.log('\nOjo: la dirección vieja quedó reemplazada en todo el repo. Si volvés a correr');
  console.log('esto con otra dirección, primero cambiá BASE_ACTUAL en este archivo.');
}
if (args.whatsapp) {
  console.log('\nProbá un link antes de publicar: https://wa.me/' + args.whatsapp);
}
