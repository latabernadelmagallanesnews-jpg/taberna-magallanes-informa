/* ============================================================================
  UNA PÁGINA PROPIA PARA CADA NOTA
  ----------------------------------------------------------------------------
  Cuando se comparte por WhatsApp, Facebook o X, esos servicios leen la
  página y toman de ella el título, la descripción y la foto. Con una sola
  página para todas las notas (cronica.html?c=ID), lo que sale es el titular
  genérico del diario: por eso se compartía «un título viejo».

  Con esto, cada nota tiene su propia página (notas/c1.html) con sus datos
  escritos dentro: al compartirla sale SU titular, SU entrada y SU foto.

  La nota principal de la portada (el «hero») tiene además una dirección
  PERMANENTE: notas/<slug>.html. Su contenido viaja dentro de la página, así
  que cuando el Director publique una tapa nueva la anterior no desaparece:
  queda en la hemeroteca (notas/portadas.json) y se sigue leyendo completa.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { textoPlano, slugDeHero, descripcionDeHero } = require('./portadas');

const RAIZ = path.resolve(__dirname, '..');
const PUBLICAR = path.join(RAIZ, 'publicar');
const CARPETA = path.join(PUBLICAR, 'notas');
const RE = /<script type="application\/json" id="estadoEmbebido">([\s\S]*?)<\/script>/;
const RE_EMBEBIDA = /<script type="application\/json" id="notaEmbebida">([\s\S]*?)<\/script>/;

const sinFormato = textoPlano;

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
const RUTA_PORTADAS = path.join(CARPETA, 'portadas.json');

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

/* ---------------- hemeroteca: las portadas anteriores ---------------- */

function leerPortadas() {
  try {
    const lista = JSON.parse(fs.readFileSync(RUTA_PORTADAS, 'utf8'));
    return Array.isArray(lista) ? lista.filter(Boolean) : [];
  } catch (e) { return []; }
}

function guardarPortadas(lista) {
  fs.writeFileSync(RUTA_PORTADAS, JSON.stringify(lista, null, 2) + '\n', 'utf8');
  vigentes['portadas.json'] = true;
}

function entradaDePortada(nota, actual) {
  return {
    slug: String(nota.id || ''),
    url: 'notas/' + String(nota.id || '').replace(/[^\w-]+/g, '') + '.html',
    titulo: sinFormato(nota.titulo || ''),
    fecha: sinFormato(nota.fecha || ''),
    imagen: String(nota.imagen || ''),
    resumen: sinFormato(nota.entrada || '').slice(0, 180),
    actual: !!actual
  };
}

/* Si la tapa que estaba en notas/hero.html cambió, se guarda su contenido en
   su propia dirección antes de que este build escriba la tapa nueva. */
function archivarHeroAnterior(slugNuevo, lista) {
  const rutaAlias = path.join(CARPETA, 'hero.html');
  if (!fs.existsSync(rutaAlias)) return lista;
  let datos = null;
  try {
    const html = fs.readFileSync(rutaAlias, 'utf8');
    const m = html.match(RE_EMBEBIDA);
    if (m) datos = JSON.parse(m[1]);
  } catch (e) { }
  const nota = datos && Array.isArray(datos.cronicas) ? datos.cronicas[0] : null;
  const slugViejo = nota && String(nota.id || '').replace(/[^\w-]+/g, '');
  if (!slugViejo || slugViejo === slugNuevo) return lista;

  const archivo = path.join(CARPETA, slugViejo + '.html');
  if (!fs.existsSync(archivo)) fs.copyFileSync(rutaAlias, archivo);
  vigentes[slugViejo + '.html'] = true;

  const yaEsta = lista.some(function (p) { return p && p.slug === slugViejo; });
  if (!yaEsta) {
    lista.push(entradaDePortada(nota, false));
    console.log('  ✓ portada anterior guardada: notas/' + slugViejo + '.html');
  }
  return lista;
}

/* ---------------- la página de una nota ---------------- */

/* Genera la página de una nota a partir de la plantilla de cronica.html.
   opciones.archivo     nombre del archivo (sin .html)
   opciones.idPublico   identificador que usará la página para sus enlaces
   opciones.embebida    contenido completo de la nota, escrito dentro de la
                        página (las portadas no dependen del data.json del día) */
