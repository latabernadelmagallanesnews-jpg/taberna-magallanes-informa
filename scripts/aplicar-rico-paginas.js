/* ============================================================================
  PONE EL LECTOR DE CONTENIDO CON FORMATO EN LAS PÁGINAS SUELTAS
   ----------------------------------------------------------------------------
  Las páginas buscador / crónicas / roster / VIP leen el contenido de
  data.json. Con el editor estilo Word, algunos textos llegan con HTML.

  Este script:
    1. añade <script src="rico.js"></script> antes del script de cada página;
    2. cambia las llamadas que muestran un texto del CMS para que usen
       ricoHtml() (mostrar con formato) o ricoTexto() (buscar, compartir).

  Es idempotente: se puede volver a ejecutar sin duplicar nada.
  ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PUBLICAR = path.join(RAIZ, 'publicar');

/* -------------------------------------------------------------------------- */
/* Reemplazos: [archivo, texto viejo, texto nuevo]                            */
/* -------------------------------------------------------------------------- */

const CAMBIOS = [
  /* ------------------------------------------------------------------ */
  /* cronica.html                                                      */
  /* ------------------------------------------------------------------ */
  ['cronica.html',
    `<h3>' + esc(c.titulo) + '</h3>' +`,
    `<h3>' + ricoHtml(c.titulo) + '</h3>' +`],

  ['cronica.html',
    `'<p>' + esc(c.entradilla || '') + '</p>' +`,
    `'<p>' + ricoHtml(c.entradilla || '') + '</p>' +`],

  ['cronica.html',
    `'<div class="oculto" id="cuerpo-' + esc(c.id) + '">' + parrafos(c.cuerpo || c.entradilla || '') + '</div>' +`,
    `'<div class="oculto" id="cuerpo-' + esc(c.id) + '">' + parrafos(c.cuerpo || c.entradilla || '') + '</div>' +`],

  ['cronica.html',
    `onclick="compartir(\\'' + esc(c.titulo).replace(/'/g, '') + '\\')"`,
    `onclick="compartir(\\'' + ricoTexto(c.titulo).replace(/'/g, '') + '\\')"`],

  ['cronica.html',
    `function parrafos(t) {
  var s = String(t || '');
  /* Si el texto viene con formato (editor Word), se muestra tal cual. */
  if (ricoEsRico(s)) return ricoHtml(s);
  return s.split(/\\n\\s*\\n/).filter(function (x) { return x.trim(); })
    .map(function (p) { return '<p>' + esc(p.trim()) + '</p>'; }).join('');
}`,
    `function parrafos(t) {
  var s = String(t || '');
  /* Si el texto viene con formato (editor Word), se muestra tal cual. */
  if (ricoEsRico(s)) return ricoHtml(s);
  return s.split(/\\n\\s*\\n/).filter(function (x) { return x.trim(); })
    .map(function (p) { return '<p>' + esc(p.trim()) + '</p>'; }).join('');
}`],

  ['cronica.html',
    `function htmlVideo(v, titulo) {
  var url = String(v || '');
  if (!url) return '';
  if (esYouTube(url)) {
    var yt = idYouTube(url);
    if (yt) return '<iframe src="https://www.youtube.com/embed/' + esc(yt) + '" title="' + esc(titulo || 'Video') + '" allowfullscreen loading="lazy"></iframe>';
  }
  if (esVimeo(url)) {
    var vm = idVimeo(url);
    if (vm) return '<iframe src="https://player.vimeo.com/video/' + esc(vm) + '" title="' + esc(titulo || 'Video') + '" allowfullscreen loading="lazy"></iframe>';
  }
  return '<video controls preload="metadata" src="' + esc(url) + '"></video>';
}`,
    `function htmlVideo(v, titulo) {
  var url = String(v || '');
  if (!url) return '';
  /* YouTube, TikTok y Vimeo se incrustan con su enlace natural: el video
     vive en su casa y el diario no gasta espacio ni ancho de banda. */
  var yt = idYouTube(url);
  if (yt) return '<iframe src="https://www.youtube.com/embed/' + esc(yt) + '" title="' + esc(titulo || 'Video') + '" allowfullscreen loading="lazy"></iframe>';
  var tk = idTikTok(url);
  if (tk) return '<iframe src="https://www.tiktok.com/embed/v2/' + esc(tk) + '" title="' + esc(titulo || 'Video') + '" allowfullscreen loading="lazy"></iframe>';
  var vm = idVimeo(url);
  if (vm) return '<iframe src="https://player.vimeo.com/video/' + esc(vm) + '" title="' + esc(titulo || 'Video') + '" allowfullscreen loading="lazy"></iframe>';
  return '<video controls preload="metadata" src="' + esc(url) + '"></video>';
}`],

  /* ------------------------------------------------------------------ */
  /* roster.html                                                        */
  /* ------------------------------------------------------------------ */
  ['roster.html',
    `'<p>' + esc(p.bio || '') + '</p>' +`,
    `'<p>' + ricoHtml(p.bio || '') + '</p>' +`],

  /* ------------------------------------------------------------------ */
  /* buscador.html                                                      */
  /* ------------------------------------------------------------------ */
  ['buscador.html',
    `it.push({ tipo: 'Portada', titulo: d.hero.titulo || '', texto: (d.hero.badge || '') + ' ' + (d.hero.cita || '') + ' ' + String(d.hero.cuerpo || '').slice(0, 900), href: 'index.html#modulo-05-hero' });`,
    `it.push({ tipo: 'Portada', titulo: d.hero.titulo || '', texto: ricoTexto((d.hero.badge || '') + ' ' + (d.hero.cita || '') + ' ' + String(d.hero.cuerpo || '')).slice(0, 900), href: 'index.html#modulo-05-hero' });`],

  ['buscador.html',
    `it.push({ tipo: 'Crónica', titulo: c.titulo || '', texto: (c.badge || '') + ' ' + (c.entradilla || '') + ' ' + String(c.cuerpo || '').slice(0, 1200), href: 'cronica.html#' + c.id });`,
    `it.push({ tipo: 'Crónica', titulo: c.titulo || '', texto: ricoTexto((c.badge || '') + ' ' + (c.entradilla || '') + ' ' + String(c.cuerpo || '')).slice(0, 1200), href: 'cronica.html#' + c.id });`],

  ['buscador.html',
    `it.push({ tipo: 'En vivo', titulo: h.titulo || '', texto: (h.hashtag || '') + ' ' + (h.descripcion || ''), href: 'index.html#modulo-12-hilos-informativos' });`,
    `it.push({ tipo: 'En vivo', titulo: h.titulo || '', texto: ricoTexto((h.hashtag || '') + ' ' + (h.descripcion || '')), href: 'index.html#modulo-12-hilos-informativos' });`],

  ['buscador.html',
    `it.push({ tipo: 'Jugada', titulo: (j.momento || '') + ' · ' + (j.titulo || ''), texto: (j.tipo || '') + ' ' + (j.texto || ''), href: 'index.html#modulo-12-hilos-informativos' });`,
    `it.push({ tipo: 'Jugada', titulo: (j.momento || '') + ' · ' + (j.titulo || ''), texto: ricoTexto((j.tipo || '') + ' ' + (j.texto || '')), href: 'index.html#modulo-12-hilos-informativos' });`],

  ['buscador.html',
    `texto: (p.posicion || '') + ' ' + (p.bio || '') + ' ' + (p.d1Label || '') + ' ' + (p.d1 || '') + ' ' + (p.d2Label || '') + ' ' + (p.d2 || ''), href: 'roster.html#' + p.id });`,
    `texto: ricoTexto((p.posicion || '') + ' ' + (p.bio || '') + ' ' + (p.d1Label || '') + ' ' + (p.d1 || '') + ' ' + (p.d2Label || '') + ' ' + (p.d2 || '')), href: 'roster.html#' + p.id });`],

  ['buscador.html',
    `it.push({ tipo: 'El Paredón', titulo: (m.autor || '') + ' · ' + (m.fecha || ''), texto: m.texto || '', href: 'index.html#modulo-18-paredon-fanatico' });`,
    `it.push({ tipo: 'El Paredón', titulo: (m.autor || '') + ' · ' + (m.fecha || ''), texto: ricoTexto(m.texto || ''), href: 'index.html#modulo-18-paredon-fanatico' });`],

  ['buscador.html',
    `it.push({ tipo: 'Radio & Playlist', titulo: p.titulo || '', texto: p.sub || '', href: 'index.html#modulo-16-playlist' });`,
    `it.push({ tipo: 'Radio & Playlist', titulo: p.titulo || '', texto: ricoTexto(p.sub || ''), href: 'index.html#modulo-16-playlist' });`],

  ['buscador.html',
    `'<h3>' + esc(i.titulo) + '</h3>' +`,
    `'<h3>' + ricoHtml(i.titulo) + '</h3>' +`],

  ['buscador.html',
    `'<p>' + esc(String(i.texto).slice(0, 220)) + (String(i.texto).length > 220 ? '…' : '') + '</p>' +`,
    `'<p>' + esc(String(ricoTexto(i.texto)).slice(0, 220)) + (String(i.texto).length > 220 ? '…' : '') + '</p>' +`],

  /* ------------------------------------------------------------------ */
  /* vip.html                                                           */
  /* ------------------------------------------------------------------ */
  ['vip.html',
    `document.getElementById('vTexto').textContent = v.descripcion || '';`,
    `document.getElementById('vTexto').innerHTML = ricoHtml(v.descripcion || '');`],

  ['vip.html',
    `return '<li style="margin-bottom:6px;">' + esc(b.texto || '') + '</li>';`,
    `return '<li style="margin-bottom:6px;">' + ricoHtml(b.texto || '') + '</li>';`]
];

