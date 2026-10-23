/* ============================================================================
  COPIA EL SITIO PUBLICADO A LA RAÍZ DEL REPOSITORIO
   ----------------------------------------------------------------------------
  GitHub Pages publica la carpeta que le indique el flujo de publicación. Con
  "Deploy from a branch" sobre la raíz, el sitio se arma con lo que hay en la
  raíz del repositorio. Con "GitHub Actions" se publica la carpeta publicar/.

  Este script deja AMBOS caminos sirviendo exactamente el mismo sitio: copia
  los archivos de publicar/ a la raíz del repositorio.

  La copia de trabajo del editor NO se toca: vive en editor/index.html.

  Uso:  node scripts/sincronizar-raiz.js
  ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PUBLICAR = path.join(RAIZ, 'publicar');

/* Archivos del sitio que deben existir en la raíz. */
const ARCHIVOS = [
  'index.html',
  'buscador.html',
  'cronica.html',
  'roster.html',
  'vip.html',
  'redaccion-cms.html',
  '404.html',
  'data.json',
  'rico.js',
  'robots.txt',
  'sitemap.xml',
  '.nojekyll'
];

let copiados = 0, sinCambio = 0;

ARCHIVOS.forEach(function (nombre) {
  const origen = path.join(PUBLICAR, nombre);
  if (!fs.existsSync(origen)) {
    console.warn('  ⚠ no existe en publicar/: ' + nombre);
    return;
  }
  const datos = fs.readFileSync(origen);

  /* La raíz del repositorio: es lo que sirve GitHub Pages. */
  const destinoRaiz = path.join(RAIZ, nombre);
  if (fs.existsSync(destinoRaiz) && fs.readFileSync(destinoRaiz).equals(datos)) { sinCambio++; } else {
    fs.writeFileSync(destinoRaiz, datos);
    copiados++;
  }

  /* La copia de trabajo: idéntica a la publicada. El contenido que edita la
     redacción vive en el navegador (IndexedDB), así que el archivo puede ser
     el mismo y así no se desincronizan nunca. */
  const destinoEditor = path.join(RAIZ, 'editor', nombre);
  if (fs.existsSync(destinoEditor) && fs.readFileSync(destinoEditor).equals(datos)) { sinCambio++; } else {
    fs.writeFileSync(destinoEditor, datos);
    copiados++;
  }
});

console.log('✓ raíz y copia de trabajo sincronizadas con publicar/ (' + copiados + ' copiados, ' + sinCambio + ' sin cambios).');

/* La carpeta multimedia/ (fotos, audios y videos sueltos) también debe
   estar en la raíz, porque es lo que sirve GitHub Pages en modo
   "Deploy from a branch". */
const CARPETA_MEDIA = path.join(PUBLICAR, 'multimedia');
if (fs.existsSync(CARPETA_MEDIA)) {
  const destino = path.join(RAIZ, 'multimedia');
  let n = 0;
  fs.readdirSync(CARPETA_MEDIA).forEach(function (nombre) {
    const origen = path.join(CARPETA_MEDIA, nombre);
    const destinoArchivo = path.join(destino, nombre);
    if (!fs.statSync(origen).isFile()) return;
    if (fs.existsSync(destinoArchivo) && fs.readFileSync(destinoArchivo).equals(fs.readFileSync(origen))) return;
    if (!fs.existsSync(destino)) fs.mkdirSync(destino, { recursive: true });
    fs.copyFileSync(origen, destinoArchivo);
    n++;
  });
  if (n) console.log('✓ ' + n + ' archivo(s) de multimedia copiados a la raíz (multimedia/).');
}

/* Y la carpeta notas/ con la página propia de cada nota: es la que se
   comparte y la que leen los buscadores. */
const CARPETA_NOTAS = path.join(PUBLICAR, 'notas');
if (fs.existsSync(CARPETA_NOTAS)) {
  const destino = path.join(RAIZ, 'notas');
  let n = 0;
  fs.readdirSync(CARPETA_NOTAS).forEach(function (nombre) {
    const origen = path.join(CARPETA_NOTAS, nombre);
    const destinoArchivo = path.join(destino, nombre);
    if (!fs.statSync(origen).isFile()) return;
    if (fs.existsSync(destinoArchivo) && fs.readFileSync(destinoArchivo).equals(fs.readFileSync(origen))) return;
    if (!fs.existsSync(destino)) fs.mkdirSync(destino, { recursive: true });
    fs.copyFileSync(origen, destinoArchivo);
    n++;
  });
  if (n) console.log('✓ ' + n + ' página(s) de nota copiadas a la raíz (notas/).');
}
