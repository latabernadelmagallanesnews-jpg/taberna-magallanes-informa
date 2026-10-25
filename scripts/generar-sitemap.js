/* ============================================================================
  MAPA DEL SITIO PARA LOS BUSCADORES
  ----------------------------------------------------------------------------
  Los motores de búsqueda (Google, Bing, DuckDuckGo) necesitan un sitemap.xml
  con las direcciones del diario para rastrear las notas. Se genera con el
  contenido publicado, así que siempre está al día.

  También se rehace el robots.txt: se permite todo menos la sala de
  redacción, y se apunta al mapa.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { slugDeHero } = require('./portadas');

const RAIZ = path.resolve(__dirname, '..');
const RE = /<script type="application\/json" id="estadoEmbebido">([\s\S]*?)<\/script>/;
const MARCA = '\u241F';

/* La dirección pública del diario (la de GitHub Pages). */
function urlPublica() {
  const raiz = path.join(RAIZ, 'publicar', 'index.html');
  const h = fs.readFileSync(raiz, 'utf8');
  const m = h.match(RE);
  if (!m) return 'https://latabernadelmagallanesnews-jpg.github.io/taberna-magallanes-informa/';
  try {
    const e = JSON.parse(m[1]);
    const u = String((e.seo && e.seo.url) || '').trim();
    if (u && /^https?:\/\//i.test(u)) return u.endsWith('/') ? u : u + '/';
  } catch (e) { }
  return 'https://latabernadelmagallanesnews-jpg.github.io/taberna-magallanes-informa/';
}

function sinFormato(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(new RegExp(MARCA, 'g'), '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function principal() {
  const raiz = path.join(RAIZ, 'publicar', 'index.html');
  const h = fs.readFileSync(raiz, 'utf8');
  const m = h.match(RE);
  if (!m) return { titulo: 'La Taberna del Magallanes News', desc: '' };
  try {
    const e = JSON.parse(m[1]);
    return {
      titulo: sinFormato((e.seo && e.seo.ogTitulo) || 'La Taberna del Magallanes News'),
      desc: sinFormato((e.seo && e.seo.ogDesc) || '')
    };
  } catch (e) { return { titulo: 'La Taberna del Magallanes News', desc: '' }; }
}

const BASE = urlPublica();
const ahora = new Date();
const hoy = ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0') + '-' + String(ahora.getDate()).padStart(2, '0');

const lineas = [];
lineas.push('<?xml version="1.0" encoding="UTF-8"?>');
lineas.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

/* La portada */
lineas.push('  <url>');
lineas.push('    <loc>' + BASE + '</loc>');
lineas.push('    <lastmod>' + hoy + '</lastmod>');
lineas.push('    <changefreq>hourly</changefreq>');
lineas.push('    <priority>1.0</priority>');
lineas.push('  </url>');

/* Las notas publicadas */
const raiz = path.join(RAIZ, 'publicar', 'index.html');
const h = fs.readFileSync(raiz, 'utf8');
const m = h.match(RE);
if (m) {
  let e = {};
  try { e = JSON.parse(m[1]); } catch (x) { e = {}; }
  (e.cronicas || []).forEach(function (c) {
    if (!c || !c.id) return;
    const titulo = sinFormato(c.titulo);
    /* Las notas vacías no se“Rastrean”: no hay nada que indexar. */
    if (!titulo || /^nueva cr[oó]nica$/i.test(titulo)) return;
    lineas.push('  <url>');
    lineas.push('    <loc>' + BASE + 'notas/' + String(c.id).replace(/[^\w-]+/g, '') + '.html</loc>');
    lineas.push('    <lastmod>' + (c.fecha || hoy) + '</lastmod>');
    lineas.push('    <changefreq>weekly</changefreq>');
    lineas.push('    <priority>0.8</priority>');
    lineas.push('  </url>');
  });

  /* La nota principal de la portada también tiene su página propia y
     PERMANENTE: notas/<slug>.html (la misma que se comparte). */
  if (e.hero && sinFormato(e.hero.titulo) && !/^nueva cr[oó]nica$/i.test(sinFormato(e.hero.titulo))) {
    lineas.push('  <url>');
    lineas.push('    <loc>' + BASE + 'notas/' + slugDeHero(e.hero) + '.html</loc>');
    lineas.push('    <lastmod>' + (sinFormato(e.hero.fecha) || hoy) + '</lastmod>');
    lineas.push('    <changefreq>weekly</changefreq>');
    lineas.push('    <priority>0.9</priority>');
    lineas.push('  </url>');
  }

  /* La hemeroteca: las portadas anteriores conservan su página completa y
     también se indexan (son notas enteras, no copias de la tapa de hoy). */
  let portadas = [];
  try {
    portadas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'publicar', 'notas', 'portadas.json'), 'utf8'));
  } catch (x) { portadas = []; }
  if (Array.isArray(portadas)) {
    portadas.forEach(function (p) {
      if (!p || !p.url) return;
      const ya = lineas.some(function (l) { return l.indexOf('<loc>' + BASE + p.url + '</loc>') !== -1; });
      if (ya) return;
      lineas.push('  <url>');
      lineas.push('    <loc>' + BASE + p.url + '</loc>');
      lineas.push('    <lastmod>' + (p.fecha || hoy) + '</lastmod>');
      lineas.push('    <changefreq>weekly</changefreq>');
      lineas.push('    <priority>0.7</priority>');
      lineas.push('  </url>');
    });
  }
}

/* Las páginas sueltas */
[['roster.html', '0.6'], ['buscador.html', '0.5'], ['vip.html', '0.5']].forEach(function (p) {
  lineas.push('  <url>');
  lineas.push('    <loc>' + BASE + p[0] + '</loc>');
  lineas.push('    <lastmod>' + hoy + '</lastmod>');
  lineas.push('    <changefreq>weekly</changefreq>');
  lineas.push('    <priority>' + p[1] + '</priority>');
  lineas.push('  </url>');
});

lineas.push('</urlset>');
lineas.push('');

fs.writeFileSync(path.join(RAIZ, 'publicar', 'sitemap.xml'), lineas.join('\n'), 'utf8');
console.log('✓ sitemap.xml con ' + (lineas.filter(function (l) { return l.indexOf('<url>') !== -1; }).length) + ' direcciones');

/* El robots.txt: se permite el diario y se apunta al mapa. La sala de
   redacción NO se nombra aquí: la página ya lleva noindex y no tiene enlaces
   públicos; escribir su ruta en robots.txt solo la anunciaría. */
const robots = [
  'User-agent: *',
  'Allow: /',
  '',
  'Sitemap: ' + BASE + 'sitemap.xml',
  ''
].join('\n');
fs.writeFileSync(path.join(RAIZ, 'publicar', 'robots.txt'), robots, 'utf8');
console.log('✓ robots.txt con el puntero al mapa del sitio');
