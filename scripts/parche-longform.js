/* ============================================================================
  NIVEL 1 · TARJETA / TEASER DE PORTADA
  NIVEL 2 · PÁGINA DE DESTINO A ANCHO COMPLETO (LONGFORM)
   ----------------------------------------------------------------------------
  Aplica al portal el flujo de dos niveles:

    Nivel 1  La tarjeta del muro: cinta de categoría, titular, subtítulo,
             entrada y el botón «Leer reportaje completo». Sin cuadros ni
             bordes recargados: tipografía editorial y aire.

    Nivel 2  La nota a lo ancho: sin barras laterales, columna de lectura de
             780-850 px y con imágenes o infografías que pueden expandirse a
             ancho completo (full-bleed). Ficha técnica de contacto al final.

  El script es idempotente: se puede volver a ejecutar sin duplicar nada.

  Uso:  node scripts/parche-longform.js
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const OBJETIVOS = [
  path.join(RAIZ, 'editor', 'index.html'),
  path.join(RAIZ, 'publicar', 'index.html'),
  path.join(RAIZ, 'index.html')
];

/* -------------------------------------------------------------------------- */
/* CSS                                                                         */
/* -------------------------------------------------------------------------- */

const CSS = `/*__LONGFORM_INICIO__*/
    /* ================================================================
       NIVEL 1 · TARJETA / TEASER DE PORTADA
       Cinta de categoría, titular, subtítulo, entrada y llamada a la
       acción. Sin cajas ni bordes: solo aire y tipografía.
       ================================================================ */
    .teaser { display: flex; flex-direction: column; height: 100%; }
    .teaser-imagen { display: block; margin-bottom: 1.1rem; }
    .teaser-imagen img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
    .teaser-cintillo { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; margin: 0 0 0.7rem; font-family: 'Inter', sans-serif; font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.11em; }
    .teaser-categoria { color: #8c1d2f; }
    .teaser-numero { color: #9aa0a8; font-weight: 600; letter-spacing: 0.04em; }
    .teaser-titular { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(1.35rem, 2.2vw, 1.75rem); font-weight: 800; line-height: 1.18; letter-spacing: -0.015em; color: #0b2240; margin: 0 0 0.5rem; }
    .teaser-subtitulo { font-family: 'EB Garamond', Georgia, serif; font-size: 1.08rem; line-height: 1.4; font-style: italic; color: #6b5b2e; margin: 0 0 0.75rem; }
    .teaser-lead { font-family: 'Inter', sans-serif; font-size: 0.95rem; line-height: 1.65; color: #3f4650; margin: 0 0 1.15rem; }
    .teaser-cta { display: inline-flex; align-items: center; gap: 0.45rem; align-self: flex-start; font-family: 'Inter', sans-serif; font-size: 0.76rem; font-weight: 800; letter-spacing: 0.02em; color: #0b2240; text-decoration: none; padding-bottom: 3px; border-bottom: 2px solid #c59b27; transition: gap .18s ease, color .18s ease; }
    .teaser-cta:hover { gap: 0.8rem; color: #8c1d2f; border-bottom-color: #8c1d2f; }
    .teaser-cta:focus-visible { outline: 2px solid #c59b27; outline-offset: 3px; }
    .teaser-firma { font-family: 'Inter', sans-serif; font-size: 0.7rem; color: #8b919b; margin: 1.1rem 0 0; }
    .teaser-acciones { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 1rem; }
    .teaser-acciones button { background: none; border: 1px solid #d8d4cc; border-radius: 20px; padding: 4px 11px; font-family: 'Inter', sans-serif; font-size: 0.68rem; font-weight: 700; color: #5b6270; cursor: pointer; }
    .teaser-acciones button:hover { border-color: #0b2240; color: #0b2240; }
    /*__LONGFORM_FIN__*/
`;

/* -------------------------------------------------------------------------- */
/* Marcado de la tarjeta                                                      */
/* -------------------------------------------------------------------------- */

