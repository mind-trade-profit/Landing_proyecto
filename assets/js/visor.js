/**
 * visor.js — El selector de la portada: muestra las 4 landings adentro de la
 * misma página, sin que el cliente tenga que ir y volver.
 *
 * La lista de landings es la misma de nav.js. Si agregás una quinta, se suma
 * en los dos lados (y en la galería).
 */
(function () {
  'use strict';

  var LANDINGS = [
    { carpeta: '01-pedido-propuesta', nombre: 'Pedido de propuesta', publico: 'Empresas · decisión',
      resumen: 'Para la empresa que ya tiene la vacante abierta.' },
    { carpeta: '02-recurso-gratuito', nombre: 'Recurso gratuito', publico: 'Empresas · atracción',
      resumen: 'Para la que todavía no está buscando.' },
    { carpeta: '03-taller-webinar', nombre: 'Taller en vivo', publico: 'Empresas · consideración',
      resumen: 'Para la que está evaluando.' },
    { carpeta: '04-candidatos', nombre: 'Captación de candidatos', publico: 'Candidatos · oferta',
      resumen: 'El otro lado: la gente que cubre el puesto.' }
  ];

  var marco    = document.getElementById('marco');
  var pestanas = document.getElementById('pestanas');
  var titulo   = document.getElementById('vistaTitulo');
  var publico  = document.getElementById('vistaPublico');
  var aparte   = document.getElementById('abrirAparte');
  var botonesD = document.querySelectorAll('[data-ancho]');
  if (!marco || !pestanas) return;

  var actual = 0;

  /* --- 1. Las pestañas ---------------------------------------------------- */
  LANDINGS.forEach(function (l, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pestana';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', 'false');
    b.innerHTML = '<span class="pn">0' + (i + 1) + '</span>' +
                  '<span class="pt">' + l.nombre + '</span>' +
                  '<span class="pp">' + l.resumen + '</span>';
    b.addEventListener('click', function () { mostrar(i); });
    pestanas.appendChild(b);
  });
  var pestanasBtn = pestanas.querySelectorAll('.pestana');

  /* --- 2. Mostrar una landing --------------------------------------------
     El iframe se carga recién cuando se la elige: así la portada abre rápido
     aunque después se recorran las cuatro.
     ------------------------------------------------------------------------ */
  function mostrar(i, sinHash) {
    actual = i;
    var l = LANDINGS[i];
    var ruta = 'landings/' + l.carpeta + '/';

    marco.classList.add('cargando');
    marco.src = ruta;

    pestanasBtn.forEach(function (b, n) {
      b.classList.toggle('is-activa', n === i);
      b.setAttribute('aria-selected', n === i ? 'true' : 'false');
    });

    titulo.textContent  = l.nombre;
    publico.textContent = l.publico;
    aparte.href = ruta;

    if (!sinHash && history.replaceState) history.replaceState(null, '', '#' + l.carpeta);
  }

  marco.addEventListener('load', function () {
    marco.classList.remove('cargando');

    /* Si adentro del visor alguien usa un link de la landing (por ejemplo el
       del pie que lleva a otra), la pestaña de arriba se acomoda sola. */
    try {
      var ruta = marco.contentWindow.location.pathname;
      LANDINGS.forEach(function (l, i) {
        if (ruta.indexOf('/' + l.carpeta) !== -1 && i !== actual) mostrar(i);
      });
    } catch (e) { /* otra página u origen distinto: no pasa nada */ }
  });

  /* --- 3. Escritorio o celular -------------------------------------------- */
  botonesD.forEach(function (b) {
    b.addEventListener('click', function () {
      var modo = b.getAttribute('data-ancho');
      document.getElementById('escenario').setAttribute('data-modo', modo);
      botonesD.forEach(function (o) {
        o.classList.toggle('is-activa', o === b);
        o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
      });
    });
  });

  /* --- 4. Flechas del teclado --------------------------------------------- */
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || e.target.isContentEditable) return;
    if (e.key === 'ArrowLeft'  && actual > 0) mostrar(actual - 1);
    if (e.key === 'ArrowRight' && actual < LANDINGS.length - 1) mostrar(actual + 1);
  });

  /* --- 5. Arranque: respeta el # del link --------------------------------- */
  var inicial = 0;
  LANDINGS.forEach(function (l, i) {
    if (location.hash === '#' + l.carpeta) inicial = i;
  });
  mostrar(inicial, true);
})();
