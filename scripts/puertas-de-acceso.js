/* ============================================================================
  PUERTAS DE ACCESO DE LA REDACCIÓN
   ----------------------------------------------------------------------------
  El portal tiene dos puertas visibles:

    · 🔒 Acceso Redacción  (botón flotante, abajo a la derecha)
    · 🔒 Redacción         (en el pie de página)

  A un lector que las pulse se le pide la clave (cifrada en SHA-256); sin la
  clave no entra a nada. En los equipos ya autorizados el botón se transforma
  en «⚙️ Abrir CMS» y entra directo.

  Este script las enciende o las apaga en el sitio publicado.

  Uso:
      node scripts/puertas-de-acceso.js            (muestra el estado actual)
      node scripts/puertas-de-acceso.js abrir      (los lectores ven el botón)
      node scripts/puertas-de-acceso.js cerrar     (solo la redacción lo ve)
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PUBLICAR = path.join(RAIZ, 'publicar', 'index.html');
const RE = /(<script type="application\/json" id="estadoEmbebido">)([\s\S]*?)(<\/script>)/;

function leerEstado(html) {
  const m = html.match(RE);
  if (!m) return null;
  try { return JSON.parse(m[2] ? m[2] : '{}'); } catch (e) { return null; }
}

function escribirEstado(html, estado) {
  return html.replace(RE, function (todo, ini, _cuerpo, fin) {
    return ini + JSON.stringify(estado) + fin;
  });
}

const accion = (process.argv[2] || '').toLowerCase();

let html = fs.readFileSync(PUBLICAR, 'utf8');
const estado = leerEstado(html);
if (!estado) {
  console.error('✗ No se encontró el bloque de estado en publicar/index.html');
  process.exit(1);
}
estado.seguridad = estado.seguridad || {};

if (!accion || accion === 'estado') {
  const s = estado.seguridad;
  console.log('\n=== PUERTAS DE ACCESO ===');
  console.log('  Mododo            : ' + (s.puertasSiempre === true ? 'PUBLICO (los lectores ven el boton)' : 'REDACCION (solo la redaccion lo ve)'));
  console.log('  Lectores          : ' + (s.puertasSiempre === true ? 'VEN el boton «🔒 Acceso Redaccion»' : 'NO ven ningun boton'));
  console.log('  Usted y su equipo : VEN siempre «⚙️ Abrir CMS» (tras autenticarse una vez)');
  console.log('  Boton flotante    : ' + (s.botonFlotante !== false ? 'activo' : 'desactivado'));
  console.log('  Puerta del pie    : ' + (s.botonPie !== false ? 'activa' : 'desactivada'));
  console.log('\n  (los lectores que lo pulsen siguen teniendo que escribir la clave)\n');
  process.exit(0);
}

if (accion === 'abrir' || accion === 'cerrar') {
  const abierto = accion === 'abrir';
  /* puertasSiempre = los lectores ven o no el botón.
     botonPie / botonFlotante = los dos botones de la redacción.
     Con una sesión autorizada (Director o periodista con código personal) el
     botón se ve SIEMPRE, porque la redacción tiene prioridad sobre el
     interruptor de los lectores. */
  estado.seguridad.puertasSiempre = abierto;
  estado.seguridad.botonPie = true;
  estado.seguridad.botonFlotante = true;
  estado.seguridad.accesoPublico = false;
  estado.seguridad.puertasPublicas = !abierto;
  fs.writeFileSync(PUBLICAR, escribirEstado(html, estado), 'utf8');
  console.log('\n✓ Puertas de acceso en ' + (abierto ? 'MODO PÚBLICO' : 'MODO REDACCIÓN') + '.');
  console.log('  · Lectores       : ' + (abierto ? 'VEN el botón 🔒' : 'NO ven ningún botón'));
  console.log('  · Usted y sus periodistas : VEN siempre «⚙️ Abrir CMS»');
  console.log('  Ejecute «npm run sync» para llevarlas a la raíz del repositorio.\n');
  process.exit(0);
}

console.error('✗ Acción no reconocida. Use: abrir · cerrar · estado');
process.exit(1);
