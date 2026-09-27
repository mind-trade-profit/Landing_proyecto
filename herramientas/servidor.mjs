/**
 * servidor.mjs — Servidor estático para ver el portafolio en el navegador.
 *
 * Abrir los archivos con doble clic (file://) alcanza para leerlos, pero
 * conviene revisarlos servidos por HTTP: es como los va a ver GitHub Pages.
 *
 * Uso:
 *   node herramientas/servidor.mjs            (puerto 8787)
 *   node herramientas/servidor.mjs 9000
 *
 * No necesita instalar nada: sólo Node.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const RAIZ   = process.cwd();
const PUERTO = Number(process.argv[2]) || 8787;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.pdf':  'application/pdf',
  '.txt':  'text/plain; charset=utf-8'
};

createServer(async (pedido, respuesta) => {
  try {
    const url = new URL(pedido.url, 'http://localhost');
    let ruta = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');

    // Nadie sale de la carpeta del proyecto
    const destino = join(RAIZ, ruta);
    if (!destino.startsWith(RAIZ)) {
      respuesta.writeHead(403).end('Fuera del proyecto');
      return;
    }

    let archivo = destino;
    const info = await stat(archivo).catch(() => null);
    if (!info || info.isDirectory()) archivo = join(archivo, 'index.html');

    const contenido = await readFile(archivo);
    respuesta.writeHead(200, {
      'Content-Type': TIPOS[extname(archivo).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    respuesta.end(contenido);
  } catch {
    respuesta.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    respuesta.end('<h1>404</h1><p>No encontré ese archivo. <a href="/">Volver a la galería</a></p>');
  }
}).listen(PUERTO, () => {
  console.log(`Portafolio en http://localhost:${PUERTO}/`);
});