const TARJETA_VIEJA = `      return '<article class="cronica-card" id="card-cronica-' + esc(c.id) + '">' +
        '<div>' +
          '<div style="display: flex; justify-content: space-between; gap: 0.5rem; font-family: \\'Inter\\', sans-serif; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: #854d0e; margin-bottom: 0.5rem;">' +
            '<span>' + esc(c.badge) + '</span>' +
            '<span style="color: #a3a3a3;">Nota ' + (i + 1) + ' de ' + visibles.length + (c.video ? ' · 🎬 video' : '') + '</span>' +
          '</div>' +
          (img ? '<div class="muro-foto" role="button" tabindex="0" onclick="abrirFichaCronica(\\'' + esc(c.id) + '\\')" title="Abrir la nota completa"><img src="' + esc(img) + '" alt="' + escTexto(c.titulo) + '" loading="lazy"><span class="muro-foto-pie">📸 Foto destacada · toque para abrir la nota</span></div>' : '') +
          '<h4 style="font-family: \\'Playfair Display\\', serif; font-size: 1.25rem; font-weight: 800; color: #0b2240; line-height: 1.25; margin-bottom: 0.35rem;">' + esc(c.titulo) + '</h4>' +
          (c.subtitulo ? '<p style="font-family: \\'EB Garamond\\', Georgia, serif; font-size: 1.02rem; line-height: 1.45; color: #6b5b2e; margin: 0 0 0.55rem; font-style: italic;">' + esc(c.subtitulo) + '</p>' : '') +
          '<p style="font-family: \\'Inter\\', sans-serif; font-size: 0.8125rem; color: #4a4a4a; line-height: 1.55;">' + esc(c.entradilla) + '</p>' +
          (tieneCuerpo ? '<div class="muro-leer"><a class="btn-leer-mas" href="cronica.html?c=' + encodeURIComponent(c.id) + '" title="Leer la nota completa"><span>Leer la nota completa →</span></a></div>' : '') +
          (tieneCuerpo ? '<div class="cronica-texto-expandido" id="cronica-expandida-' + esc(c.id) + '">' + textoAParrafos(c.cuerpo) + '</div>' : '') +
          htmlAudioDeModulo(c, '🎧 Audio de la crónica') +
        '</div>' +
        '<div style="border-top: 1px solid #e5e5e5; padding-top: 0.75rem; margin-top: 1rem;">' +
          '<div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">' +
            '<span style="font-family: \\'Inter\\', sans-serif; font-size: 0.72rem; color: #666666;">✍️ ' + esc(c.autor) + '</span>' +
            '<span class="muro-contador">' + (comentarios ? ('💬 ' + comentarios + ' comentario(s)') : '') + '</span>' +
          '</div>' +
          '<div class="gal-acciones" style="margin-top: 0.6rem;">' +
            '<button type="button" class="gal-btn" onclick="abrirFichaCronica(\\'' + esc(c.id) + '\\')">📖 Nota completa</button>' +
            (c.video ? '<button type="button" class="gal-btn" onclick="abrirFichaCronica(\\'' + esc(c.id) + '\\')">🎬 Ver video</button>' : '') +
            '<button type="button" class="gal-btn" onclick="abrirFichaCronica(\\'' + esc(c.id) + '\\')">💬 Comentarios (' + comentarios + ')</button>' +
            '<button type="button" class="gal-btn" onclick="compartirCronica(\\'' + esc(c.id) + '\\')">🔗 Compartir</button>' +
            '<button type="button" class="gal-btn" onclick="compartirCronicaEnRed(\\'' + esc(c.id) + '\\', \\'qr\\')">📱 QR</button>' +
          '</div>' +
        '</div>' +
      '</article>';`;

const TARJETA_NUEVA = `      /* NIVEL 1 · tarjeta/teaser: cinta de categoría, titular, subtítulo,
         entrada y llamada a la acción. Sin cajas ni bordes. */
      return '<article class="teaser" id="card-cronica-' + esc(c.id) + '">' +
        (img ? '<a class="teaser-imagen" href="cronica.html?c=' + encodeURIComponent(c.id) + '" tabindex="-1" aria-hidden="true"><img src="' + esc(img) + '" alt="" loading="lazy"></a>' : '') +
        '<p class="teaser-cintillo">' +
          '<span class="teaser-categoria">' + esc(c.badge || 'Crónica') + '</span>' +
          '<span class="teaser-numero">Nota ' + (i + 1) + ' de ' + visibles.length + (c.video ? ' · video' : '') + '</span>' +
        '</p>' +
        '<h3 class="teaser-titular">' + esc(c.titulo) + '</h3>' +
        (c.subtitulo ? '<p class="teaser-subtitulo">' + esc(c.subtitulo) + '</p>' : '') +
        '<p class="teaser-lead">' + esc(c.entradilla) + '</p>' +
        (tieneCuerpo ? '<a class="teaser-cta" href="cronica.html?c=' + encodeURIComponent(c.id) + '">Leer reportaje completo <span aria-hidden="true">→</span></a>' : '') +
        '<p class="teaser-firma">✍️ ' + esc(c.autor) + (c.fecha ? ' · ' + esc(c.fecha) : '') + '</p>' +
        '<div class="teaser-acciones">' +
          '<button type="button" onclick="abrirFichaCronica(\\'' + esc(c.id) + '\\')">💬 Comentarios (' + comentarios + ')</button>' +
          '<button type="button" onclick="compartirCronica(\\'' + esc(c.id) + '\\')">🔗 Compartir</button>' +
          '<button type="button" onclick="compartirCronicaEnRed(\\'' + esc(c.id) + '\\', \\'qr\\')">📱 QR</button>' +
        '</div>' +
        htmlAudioDeModulo(c, '🎧 Audio de la crónica') +
      '</article>';`;

