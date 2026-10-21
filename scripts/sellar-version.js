/* ============================================================================
  SELLAR LA VERSIÓN DEL DIARIO
  ----------------------------------------------------------------------------
  Se escribe en cada página una marca con la hora de publicación. El portal
  la compara con la que tiene guardada: si el servidor trae una versión más
  nueva que la que el visitante tenía cacheada, la página se recarga sola.
  Así el teléfono (que guarda la copia en su caché) ve el diario al día sin
  tener que recargar a mano.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const MARCA = 'taberna-version';
const VERSION = new Date().toISOString();

const OBJETIVOS = [
  path.join(RAIZ, 'publicar', 'index.html'),
  path.join(RAIZ, 'publicar', 'cronica.html'),
  path.join(RAIZ, 'publicar', 'roster.html'),
  path.join(RAIZ, 'publicar', 'buscador.html'),
  path.join(RAIZ, 'publicar', 'vip.html'),
  path.join(RAIZ, 'index.html'),
  path.join(RAIZ, 'editor', 'index.html')
];

let sellados = 0;
OBJETIVOS.forEach(function (archivo) {
  if (!fs.existsSync(archivo)) return;
  let h = fs.readFileSync(archivo, 'utf8');

  const re = new RegExp('<meta name="' + MARCA + '" content="[^"]*">');
  const linea = '<meta name="' + MARCA + '" content="' + VERSION + '">';

  if (re.test(h)) {
    h = h.replace(re, linea);
  } else if (h.indexOf('</head>') !== -1) {
    h = h.replace('</head>', '  ' + linea + '\n</head>');
  } else {
    return;
  }
  fs.writeFileSync(archivo, h, 'utf8');
  sellados++;
});

console.log('✓ versión ' + VERSION + ' sellada en ' + sellados + ' página(s)');
