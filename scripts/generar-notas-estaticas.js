/* ============================================================================
  UNA PÁGINA PROPIA PARA CADA NOTA
  ----------------------------------------------------------------------------
  Cuando se comparte por WhatsApp, Facebook o X, esos servicios leen la
  página y toman de ella el título, la descripción y la foto. Con una sola
  página para todas las notas (cronica.html?c=ID), lo que sale es el titular
  genérico del diario: por eso se compartía «un título viejo».

  Con esto, cada nota tiene su propia página (notas/c1.html) con sus datos
  escritos dentro: al compartirla sale SU titular, SU entrada y SU foto.

  La nota principal de la portada (el «hero») también tiene la suya:
  notas/hero.html.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PUBLICAR = path.join(RAIZ, 'publicar');
const CARPETA = path.join(PUBLICAR, 'notas');
const RE = /<script type="application\/json" id="estadoEmbebido">([\s\S]*?)<\/script>/;
const MARCA = '\u241F';

function sinFormato(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(new RegExp(MARCA, 'g'), '')
    /* Las etiquetas se cambian por un espacio, no se borran: si no, dos
       titulares seguidos (<h2>…</h2><h2>…</h2>) quedan pegados. */
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapar(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* La dirección pública del diario. */
function urlPublica() {
  try {
    const h = fs.readFileSync(path.join(PUBLICAR, 'index.html'), 'utf8');
    const m = h.match(RE);
    if (m) {
      const e = JSON.parse(m[1]);
      const u = String((e.seo && e.seo.url) || '').trim();
      if (u && /^https?:\/\//i.test(u)) return u.endsWith('/') ? u : u + '/';
    }
  } catch (e) { }
  return 'https://latabernadelmagallanesnews-jpg.github.io/taberna-magallanes-informa/';
}

/* Una foto del diario, con su dirección completa (para que la puedan ver). */
function fotoAbsoluta(foto) {
  const f = String(foto || '');
  if (!f) return '';
  if (/^https?:\/\//i.test(f)) return f;
  if (/^data:/i.test(f)) return '';                       // incrustada: no se puede enlazar
  if (/^multimedia\//i.test(f)) return urlPublica() + f;
  return '';
}

const BASE = urlPublica();
const PLANTILLA = path.join(PUBLICAR, 'cronica.html');

if (!fs.existsSync(PLANTILLA)) {
  console.log('· no está cronica.html: no se hacen las páginas de nota');
  process.exit(0);
}

let estado = {};
try {
  const h = fs.readFileSync(path.join(PUBLICAR, 'index.html'), 'utf8');
  const m = h.match(RE);
  if (m) estado = JSON.parse(m[1]);
} catch (e) { }

if (!fs.existsSync(CARPETA)) fs.mkdirSync(CARPETA, { recursive: true });

/* Quitar las páginas de notas que ya no existen (una nota borrada). */
const vigentes = {};
let hechas = 0;

/* Genera la página de una nota a partir de la plantilla de cronica.html. */
function generarUna(nota) {
  const nombreArchivo = String(nota.id).replace(/[^\w-]+/g, '') || 'nota';
  const urlNota = BASE + 'notas/' + nombreArchivo + '.html';
  vigentes[nombreArchivo + '.html'] = true;

  const titulo = nota.titulo;
  const entradaCompleta = String(nota.entrada || '');
  const entrada = entradaCompleta.slice(0, 220) + (entradaCompleta.length > 220 ? '…' : '');
  const foto = nota.foto || '';
  const autor = nota.autor || 'Redacción Central';
  const fecha = nota.fecha || '';

  let html = fs.readFileSync(PLANTILLA, 'utf8');

  /* --- los datos de Open Graph y Twitter, de esta nota ------------------ */
  const meta = function (prop, nombre, valor) {
    if (!valor) return;
    const re = new RegExp('(<meta (?:property|name)="' + nombre + '" content=")[^"]*(")');
    if (re.test(html)) html = html.replace(re, '$1' + escapar(valor) + '$2');
  };
  meta('property', 'og:title', titulo);
  meta('property', 'og:description', entrada);
  meta('property', 'og:url', urlNota);
  meta('property', 'og:image', foto);
  meta('property', 'og:image:secure_url', foto);
  meta('property', 'og:type', 'article');
  meta('name', 'twitter:title', titulo);
  meta('name', 'twitter:description', entrada);
  meta('name', 'twitter:image', foto);

  /* --- el título de la pestaña ----------------------------------------- */
  html = html.replace(/<title>[^<]*<\/title>/, '<title>' + escapar(titulo) + ' · La Taberna del Magallanes News</title>');

  /* --- la URL canónica: esta es la dirección oficial de la nota --------- */
  html = html.replace(/<link rel="canonical" id="canonicoNota" href="[^"]*">/,
    '<link rel="canonical" id="canonicoNota" href="' + escapar(urlNota) + '">');

  /* --- los datos estructurados, ya con los datos de la nota ------------- */
  const datos = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: titulo,
    description: entrada,
    image: foto,
    datePublished: fecha,
    dateModified: fecha,
    author: { '@type': 'Person', name: autor },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: 'La Taberna del Magallanes News',
      url: BASE
    },
    mainEntityOfPage: urlNota,
    articleSection: nota.badge || 'Crónica',
    inLanguage: 'es'
  };
  const json = JSON.stringify(datos).replace(/<\//g, '<\\/');
  html = html.replace(/<script type="application\/ld\+json" id="datosNota">[\s\S]*?<\/script>/,
    '<script type="application/ld+json" id="datosNota">' + json + '</script>');

  /* --- el identificador de la nota y las rutas de sus recursos --------- */
  /* La página vive en notas/, una carpeta más abajo: el archivo de datos y
     el de las funciones se piden en la carpeta de arriba. */
  html = html.replace(/<script src="rico\.js"><\/script>/,
    '<script src="../rico.js"></script>\n  <script>window.__NOTA_ID__=' + JSON.stringify(nota.id) + ';</script>');
  html = html.replace(/fetch\('data\.json'/g, "fetch('../data.json'");

  fs.writeFileSync(path.join(CARPETA, nombreArchivo + '.html'), html, 'utf8');
  hechas++;
}

/* Las crónicas del muro. */
(estado.cronicas || []).forEach(function (c) {
  if (!c || !c.id) return;
  const titulo = sinFormato(c.titulo);
  if (!titulo || /^nueva cr[oó]nica$/i.test(titulo)) return;

  generarUna({
    id: c.id,
    titulo: titulo,
    entrada: sinFormato(c.entradilla || c.subtitulo || ''),
    foto: fotoAbsoluta(c.imagen),
    autor: sinFormato(c.autor || 'Redacción Central'),
    fecha: sinFormato(c.fecha || ''),
    badge: sinFormato(c.badge || 'Crónica')
  });
});

/* La nota principal de la portada (el «hero»). */
if (estado.hero) {
  const h = estado.hero;
  const titulo = sinFormato(h.titulo);
  if (titulo && !/^nueva cr[oó]nica$/i.test(titulo)) {
    const hoy = new Date().toISOString().slice(0, 10);
    generarUna({
      id: 'hero',
      titulo: titulo,
      entrada: sinFormato(h.cita || h.epigrafe || ''),
      foto: fotoAbsoluta(h.imagen),
      autor: sinFormato(h.autor || 'Redacción Central'),
      fecha: sinFormato(h.fecha || h.meta || '') || hoy,
      badge: sinFormato(h.badge || 'Investigación')
    });
  }
}

/* Limpiar las páginas de notas que ya no existen. */
try {
  fs.readdirSync(CARPETA).forEach(function (n) {
    if (!vigentes[n]) fs.unlinkSync(path.join(CARPETA, n));
  });
} catch (e) { }

console.log('✓ ' + hechas + ' página(s) de nota en publicar/notas/ (con su titular, su entrada y su foto)');