/* -------------------------------------------------------------------------- */
/* NIVEL 2 · CSS de la página de destino (publicar/cronica.html)              */
/* -------------------------------------------------------------------------- */

const CSS_PAGINA = `/*__CSS_LONGFORM_INICIO__*/
  /* ================================================================
     NIVEL 2 · PÁGINA DE DESTINO A ANCHO COMPLETO (LONGFORM)
     Sin barras laterales. Columna de lectura de 780-850 px para el
     texto, con imágenes e infografías que pueden abrirse a ancho
     completo (full-bleed). Ficha técnica de contacto al final.
     ================================================================ */
  .nota-zona { max-width: 1280px; margin: 0 auto; }

  /* Portada inmersiva a sangre */
  .longform-portada { position: relative; margin: 0 0 2.6rem; background: #0b1118; }
  .longform-portada-foto { width: 100%; max-height: 74vh; overflow: hidden; }
  .longform-portada-foto img { width: 100%; height: 100%; max-height: 74vh; object-fit: cover; display: block; }
  .longform-portada-velo { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(11,17,24,.12) 0%, rgba(11,17,24,.5) 46%, rgba(11,17,24,.94) 100%); }
  .longform-portada-texto { position: absolute; left: 0; right: 0; bottom: 0; padding: 1.8rem 1.6rem 2rem; }
  .longform-etiqueta { display: inline-block; font-family: 'Inter', sans-serif; font-size: .64rem; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; color: #ffcc00; margin-bottom: .75rem; }
  .longform-titular { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(2rem, 5.2vw, 3.5rem); line-height: 1.06; font-weight: 900; color: #fff; margin: 0 0 .55rem; letter-spacing: -.022em; text-shadow: 0 2px 20px rgba(0,0,0,.5); max-width: 22ch; }
  .longform-subtitulo { font-family: 'EB Garamond', Georgia, serif; font-size: clamp(1.08rem, 2.2vw, 1.4rem); line-height: 1.4; color: #fde68a; font-style: italic; margin: 0 0 .8rem; max-width: 46ch; text-shadow: 0 1px 10px rgba(0,0,0,.6); }
  .longform-entrada { font-family: 'EB Garamond', Georgia, serif; font-size: 1.18rem; line-height: 1.6; color: #eef0f4; margin: 0 0 .9rem; max-width: 56ch; text-shadow: 0 1px 10px rgba(0,0,0,.6); }
  .longform-firma { font-family: 'Inter', sans-serif; font-size: .74rem; color: #cbd5e1; letter-spacing: .02em; }
  .longform-firma b { color: #fff; }
  .longform-sin-foto { background: linear-gradient(140deg, #0b2240 0%, #16233a 60%, #0b1118 100%); padding: 3rem 1.8rem; }

  /* Columna de lectura: 780-850 px para el ojo */
  .longform-texto { max-width: 52rem; margin: 0 auto; }
  .longform-texto p { font-family: 'EB Garamond', Georgia, serif; font-size: clamp(1.1rem, .3vw + 1.02rem, 1.24rem); line-height: 1.78; color: #232830; margin: 0 0 1.15em; }
  .longform-texto p:first-of-type::first-letter { float: left; font-family: 'Playfair Display', Georgia, serif; font-size: 4rem; line-height: .82; font-weight: 900; color: #0b2240; padding: .08em .14em 0 0; }
  .longform-texto h2, .longform-texto h3, .longform-texto h4 { font-family: 'Playfair Display', Georgia, serif; color: #0b2240; line-height: 1.18; margin: 1.8em 0 .6em; font-weight: 800; letter-spacing: -.012em; }
  .longform-texto h2 { font-size: 1.9rem; } .longform-texto h3 { font-size: 1.45rem; } .longform-texto h4 { font-size: 1.18rem; }
  .longform-texto ul, .longform-texto ol { margin: 0 0 1.3em; padding-left: 1.5rem; font-family: 'EB Garamond', Georgia, serif; font-size: 1.16rem; line-height: 1.7; }
  .longform-texto li { margin-bottom: .5em; }
  .longform-texto li::marker { color: #c59b27; }
  .longform-texto blockquote { border-left: 3px solid #c59b27; margin: 1.8em 0; padding: .3em 0 .3em 1.4em; font-family: 'Playfair Display', Georgia, serif; font-size: 1.42rem; line-height: 1.42; font-style: italic; color: #0b2240; }
  .longform-texto blockquote p { font-family: inherit; font-size: inherit; line-height: inherit; color: inherit; margin: 0 0 .6em; }
  .longform-texto blockquote footer { font-family: 'Inter', sans-serif; font-size: .72rem; font-style: normal; color: #6b7280; letter-spacing: .04em; text-transform: uppercase; }
  .longform-texto a { color: #0b2240; text-decoration: underline; text-underline-offset: 2px; }
  .longform-texto mark { background: #ffe9a8; padding: 1px 3px; border-radius: 3px; }
  .longform-texto hr { border: 0; border-top: 2px solid #e2ded6; margin: 2.2em auto; width: 6rem; }
  .longform-texto table { border-collapse: collapse; width: 100%; margin: 1.6em 0; font-family: 'Inter', sans-serif; font-size: .88rem; }
  .longform-texto td, .longform-texto th { border-bottom: 1px solid #e2ded6; padding: 9px 10px; text-align: left; }
  .longform-texto th { font-weight: 800; color: #0b2240; border-bottom: 2px solid #0b2240; }

  /* Full-bleed: las imágenes y las infografías salen de la columna */
  .longform-texto img { width: min(1280px, calc(100vw - 3rem)); max-width: none; height: auto; display: block; margin: 1.8em 0 1.8em 50%; transform: translateX(-50%); }
  .longform-texto figure { width: min(1280px, calc(100vw - 3rem)); max-width: none; margin: 2em 0 2em 50%; transform: translateX(-50%); }
  .longform-texto figure img { margin: 0; width: 100%; }
  .longform-texto figcaption { font-family: 'Inter', sans-serif; font-size: .74rem; color: #6b7280; padding-top: 9px; margin-top: 9px; border-top: 1px solid #e2ded6; }

  /* Ficha técnica de contacto */
  .ficha-tecnica { max-width: 52rem; margin: 3rem auto 0; padding-top: 1.6rem; border-top: 3px double #1a1a1a; }
  .ficha-tecnica h2 { font-family: 'Inter', sans-serif; font-size: .66rem; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: #8c1d2f; margin: 0 0 1rem; }
  .ficha-tecnica dl { display: grid; grid-template-columns: minmax(140px, .4fr) 1fr; gap: .55rem 1.2rem; margin: 0; font-family: 'Inter', sans-serif; font-size: .84rem; }
  .ficha-tecnica dt { color: #6b7280; font-weight: 700; }
  .ficha-tecnica dd { margin: 0; color: #232830; }
  .ficha-tecnica dd a { color: #0b2240; font-weight: 600; }

  .volver { display: inline-block; font-size: .76rem; font-weight: 700; color: #0b2240; text-decoration: none; margin-bottom: 1rem; }
  .volver:hover { text-decoration: underline; }
  .nota-acciones { display: flex; flex-wrap: wrap; gap: 7px; margin: 2.2rem auto 0; max-width: 52rem; padding-top: 1.4rem; border-top: 1px solid #e2ded6; }
  .nota-pie { max-width: 52rem; margin: 2rem auto 0; font-size: .72rem; color: #8a8a8a; line-height: 1.7; }
  @media (max-width: 900px) {
    .longform-portada-texto { padding: 1.1rem 1rem 1.3rem; }
    .longform-titular { max-width: none; }
    .ficha-tecnica dl { grid-template-columns: 1fr; gap: .15rem; }
    .ficha-tecnica dd { margin-bottom: .7rem; }
  }
/*__CSS_LONGFORM_FIN__*/
`;

