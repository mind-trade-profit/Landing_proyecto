# Landings embudo para consultoras de RR. HH.

Portafolio navegable con cuatro landings de demostración para consultoras de recursos humanos de
Argentina. Cada una resuelve un paso distinto del embudo: tres traen empresas con vacantes y la
cuarta trae los candidatos para cubrirlas.

**Ver el portafolio:** abrí `index.html`, o publicalo en GitHub Pages (instrucciones abajo).

| # | Landing | Para quién | Acción principal |
| --- | --- | --- | --- |
| 01 | [Pedido de propuesta](landings/01-pedido-propuesta/) | Empresas con la vacante abierta | Pedir propuesta |
| 02 | [Recurso gratuito](landings/02-recurso-gratuito/) | Empresas que todavía no buscan | Descargar la plantilla |
| 03 | [Taller en vivo](landings/03-taller-webinar/) | Empresas que están evaluando | Reservar mi lugar |
| 04 | [Captación de candidatos](landings/04-candidatos/) | Personas que buscan trabajo | Cargar mi CV |

---

## Las reglas de la demo

La consultora de las demos, **Talento Norte Consultores**, no existe: es una marca inventada para
no usar el nombre, el logo ni los datos de ninguna consultora real.

1. **Ningún formulario envía datos.** Validan como el formulario real y después muestran un mensaje
   que aclara que es una demo. GitHub Pages es público y no es lugar para datos personales.
2. **Logos, testimonios, números y búsquedas llevan el rótulo `Ejemplo`.** Un testimonio inventado
   sin rótulo es una mentira; con rótulo es una maqueta.
3. **Las demos van con `noindex`.** Una consultora ficticia no tiene por qué aparecer en Google.
   La galería sí se indexa: es el portafolio.
4. **Nada de fotos de personas reales con nombres inventados.** Donde iría una foto va un avatar
   con iniciales, y en la landing del cliente se reemplaza por la suya.

---

## Estructura

```
landings-rrhh/
  index.html                      galería: las 4 tarjetas con captura y el embudo
  assets/
    css/base.css                  variables de marca, botones, tarjetas, formularios y la barra
    js/nav.js                     la barra Anterior · Galería · Siguiente + "2 de 4"
    js/demo.js                    formularios de demo, cuenta regresiva, filtros, animaciones
    img/                          logo y capturas WebP de la galería
  landings/
    01-pedido-propuesta/index.html
    02-recurso-gratuito/index.html
    02-recurso-gratuito/gracias.html
    02-recurso-gratuito/secuencia-emails.md
    03-taller-webinar/index.html
    04-candidatos/index.html
  legal/politica-privacidad.html  modelo sobre la Ley 25.326
  ficha/ficha-referidor.html      la hoja que le das al cliente referidor
  ficha/ficha-referidor.pdf       la misma, lista para reenviar por WhatsApp
  herramientas/
    servidor.mjs                  servidor estático para ver el sitio por HTTP
    capturar.mjs                  capturas + chequeo de contraste, desbordes y errores
    miniaturas.mjs                regenera las capturas de la galería en WebP
    pruebas.mjs                   control funcional: barra, formularios, filtros
    og.mjs + plantilla-og.html    las imágenes de vista previa de 1200x630
    configurar.mjs                pone el WhatsApp real y la dirección final
    ficha.mjs                     convierte la ficha del referidor en PDF
```

Cada landing es un archivo HTML con su propio `<style>`. Lo que comparten las cuatro vive en
`assets/css/base.css`; lo que es de una sola landing vive adentro de esa landing.

---

## Cómo verlo

```bash
node herramientas/servidor.mjs
```

Abre en `http://localhost:8787/`. Doble clic en `index.html` también funciona, pero conviene verlo
servido por HTTP porque así lo va a servir GitHub Pages.

---

## Cómo revisar una landing antes de entregarla

```bash
node herramientas/capturar.mjs http://localhost:8787/landings/01-pedido-propuesta/ capturas/01
```

Abre Edge o Chrome sin ventana, recorre la página en celular (390 px) y escritorio (1440 px),
guarda la tira de capturas y devuelve un informe con:

- errores de consola y peticiones de red fallidas,
- imágenes rotas o sin texto alternativo,
- desborde horizontal (la causa número uno de que algo se vea mal en el celular),
- textos que no llegan al contraste mínimo de WCAG AA.

**Esa lista tiene que salir vacía antes de mandarle el link a nadie.** Las cuatro landings y la
galería la tienen vacía hoy.

`capturar.mjs` mira cómo se ve. Para mirar si **funciona**:

```bash
node herramientas/pruebas.mjs
```

Comprueba la barra del portafolio en las cuatro (el "3 de 4", las flechas, el link a la galería),
las flechas del teclado, que los formularios validen y no envíen nada, que el consentimiento del CV
sea obligatorio y no venga tildado, y que los filtros de búsquedas escondan y cuenten bien.
Hoy da **20/20**.

Para regenerar las capturas de la galería después de cambiar un diseño:

```bash
node herramientas/miniaturas.mjs
```

---

