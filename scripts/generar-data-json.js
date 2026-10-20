/* ============================================================================
  GENERA publicar/data.json A PARTIR DEL CONTENIDO PUBLICADO
   ----------------------------------------------------------------------------
  data.json es el archivo que leen las páginas sueltas (buscador, crónicas,
  roster y VIP). Para que nunca se queden desfasadas, este script lo reconstruye
  desde el mismo index.html publicado que se sube al hosting:

    1. Extrae la plantilla de fábrica (ESTADO_SEMILLA) del propio HTML.
    2. Fusiona encima el contenido ya publicado (estadoEmbebido).
    3. Convierte el texto enriquecido a texto plano (el buscador y las redes
       sociales necesitan texto, no marcas).
    4. Escribe publicar/data.json.

  Uso:  node scripts/generar-data-json.js
  ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const PORTAL = path.join(RAIZ, 'publicar', 'index.html');
const SALIDA = path.join(RAIZ, 'publicar', 'data.json');

/* Claves que data.json publica para las páginas sueltas. */
const CLAVES = [
  'seo', 'hero', 'cronicasSeccion', 'cronicas', 'hilosSeccion', 'hilos', 'jugadas',
  'tablaPosiciones', 'roster', 'paredon', 'circuloVip', 'whatsapp', 'footer',
  'redesMultimedia', 'playlist', 'publicidad'
];

/* Módulos cuyo archivo multimedia se publica en data.json, para que la
   página de la crónica muestre sus fotos, audios y documentos. */
const MODULOS_MEDIA = ['06-cronica', '05-hero', '07-cabina-statcast', '08-heatmap'];

/* -------------------------------------------------------------------------- */

function clonar(o) { return JSON.parse(JSON.stringify(o)); }

/* Misma fusión que usa el portal: los objetos se combinan, las listas se
   reemplazan elemento a elemento contra la plantilla. */
function fusionar(base, datos) {
  if (Array.isArray(base)) {
    if (!Array.isArray(datos)) return clonar(base);
    return datos.map(function (item, i) {
      const plantilla = base.length ? base[Math.min(i, base.length - 1)] : {};
      return fusionar(plantilla, item);
    });
  }
  if (base && typeof base === 'object') {
    const salida = {};
    const claves = {};
    Object.keys(base).forEach(function (k) { claves[k] = 1; });
    if (datos && typeof datos === 'object' && !Array.isArray(datos)) {
      Object.keys(datos).forEach(function (k) { claves[k] = 1; });
    }
    Object.keys(claves).forEach(function (k) {
      const tiene = datos && Object.prototype.hasOwnProperty.call(datos, k);
      salida[k] = tiene ? fusionar(base[k], datos[k]) : clonar(base[k]);
    });
    return salida;
  }
  return datos === undefined ? base : datos;
}

/* --- Extracción de la plantilla y del contenido ------------------------- */

function extraerSemilla(html) {
  const lines = html.split('\n');
  const inicio = lines.findIndex(function (l) { return l.includes('const ESTADO_SEMILLA = {'); });
  if (inicio === -1) throw new Error('No se encontró ESTADO_SEMILLA en el HTML');
  let nivel = 0, fin = -1;
  for (let i = inicio; i < lines.length; i++) {
    for (const ch of lines[i]) { if (ch === '{') nivel++; else if (ch === '}') nivel--; }
    if (nivel === 0 && i > inicio) { fin = i; break; }
  }
  if (fin === -1) throw new Error('No se pudo cerrar el bloque ESTADO_SEMILLA');
  const codigo = lines.slice(inicio, fin + 1).join('\n');
  const ctx = {
    nuevoId: function (p) { return p + '_' + Math.random().toString(36).slice(2, 8); },
    Math: Math, Date: Date, JSON: JSON, String: String, Number: Number,
    Array: Array, Object: Object, Boolean: Boolean
  };
  vm.createContext(ctx);
  vm.runInContext('var __semilla = (function(){' + codigo + '\nreturn ESTADO_SEMILLA;})();', ctx);
  return ctx.__semilla;
}

function extraerPublicado(html) {
  const m = html.match(/<script type="application\/json" id="estadoEmbebido">([\s\S]*?)<\/script>/);
  if (!m) return {};
  const texto = String(m[1] || '').trim();
  if (!texto || texto === '{}') return {};
  try { return JSON.parse(texto); } catch (e) { return {}; }
}

/* -------------------------------------------------------------------------- */

function main() {
  const html = fs.readFileSync(PORTAL, 'utf8');
  const semilla = extraerSemilla(html);
  const publicado = extraerPublicado(html);
  const estado = fusionar(semilla, publicado);

  const salida = {
    generado: new Date().toISOString().slice(0, 10),
    portal: estado.cabecera || {}
  };
  CLAVES.forEach(function (k) { salida[k] = estado[k]; });

  /* Los archivos multimedia (fotos, audios, videos, PDF) de los módulos que
     las páginas sueltas necesitan mostrar. */
  const galerias = estado.galerias || {};
  const media = {};
  MODULOS_MEDIA.forEach(function (m) {
    if (Array.isArray(galerias[m]) && galerias[m].length) media[m] = galerias[m];
  });
  if (Object.keys(media).length) salida.galerias = media;

  fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
  const peso = fs.statSync(SALIDA).size;
  console.log('✓ publicar/data.json regenerado (' + peso.toLocaleString('es-VE') + ' bytes, ' + CLAVES.length + ' secciones).');

  /* Aviso: si el HTML publicado no trae contenido incrustado, es que el
     HTML descargado del CMS no se copió sobre publicar/index.html. Sus fotos
     y notas seguirían en el navegador del editor, NO en el sitio. */
  const hayContenido = Object.keys(publicado || {}).length > 1;
  if (!hayContenido) {
    console.log('');
    console.log('  ⚠ ATENCIÓN: publicar/index.html NO tiene contenido incrustado.');
    console.log('    Sus fotos y notas siguen solo en el navegador del editor.');
    console.log('    Para publicarlas: pulse «🚀 Descargar HTML publicado» en el CMS y');
    console.log('    ejecute «npm run instalar» (lo copia solo, sin que usted lo haga).');
    console.log('');
  }

  /* Aviso: si algún campo quedó con formato, las páginas sueltas lo leen con
     publicar/rico.js (ricoHtml para mostrarlo, ricoTexto para buscarlo). */
  const ricos = (fs.readFileSync(SALIDA, 'utf8').match(/\u241F/g) || []).length;
  if (ricos) console.log('  · ' + ricos + ' textos conservan el formato del editor Word (las páginas sueltas lo muestran con rico.js).');
  else console.log('  · la plantilla de fábrica todavía no tiene textos con formato.');
  if (publicado && Object.keys(publicado).length) {
    console.log('  · contenido tomado del HTML publicado (' + Object.keys(publicado).length + ' claves incrustadas)');
  } else {
    console.log('  · contenido tomado de la plantilla de fábrica (el HTML aún no trae contenido incrustado)');
  }
}

main();