/* -------------------------------------------------------------------------- */
/* NIVEL 2 · marcado: sin barra lateral y con ficha técnica                   */
/* -------------------------------------------------------------------------- */

const RAIL_VIEJO = `  /* Carril derecho: multimedia de la nota y lecturas relacionadas. */
  var rail = '<aside class="nota-rail">' + multimediaDeLaNota(d, c);

  var otras = lista.filter(function (x) { return x && x.id !== c.id; }).slice(0, 3);
  if (otras.length) {
    rail += '<div class="nota-caja"><b class="nota-caja-tit">📖 Seguir leyendo</b><div class="nota-caja-cuerpo">' +
      otras.map(function (o) {
        return '<a href="cronica.html?c=' + encodeURIComponent(o.id) + '" style="display:block; text-decoration:none; color:inherit;">' +
          (o.imagen ? '<img src="' + esc(o.imagen) + '" alt="" loading="lazy" style="width:100%; height:110px; object-fit:cover; border-radius:7px;">' : '') +
          '<div style="font-family:Playfair Display, Georgia, serif; font-size:0.95rem; color:#0b2240; font-weight:700; line-height:1.3; margin-top:5px;">' + ricoHtml(o.titulo) + '</div>' +
          '<div class="pie">' + esc(o.badge || 'Crónica') + '</div>' +
        '</a>';
      }).join('') + '</div></div>';
  }
  rail += '</aside>';`;