## Agregar una quinta landing

1. Crear `landings/05-lo-que-sea/index.html` (copiar la que más se parezca).
2. Sumar **una línea** a la lista `LANDINGS` en `assets/js/nav.js`.
3. Agregar la tarjeta en `index.html` y correr `node herramientas/miniaturas.mjs`.

La barra recalcula sola el "5 de 5", las flechas y el orden.

---

## Adaptar una landing a un cliente real

1. **Colores y tipografías:** el bloque 1 de `assets/css/base.css`. Nada más.
2. **Contacto:** la constante `CONFIG` arriba de cada HTML (WhatsApp, teléfono, correo).
   El número va con código de país y sin `+`, espacios ni guiones: `(0387) 15-456-7890` → `5493874567890`.
3. **Formularios:** hoy no envían. Conectarlos a Netlify Forms, Formspree o al correo de la
   consultora, y quitar el bloque `.aviso-demo`.
4. **Rótulos `Ejemplo`:** se borran cuando entran los datos reales del cliente. Si un dato no es
   real, el rótulo se queda.
5. **`noindex`:** cambiar a `index, follow` en la landing del cliente.
6. **Barra del portafolio:** borrar la línea `<script src=".../nav.js">`, o poner `data-barra="no"`
   en el `<body>`.
7. **Política de privacidad:** completar los datos entre corchetes en `legal/politica-privacidad.html`.
   Registrar las bases de datos ante la Agencia de Acceso a la Información Pública le corresponde a
   la consultora.

---

## La ficha del referidor

`ficha/ficha-referidor.pdf` es la hoja de una página que le das al cliente que te va a recomendar:
las 4 landings, los paquetes, su comisión del 15 % y el mensaje listo para reenviar. Se regenera
después de tocar el HTML:

```bash
node herramientas/ficha.mjs
```

Avisa si el contenido se fue de una página, que es lo único que no puede pasar: una ficha de dos
hojas no se reenvía.

> **Ojo con los precios.** La ficha los tiene. Si no querés que sean públicos, sumá `ficha/` al
> `.gitignore` **antes** de publicar el repositorio y mandá el PDF por WhatsApp. Lo que está en un
> repositorio público lo ve cualquiera, aunque no haya ningún link que lleve hasta ahí.

---

## Antes de publicar: el WhatsApp y la dirección

Son los dos datos repartidos en varios archivos. Se cambian de una:

```bash
node herramientas/configurar.mjs --whatsapp=5493875551234 --base=https://mind-trade-profit.github.io/Landing_proyecto
```

El número va con código de país y sin `+`, espacios ni guiones. La dirección, sin barra al final.

En las demos, el WhatsApp apunta a **tu** número y no al de la consultora ficticia: si una
consultora toca el botón mientras mira la demo, cae en un chat de verdad y el mensaje ya dice de
qué landing viene. En la landing de un cliente se pone el número del cliente.

Las imágenes de vista previa (las que se ven al pegar el link en WhatsApp o LinkedIn) se regeneran con:

```bash
node herramientas/og.mjs
```

---

## Publicar en GitHub Pages

El portafolio vive en **https://github.com/mind-trade-profit/Landing_proyecto** (público, que es
lo que Pages necesita en el plan gratuito).

```bash
git push -u origin main
```

Si el push pide credenciales, primero:

```bash
gh auth login
```

**2. Encender Pages.** En el repositorio, **Settings → Pages**: en *Source* elegir
**Deploy from a branch**, rama `main`, carpeta `/ (root)`, y guardar. El archivo `.nojekyll` ya
está, así que GitHub no va a procesar el sitio con Jekyll ni saltear carpetas.

**3. Esperar** hasta diez minutos y abrir `https://mind-trade-profit.github.io/Landing_proyecto/`.

**4. Revisar, en el celular y en la computadora:**

- la galería y las cuatro landings abren y se ven bien;
- la barra pasa de una a otra y el botón «Quiero la mía» abre tu WhatsApp;
- pegar el link en un chat y confirmar que aparece la vista previa con la imagen;
- correr el control funcional contra el sitio publicado, no sólo contra los archivos locales.

**5. Repartir el link:** perfil de LinkedIn, firma de WhatsApp y el mensaje del referidor.

**Lo que GitHub Pages no es:** no se puede usar para operar un negocio ni para procesar datos
personales, y el sitio publicado no puede superar 1 GB (hoy pesa menos de 500 KB). Sirve para el
portafolio. Las landings de los clientes van en Netlify o en el alojamiento del cliente.

---

## Pendientes

- [ ] Correr `configurar.mjs` con el WhatsApp real y la dirección definitiva.
- [ ] Armar el PDF de la landing 02 (hoy el botón de descarga avisa que es una demo).
- [x] Imágenes `og:` de 1200×630 para la vista previa al compartir los links.
- [x] Ficha de una página en PDF para que el referidor la reenvíe.
- [ ] Decidir si `ficha/` se publica o queda fuera del repositorio (tiene los precios).
- [ ] Completar el WhatsApp en la ficha y volver a generar el PDF.