function generarUna(nota, opciones) {
  opciones = opciones || {};
  const nombreArchivo = String(opciones.archivo || nota.id || 'nota').replace(/[^\w-]+/g, '') || 'nota';
  const idPublico = String(opciones.idPublico || nota.id || nombreArchivo);
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

  /* --- la descripción para los buscadores ------------------------------
     La plantilla trae una descripción genérica (y a veces una segunda).
     Aquí se quitan todas y se deja una sola, la entrada de esta nota. */
  html = html.replace(/<meta name="description"[^>]*>\s*/g, '');
  if (entrada) {
    html = html.replace('</head>',
      '<meta name="description" content="' + escapar(entrada) + '">\n</head>');
  }

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

  /* --- el contenido escrito dentro (solo para las portadas) ------------- */
  let bloqueContenido = '';
  if (opciones.embebida) {
    const dentro = {
      cronicas: [opciones.embebida],
      hero: null,
      jugadas: [],
      galerias: {}
    };
    bloqueContenido = '\n  <script type="application/json" id="notaEmbebida">' +
      JSON.stringify(dentro).replace(/<\//g, '<\\/') + '</script>';
  }

  /* --- el identificador de la nota y las rutas de sus recursos --------- */
  /* La página vive en notas/, una carpeta más abajo: el archivo de datos y
     el de las funciones se piden en la carpeta de arriba. */
  html = html.replace(/<script src="rico\.js"><\/script>/,
    '<script src="../rico.js"></script>\n  <script>window.__NOTA_ID__=' + JSON.stringify(idPublico) + ';</script>' + bloqueContenido);
  html = html.replace(/fetch\('data\.json'/g, "fetch('../data.json'");

  fs.writeFileSync(path.join(CARPETA, nombreArchivo + '.html'), html, 'utf8');
  hechas++;
  return nombreArchivo;
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

/* ---------------- la portada de hoy y la hemeroteca ---------------- */

let portadas = leerPortadas();
/* Las que ya están guardadas no se pierden aunque el build falle a medias. */
portadas.forEach(function (p) {
  const slug = p && String(p.slug || p.url || '').replace(/^.*\//, '').replace(/\.html$/, '');
  if (slug) vigentes[slug + '.html'] = true;
});

if (estado.hero) {
  const h = estado.hero;
  const titulo = sinFormato(h.titulo);
  if (titulo && !/^nueva cr[oó]nica$/i.test(titulo)) {
    const ahora = new Date();
    const hoy = ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0') + '-' + String(ahora.getDate()).padStart(2, '0');
    const slug = slugDeHero(h);
    /* Primero se archiva la tapa anterior (la que vive en notas/hero.html). */
    portadas = archivarHeroAnterior(slug, portadas);

    const anterior = portadas.filter(function (p) { return p && p.slug === slug; })[0] || null;
    const fecha = (anterior && anterior.fecha) || sinFormato(h.fecha || '') || hoy;
    const entrada = descripcionDeHero(h) || sinFormato(h.cita || h.epigrafe || '');

    const completa = {
      id: slug,
      titulo: titulo,
      entradilla: h.cita || h.epigrafe || '',
      subtitulo: '',
      cuerpo: h.cuerpo || h.epigrafe || '',
      imagen: h.imagen || '',
      imagenPie: sinFormato(h.epigrafe || ''),
      autor: sinFormato(h.autor || 'Redacción Central'),
      fecha: fecha,
      badge: sinFormato(h.badge || 'Investigación')
    };
    const metaNota = {
      id: slug,
      titulo: titulo,
      entrada: entrada,
      foto: fotoAbsoluta(h.imagen),
      autor: sinFormato(h.autor || 'Redacción Central'),
      fecha: fecha,
      badge: sinFormato(h.badge || 'Investigación')
    };

    /* La página permanente de esta portada… */
    generarUna(metaNota, { archivo: slug, idPublico: slug, embebida: completa });
    /* …y el alias de siempre (notas/hero.html), para los enlaces ya repartidos.
       Su canónica apunta igual a la página permanente. */
    fs.copyFileSync(path.join(CARPETA, slug + '.html'), path.join(CARPETA, 'hero.html'));
    vigentes['hero.html'] = true;

    const entradaActual = entradaDePortada({ id: slug, titulo: titulo, fecha: fecha, imagen: h.imagen, entrada: entrada }, true);
    portadas = portadas.filter(function (p) { return p && p.slug !== slug; });
    portadas.forEach(function (p) { p.actual = false; });
    portadas.unshift(entradaActual);
    guardarPortadas(portadas);
    console.log('  ✓ portada de hoy: notas/' + slug + '.html (también notas/hero.html)');
  }
} else {
  guardarPortadas(portadas.map(function (p) { p.actual = false; return p; }));
}

/* Limpiar las páginas de notas que ya no existen. Las portadas archivadas y
   la hemeroteca (portadas.json) se conservan siempre. */
try {
  fs.readdirSync(CARPETA).forEach(function (n) {
    if (!vigentes[n]) fs.unlinkSync(path.join(CARPETA, n));
  });
} catch (e) { }

console.log('✓ ' + hechas + ' página(s) de nota en publicar/notas/ (con su titular, su entrada y su foto)');
if (portadas.length) console.log('  · hemeroteca: ' + portadas.length + ' portada(s) en notas/portadas.json');
