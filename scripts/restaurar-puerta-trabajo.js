/* ============================================================================
  RESTABLECE LA PUERTA DE ACCESO EN LA COPIA DE TRABAJO
   ----------------------------------------------------------------------------
  La copia de trabajo (editor/index.html) es la que abre usted para escribir.
  Ahí la puerta «🔒 Acceso Redacción» debe verse siempre, para que el acceso
  al CMS esté a la vista. El sitio publicado lo controla por separado con:

      node scripts/puertas-de-acceso.js abrir | cerrar

  Este script deja la copia de trabajo con las puertas encendidas y, de paso,
  sincroniza la copia publicada con la raíz del repositorio.

  Uso:  node scripts/restaurar-puerta-trabajo.js
  ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const EDITOR = path.join(RAIZ, 'editor', 'index.html');
const RE = /(<script type="application\/json" id="estadoEmbebido">)([\s\S]*?)(<\/script>)/;

const html = fs.readFileSync(EDITOR, 'utf8');
const m = html.match(RE);
if (!m) {
  console.error('✗ No se encontró el bloque de estado en editor/index.html');
  process.exit(1);
}

let estado;
try { estado = JSON.parse(m[2] ? m[2] : '{}'); } catch (e) { estado = {}; }
estado.seguridad = estado.seguridad || {};
estado.seguridad.puertasSiempre = true;
estado.seguridad.botonPie = true;
estado.seguridad.botonFlotante = true;
estado.seguridad.accesoPublico = false;

fs.writeFileSync(EDITOR, html.replace(RE, function (todo, ini, _c, fin) {
  return ini + JSON.stringify(estado) + fin;
}), 'utf8');

console.log('✓ editor/index.html: puerta «🔒 Acceso Redacción» visible al abrir el portal.');
console.log('  Al pulsarla se pide la clave; en equipos autorizados pasa a «⚙️ Abrir CMS».');