const RAIL_NUEVO = `  /* La nota ocupa todo el ancho: sin barras laterales. El material de la
     nota y las lecturas relacionadas van dentro de la propia columna. */
  var media = multimediaDeLaNota(d, c);

  var otras = lista.filter(function (x) { return x && x.id !== c.id; }).slice(0, 3);
  var relacionadas = '';
  if (otras.length) {
    relacionadas = '<div class="nota-caja" style="margin-top:2rem;"><b class="nota-caja-tit">📖 Seguir leyendo</b><div class="nota-caja-cuerpo">' +
      otras.map(function (o) {
        return '<a href="cronica.html?c=' + encodeURIComponent(o.id) + '" style="display:block; text-decoration:none; color:inherit;">' +
          (o.imagen ? '<img src="' + esc(o.imagen) + '" alt="" loading="lazy" style="width:100%; height:110px; object-fit:cover; border-radius:7px;">' : '') +
          '<div style="font-family:Playfair Display, Georgia, serif; font-size:0.95rem; color:#0b2240; font-weight:700; line-height:1.3; margin-top:5px;">' + ricoHtml(o.titulo) + '</div>' +
          '<div class="pie">' + esc(o.badge || 'Crónica') + '</div>' +
        '</a>';
      }).join('') + '</div></div>';
  }`;

const CIERRE_VIEJO = `  var destino = document.getElementById('cronicas');
  destino.innerHTML = '<div class="nota-zona">' + nota + rail + '</div></div>';`;

const CIERRE_NUEVO = `  /* Ficha técnica de contacto al final de la nota. */
  var piezas = (d.galerias && d.galerias['06-cronica']) || [];
  var ficha =
    '<section class="ficha-tecnica">' +
      '<h2>Ficha técnica</h2>' +
      '<dl>' +
        '<dt>Autor</dt><dd>' + esc(c.autor || 'Redacción Central') + '</dd>' +
        '<dt>Sección</dt><dd>Muro de la crónica &amp; scouting</dd>' +
        '<dt>Categoría</dt><dd>' + esc(c.badge || 'Crónica') + '</dd>' +
        (c.fecha ? '<dt>Publicado</dt><dd>' + esc(c.fecha) + '</dd>' : '') +
        (piezas.length ? '<dt>Multimedia</dt><dd>' + piezas.length + ' archivo(s) adjunto(s)</dd>' : '') +
        (c.video ? '<dt>Video</dt><dd>Sí</dd>' : '') +
        (c.audioUrl ? '<dt>Audio</dt><dd>' + esc(c.audioNombre || 'MP3 de la nota') + '</dd>' : '') +
        '<dt>Contacto</dt><dd>Dirección General · Luis Enrique Aponte Guzmán</dd>' +
        '<dt>Publicación</dt><dd><a href="index.html#modulo-06-cronica">La Taberna del Magallanes News</a></dd>' +
      '</dl>' +
    '</section>';

  var destino = document.getElementById('cronicas');
  destino.innerHTML = '<div class="nota-zona">' + nota + media + relacionadas + ficha + '</div>';`;

