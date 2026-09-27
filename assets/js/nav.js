/* ============================================================================
   nav.js — Barra del portafolio: "Anterior · Galería · Siguiente" + "2 de 4".
   ---------------------------------------------------------------------------
   Es lo único que conecta las 4 landings entre sí. Se inyecta sola: ninguna
   landing tiene la barra escrita en su HTML.

   Para agregar una quinta landing: sumá UNA línea a la lista LANDINGS y creá
   la carpeta con ese mismo nombre dentro de /landings.

   Para entregarle una landing a un cliente (sin barra, sin portafolio):
   borrá el <script src=".../nav.js"> del HTML, o poné data-barra="no" en <body>.
   ============================================================================ */
(function () {
  'use strict';

  /* --- 1. Las landings del portafolio, en orden ---------------------------- */
  var LANDINGS = [
    { carpeta: '01-pedido-propuesta', nombre: 'Pedido de propuesta', publico: 'Empresas · decisión' },
    { carpeta: '02-recurso-gratuito', nombre: 'Recurso gratuito',    publico: 'Empresas · atracción' },
    { carpeta: '03-taller-webinar',   nombre: 'Taller en vivo',      publico: 'Empresas · consideración' },
    { carpeta: '04-candidatos',       nombre: 'Captación de candidatos', publico: 'Candidatos · oferta' }
  ];

  /* --- 2. Tu contacto — ⚠️ LO ÚNICO QUE HAY QUE CAMBIAR ACÁ ----------------
     Número con código de país y SIN +, espacios ni guiones.
       Argentina: 54 + 9 + código de área sin 0 + número sin 15
       (011) 15-3456-7890  ->  5491134567890
     ------------------------------------------------------------------------ */
  var CONTACTO = {
    whatsapp: '5491123569119',
    mensaje:  'Hola Julián! Vi el portafolio de landings para consultoras de RR. HH. y quiero una para mi consultora.'
  };

  /* --- 3. ¿Corresponde mostrar la barra? ---------------------------------- */
  if (document.body.getAttribute('data-barra') === 'no') return;

  /* Adentro del visor (index.html) la navegación la ponen las pestañas de
     arriba: dos barras para lo mismo sobran y confunden. */
  if (window.self !== window.top) return;

  var ruta = decodeURIComponent(location.pathname);
  var actual = -1;
  LANDINGS.forEach(function (l, i) {
    if (ruta.indexOf('/' + l.carpeta) !== -1) actual = i;
  });
  if (actual === -1) return;   /* no estamos dentro de una landing del portafolio */

  var anterior = LANDINGS[actual - 1];
  var siguiente = LANDINGS[actual + 1];

  /* --- 4. Armado de la barra ---------------------------------------------- */
  function enlace(clase, destino, etiqueta, texto) {
    var a = document.createElement('a');
    a.className = clase;
    if (destino) { a.href = destino; } else { a.href = '#'; a.setAttribute('aria-disabled', 'true'); a.tabIndex = -1; }
    a.setAttribute('aria-label', etiqueta);
    a.innerHTML = texto;
    return a;
  }

  var barra = document.createElement('nav');
  barra.className = 'barra-porta';
  barra.setAttribute('aria-label', 'Navegación del portafolio');

  barra.appendChild(enlace(
    'bp-anterior',
    anterior ? '../' + anterior.carpeta + '/' : '',
    anterior ? 'Landing anterior: ' + anterior.nombre : 'No hay landing anterior',
    '← <span class="bp-texto">Anterior</span>'
  ));

  barra.appendChild(enlace('bp-galeria', '../../index.html', 'Volver al portafolio', '<span class="bp-texto">Portafolio</span>'));

  barra.appendChild(enlace(
    'bp-siguiente',
    siguiente ? '../' + siguiente.carpeta + '/' : '',
    siguiente ? 'Landing siguiente: ' + siguiente.nombre : 'No hay landing siguiente',
    '<span class="bp-texto">Siguiente</span> →'
  ));

  var indice = document.createElement('span');
  indice.className = 'bp-indice';
  indice.textContent = (actual + 1) + ' de ' + LANDINGS.length;
  barra.appendChild(indice);

  var titulo = document.createElement('span');
  titulo.className = 'bp-titulo';
  titulo.textContent = LANDINGS[actual].nombre;
  barra.appendChild(titulo);

  var nota = document.createElement('span');
  nota.className = 'bp-nota';
  nota.textContent = 'Demo · consultora ficticia';
  barra.appendChild(nota);

  var quiero = document.createElement('a');
  quiero.className = 'bp-quiero';
  quiero.href = 'https://wa.me/' + CONTACTO.whatsapp + '?text=' + encodeURIComponent(CONTACTO.mensaje);
  quiero.target = '_blank';
  quiero.rel = 'noopener';
  quiero.textContent = 'Quiero la mía';
  barra.appendChild(quiero);

  document.body.appendChild(barra);
  document.body.classList.add('con-barra');

  /* --- 5. Flechas del teclado -------------------------------------------- */
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    /* Si el foco está escribiendo en un campo, las flechas son del campo */
    var t = e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || e.target.isContentEditable) return;

    if (e.key === 'ArrowLeft'  && anterior)  location.href = '../' + anterior.carpeta + '/';
    if (e.key === 'ArrowRight' && siguiente) location.href = '../' + siguiente.carpeta + '/';
  });
})();
