/* ============================================================================
   demo.js — Comportamiento compartido por las 4 landings.
   ---------------------------------------------------------------------------
   Todo es opcional: si el JS falla o está bloqueado, la página sigue siendo
   usable y legible. Nada acá es imprescindible para leer la landing.

   Incluye la regla más importante del portafolio:
   los formularios NO envían datos a ningún lado. Muestran un mensaje que
   aclara que es una demo. GitHub Pages no es lugar para datos personales.
   ============================================================================ */
(function () {
  'use strict';

  /* --- 1. Datos de contacto de la consultora (CONFIG de cada landing) ------ */
  function aplicarConfig() {
    if (typeof CONFIG === 'undefined') return;
    var wa = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(CONFIG.mensajeWhatsApp);
    document.querySelectorAll('[data-wa]').forEach(function (a) {
      a.href = wa; a.target = '_blank'; a.rel = 'noopener';
    });
    document.querySelectorAll('[data-tel]').forEach(function (a) { a.href = 'tel:' + CONFIG.telefono; });
    document.querySelectorAll('[data-mail]').forEach(function (a) { a.href = 'mailto:' + CONFIG.email; });
  }
  aplicarConfig();

  /* --- 2. Año en el pie --------------------------------------------------- */
  document.querySelectorAll('[data-anio]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* --- 3. Sombra del encabezado al hacer scroll --------------------------- */
  var cabecera = document.querySelector('.cabecera');
  if (cabecera) {
    var alScroll = function () { cabecera.classList.toggle('is-stuck', window.scrollY > 40); };
    window.addEventListener('scroll', alScroll, { passive: true });
    alScroll();
  }

  /* --- 4. Aparición suave de las secciones -------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(function (el) { io.observe(el); });

    /* Red de seguridad: si el observador no dispara (pestaña en segundo plano,
       navegador raro), a los 3 segundos se muestra todo igual. La página nunca
       puede quedar en blanco. */
    setTimeout(function () {
      reveals.forEach(function (el) { el.classList.add('is-visible'); });
    }, 3000);
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* --- 5. Formularios de la demo — no envían nada -------------------------
     El <form> no tiene action, así que sin JS tampoco se manda nada.
     Con JS: valida como lo haría el formulario real (para que se vea cómo
     responde) y después muestra el mensaje de demo.
     ------------------------------------------------------------------------ */
  document.querySelectorAll('form[data-demo]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var ok = form.querySelector('.form-ok') ||
               document.getElementById(form.getAttribute('data-ok') || '');
      if (ok) {
        ok.classList.add('is-visible');
        ok.setAttribute('role', 'status');
        /* Lo deja a la vista sin saltar de golpe */
        if (ok.scrollIntoView) ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      form.reset();
    });
  });

  /* --- 6. Fecha y cuenta regresiva del taller ----------------------------
     La demo no puede quedar con una fecha vencida: se calcula siempre el
     próximo jueves a las 18:00. Cuando sea una landing real, reemplazar
     proximoJueves() por la fecha del taller de verdad.
     ------------------------------------------------------------------------ */
  function proximoJueves() {
    var d = new Date();
    d.setHours(18, 0, 0, 0);
    var faltan = (4 - d.getDay() + 7) % 7;          /* 4 = jueves */
    if (faltan === 0 && Date.now() > d.getTime()) faltan = 7;
    d.setDate(d.getDate() + faltan);
    return d;
  }

  var objetivos = document.querySelectorAll('[data-fecha-taller]');
  var reloj = document.querySelector('[data-cuenta]');
  if (objetivos.length || reloj) {
    var fecha = proximoJueves();
    var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    objetivos.forEach(function (el) {
      var formato = el.getAttribute('data-fecha-taller');
      if (formato === 'corta') {
        el.textContent = dias[fecha.getDay()] + ' ' + fecha.getDate() + ' de ' + meses[fecha.getMonth()];
      } else {
        el.textContent = 'Jueves ' + fecha.getDate() + ' de ' + meses[fecha.getMonth()] +
                         ', 18:00 h (Argentina)';
      }
    });

    if (reloj) {
      var partes = {
        dias:  reloj.querySelector('[data-u="dias"]'),
        horas: reloj.querySelector('[data-u="horas"]'),
        min:   reloj.querySelector('[data-u="min"]'),
        seg:   reloj.querySelector('[data-u="seg"]')
      };
      var tic = function () {
        var resta = Math.max(0, fecha.getTime() - Date.now());
        var s = Math.floor(resta / 1000);
        var dd = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600);
        var mm = Math.floor((s % 3600) / 60), ss = s % 60;
        var dos = function (n) { return n < 10 ? '0' + n : String(n); };
        if (partes.dias)  partes.dias.textContent  = dos(dd);
        if (partes.horas) partes.horas.textContent = dos(hh);
        if (partes.min)   partes.min.textContent   = dos(mm);
        if (partes.seg)   partes.seg.textContent   = dos(ss);
      };
      tic();
      setInterval(tic, 1000);
    }
  }

  /* --- 7. Filtro de búsquedas (landing de candidatos) --------------------- */
  var filtros = document.querySelectorAll('[data-filtro]');
  if (filtros.length) {
    var tarjetas = document.querySelectorAll('[data-busqueda]');
    var contador = document.querySelector('[data-conteo]');

    var filtrar = function () {
      var valores = {};
      filtros.forEach(function (f) { valores[f.getAttribute('data-filtro')] = f.value; });
      var visibles = 0;

      tarjetas.forEach(function (t) {
        var pasa = Object.keys(valores).every(function (clave) {
          return !valores[clave] || t.getAttribute('data-' + clave) === valores[clave];
        });
        t.hidden = !pasa;
        if (pasa) visibles++;
      });

      if (contador) {
        contador.textContent = visibles === 1 ? '1 búsqueda abierta' : visibles + ' búsquedas abiertas';
      }
      var vacio = document.querySelector('[data-sin-resultados]');
      if (vacio) vacio.hidden = visibles > 0;
    };

    filtros.forEach(function (f) { f.addEventListener('change', filtrar); });
    filtrar();
  }
})();
