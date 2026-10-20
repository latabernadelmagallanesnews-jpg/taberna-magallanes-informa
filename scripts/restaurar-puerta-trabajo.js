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
/* Modo redacción: los lectores NO ven ningún botón, pero usted y los
   periodistas con código personal sí los ven siempre (en cuanto su equipo
   queda autorizado, el botón pasa a decir «⚙️ Abrir CMS»). */
estado.seguridad.puertasSiempre = false;
estado.seguridad.botonPie = true;
estado.seguridad.botonFlotante = true;
estado.seguridad.accesoPublico = false;
estado.seguridad.puertasPublicas = false;

fs.writeFileSync(EDITOR, html.replace(RE, function (todo, ini, _c, fin) {
  return ini + JSON.stringify(estado) + fin;
}), 'utf8');

console.log('✓ editor/index.html: puertas de acceso en MODO REDACCIÓN.');
console.log('  · Los lectores NO ven ningún botón.');
console.log('  · Usted y sus periodistas con código personal SÍ lo ven:');
console.log('    tras autenticarse una vez, el botón dice «⚙️ Abrir CMS».');
