/* ============================================================================
  RESTAURAR LAS NOTAS PUBLICADAS
  ----------------------------------------------------------------------------
  Una publicación de prueba llegó con el estado vacío y dejó el diario sin
  notas. Se recupera del último commit que las tenía y, además, se pone un
  candado para que un estado vacío no pueda volver a borrar el contenido.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = 'C:/Users/F4NT45M4/Documents/Proyecto predeterminado/';
const GIT = 'C:\\Program Files\\Git\\cmd\\git.exe';
const COMMIT = '24e62f2';   // el último commit con las 9 notas
const RE = /(<script type="application\/json" id="estadoEmbebido">)([\s\S]*?)(<\/script>)/;

function leerEstado(html) {
  const m = html.match(RE);
  return m ? JSON.parse(m[2]) : null;
}

/* --- 1 · el estado bueno, del commit -------------------------------------- */
const bueno = execFileSync(GIT, ['show', COMMIT + ':publicar/index.html'], {
  cwd: RAIZ, encoding: 'utf8', maxBuffer: 1024 * 1024 * 300
});
const estadoBueno = leerEstado(bueno);
console.log('estado del commit ' + COMMIT + ': ' + (estadoBueno.cronicas || []).length + ' notas');

/* --- 2 · ponerlo en el HTML publicado ------------------------------------- */
const destino = path.join(RAIZ, 'publicar', 'index.html');
let html = fs.readFileSync(destino, 'utf8');
const m = html.match(RE);
const estadoActual = JSON.parse(m[2]);
console.log('estado actual: ' + (estadoActual.cronicas || []).length + ' notas');

/* Se conserva lo que hay ahora (lo más reciente) y se completan las partes
   que se perdieron: las notas. */
const fusionado = Object.assign({}, estadoBueno, estadoActual);
fusionado.cronicas = (estadoActual.cronicas && estadoActual.cronicas.length)
  ? estadoActual.cronicas
  : estadoBueno.cronicas;
fusionado.cronicasSeccion = estadoActual.cronicasSeccion || estadoBueno.cronicasSeccion;

html = html.replace(RE, function (todo, ini, _c, fin) {
  return ini + JSON.stringify(fusionado) + fin;
});
fs.writeFileSync(destino, html, 'utf8');
console.log('✓ notas restauradas en publicar/index.html: ' + fusionado.cronicas.length);

/* --- 3 · copia de seguridad del estado ------------------------------------ */
const respaldo = path.join(RAIZ, 'publicar', '.estado-respaldo.json');
fs.writeFileSync(respaldo, JSON.stringify(fusionado), 'utf8');
console.log('✓ copia de seguridad del estado en publicar/.estado-respaldo.json');