/* -------------------------------------------------------------------------- */

function aplicar(archivo) {
  const ruta = path.join(PUBLICAR, archivo);
  let h = fs.readFileSync(ruta, 'utf8');
  const original = h;
  let aplicados = 0;

  CAMBIOS.forEach(function (cambio) {
    if (cambio[0] !== archivo) return;
    const viejo = cambio[1];
    const nuevo = cambio[2];
    if (h.indexOf(viejo) === -1) {
      if (h.indexOf(nuevo) !== -1) return;   // ya aplicado
      console.warn('  ⚠ No se encontró en ' + archivo + ': ' + viejo.slice(0, 60) + '…');
      return;
    }
    h = h.split(viejo).join(nuevo);
    aplicados++;
  });

  /* Añadir el archivo rico.js antes del primer <script> de la página. */
  if (h.indexOf('rico.js') === -1) {
    const m = h.match(/<script[^>]*>/);
    if (m) {
      h = h.slice(0, m.index) + '<script src="rico.js"></script>\n  ' + h.slice(m.index);
      aplicados++;
    } else {
      console.warn('  ⚠ No se encontró un <script> en ' + archivo);
    }
  }

  if (h !== original) {
    fs.writeFileSync(ruta, h, 'utf8');
    console.log('✓ ' + archivo + ': lector de formato con formato (' + aplicados + ' cambios).');
  } else {
    console.log('· ' + archivo + ': ya estaba actualizado.');
  }
}