/* -------------------------------------------------------------------------- */
/* Aplicación                                                                  */
/* -------------------------------------------------------------------------- */

function reemplazar(texto, viejo, nuevo, etiqueta) {
  if (texto.indexOf(nuevo) !== -1) return texto;
  /* El marcado de la tarjeta lo aplica el parche del editor Word (que además
     le pasa los campos por htmlDeContenido). Si ya está la tarjeta, aquí solo
     falta el CSS. */
  if (etiqueta === 'tarjeta del muro' && texto.indexOf('class="teaser"') > -1) return texto;
  if (texto.indexOf(viejo) === -1) {
    throw new Error('No se encontró el fragmento «' + etiqueta + '»');
  }
  return texto.split(viejo).join(nuevo);
}

function instalarCssLongform(html) {
  const ini = '/*__LONGFORM_INICIO__*/';
  const fin = '/*__LONGFORM_FIN__*/';
  let h = html;

  /* Quitar cualquier copia anterior. */
  let i = h.indexOf(ini);
  while (i !== -1) {
    const j = h.indexOf(fin, i);
    if (j === -1) break;
    h = h.slice(0, i) + h.slice(j + fin.length);
    i = h.indexOf(ini);
  }

  /* Insertar dentro del bloque de CSS del editor, justo antes de su fin. */
  const ancla = '/*__CSS_FIN__*/';
  const p = h.indexOf(ancla);
  if (p === -1) throw new Error('No se encontró la marca del bloque de CSS');
  return h.slice(0, p) + CSS + h.slice(p);
}

OBJETIVOS.forEach(function (archivo) {
  if (!fs.existsSync(archivo)) return;
  let h = fs.readFileSync(archivo, 'utf8');
  const antes = h;
  try {
    h = reemplazar(h, TARJETA_VIEJA, TARJETA_NUEVA, 'tarjeta del muro');
    h = instalarCssLongform(h);
  } catch (err) {
    console.error('✗ ' + path.basename(archivo) + ': ' + err.message);
    process.exitCode = 1;
    return;
  }
  if (h !== antes) {
    fs.writeFileSync(archivo, h, 'utf8');
    console.log('✓ ' + path.basename(archivo) + ': tarjeta (nivel 1) en formato editorial.');
  } else {
    console.log('· ' + path.basename(archivo) + ': ya estaba actualizado.');
  }
});

/* -------------------------------------------------------------------------- */
/* La página de la nota (publicar/cronica.html)                               */
/* -------------------------------------------------------------------------- */

const PAGINA = path.join(RAIZ, 'publicar', 'cronica.html');
if (fs.existsSync(PAGINA)) {
  let h = fs.readFileSync(PAGINA, 'utf8');
  const antes = h;
  try {
    /* CSS: se sustituye el bloque del lector por el de nivel 2. */
    const ini = '/*__CSS_LONGFORM_INICIO__*/';
    const fin = '/*__CSS_LONGFORM_FIN__*/';
    let i = h.indexOf(ini);
    while (i !== -1) {
      const j = h.indexOf(fin, i);
      if (j === -1) break;
      h = h.slice(0, i) + h.slice(j + fin.length);
      i = h.indexOf(ini);
    }
    /* El bloque viejo empieza con el comentario del lector y termina antes de
       «Párrafos sueltos en las tarjetas del muro». */
    const desde = h.indexOf('  /* ===== LECTOR DE NOTA COMPLETA (cronica.html?c=ID) ===== */');
    const hasta = h.indexOf('  /* Párrafos sueltos en las tarjetas del muro */');
    if (desde !== -1 && hasta !== -1 && hasta > desde) {
      h = h.slice(0, desde) + CSS_PAGINA + '\n' + h.slice(hasta);
    } else {
      h = h.replace('</style>', CSS_PAGINA + '</style>');
    }

    h = reemplazar(h, RAIL_VIEJO, RAIL_NUEVO, 'barra lateral de la nota');
    h = reemplazar(h, CIERRE_VIEJO, CIERRE_NUEVO, 'cierre de la nota');
  } catch (err) {
    console.error('✗ cronica.html: ' + err.message);
    process.exitCode = 1;
  }
  if (h !== antes) {
    fs.writeFileSync(PAGINA, h, 'utf8');
    console.log('✓ cronica.html: nivel 2 a ancho completo, sin barra lateral y con ficha técnica.');
  } else {
    console.log('· cronica.html: ya estaba actualizado.');
  }
}