['cronica.html', 'roster.html', 'buscador.html', 'vip.html'].forEach(aplicar);

/* --------------------------------------------------------------------------
   rico.js: reconocer el enlace natural de TikTok
   -------------------------------------------------------------------------- */
const RICO = path.join(PUBLICAR, 'rico.js');
if (fs.existsSync(RICO)) {
  let h = fs.readFileSync(RICO, 'utf8');
  const original = h;
  const ancla = '  global.ricoEsRico = esRico;';
  if (h.indexOf('function idTikTok') === -1 && h.indexOf(ancla) !== -1) {
    h = h.replace(ancla, [
      '  /* TikTok: el enlace natural del video, para incrustarlo. */',
      '  function idTikTok(v) {',
      "    var s = String(v || '');",
      '    var m = /tiktok\\.com\\/(?:.*\\/)?video\\/(\\d+)/i.exec(s);',
      '    if (m) return m[1];',
      '    m = /tiktok\\.com\\/embed\\/v2\\/(\\d+)/i.exec(s);',
      "    return m ? m[1] : '';",
      '  }',
      '',
      ancla,
      '  global.idTikTok = idTikTok;'
    ].join('\n'));
  }
  if (h !== original) {
    fs.writeFileSync(RICO, h, 'utf8');
    console.log('✓ rico.js: reconoce los enlaces de TikTok.');
  }
}

