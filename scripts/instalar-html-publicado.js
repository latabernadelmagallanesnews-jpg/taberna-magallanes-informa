/* ============================================================================
  INSTALA EL HTML PUBLICADO QUE DESCARGÓ EL CMS
   ----------------------------------------------------------------------------
  Cuando usted edita en el CMS y pulsa «🚀 Descargar HTML publicado», el
  navegador baja un archivo index.html con TODO su contenido (fotos, notas con
  formato, textos). Ese archivo hay que ponerlo en publicar/ para que el sitio
  lo muestre.

  Copiarlo a mano es el paso donde más se escapan las cosas: si se olvida, el
  sitio sigue mostrando el contenido viejo y parece que "las fotos y las notas
  desaparecieron".

  Este script hace esa copia solo: busca el index.html descargado más
  reciente, comprueba que TRAIGA contenido (no una plantilla vacía) y lo
  instala.

  Uso:  node scripts/instalar-html-publicado.js [ruta/al/archivo/index.html]
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const RAIZ = path.resolve(__dirname, '..');
const DESTINO = path.join(RAIZ, 'publicar', 'index.html');

/* Carpetas donde el navegador deja las descargas. */
function carpetasDeDescargas() {
  const lista = [];
  const perfil = process.env.USERPROFILE || os.homedir();
  ['Downloads', 'Descargas', 'Desktop', 'Escritorio', 'Documentos', 'Documents'].forEach(function (d) {
    const p = path.join(perfil, d);
    try { if (fs.existsSync(p) && fs.statSync(p).isDirectory()) lista.push(p); } catch (e) { }
  });
  return lista;
}

/* Extrae el estado incrustado de un HTML del portal. */
function leerEstado(html) {
  const m = html.match(/<script type="application\/json" id="estadoEmbebido">([\s\S]*?)<\/script>/);
  if (!m) return null;
  const txt = String(m[1] || '').trim();
  if (!txt || txt === '{}') return {};
  try { return JSON.parse(txt); } catch (e) { return null; }
}

/* ¿El archivo trae contenido de verdad (fotos, notas, textos)? */
function cuantoContenido(estado) {
  if (!estado || typeof estado !== 'object') return 0;
  let n = 0;
  (estado.cronicas || []).forEach(function (c) {
    if (c && (c.imagen || c.cuerpo || c.titulo)) n++;
  });
  (estado.galerias || []).forEach(function () { n++; });
  ['hero', 'footer', 'cabecera', 'seo', 'circuloVip', 'paredon', 'whatsapp'].forEach(function (k) {
    if (estado[k]) n++;
  });
  return n;
}

function buscarReciente() {
  let mejor = null;
  const ahora = Date.now();
  carpetasDeDescargas().forEach(function (dir) {
    let nombres = [];
    try { nombres = fs.readdirSync(dir); } catch (e) { return; }
    nombres.forEach(function (n) {
      if (!/^index/i.test(n)) return;
      if (!/\.html?$/i.test(n)) return;
      const p = path.join(dir, n);
      try {
        const st = fs.statSync(p);
        if (ahora - st.mtimeMs > 24 * 3600 * 1000) return;   // solo del último día
        if (!mejor || st.mtimeMs > mejor.mtime) mejor = { ruta: p, mtime: st.mtimeMs };
      } catch (e) { }
    });
  });
  return mejor;
}

/* -------------------------------------------------------------------------- */

function instalar(origen) {
  const html = fs.readFileSync(origen, 'utf8');
  const estado = leerEstado(html);
  if (estado === null) {
    console.error('✗ Ese archivo no es un HTML del portal (no tiene el bloque de contenido).');
    process.exit(1);
  }
  const contenido = cuantoContenido(estado);
  if (contenido < 2) {
    console.error('✗ Ese archivo NO trae su contenido: parece la plantilla vacía.');
    console.error('  Vuelva al CMS y pulse «🚀 Descargar HTML publicado» otra vez.');
    process.exit(1);
  }

  const anterior = fs.readFileSync(DESTINO, 'utf8');
  const estAnterior = leerEstado(anterior);
  const contenidoAnterior = cuantoContenido(estAnterior);

  fs.copyFileSync(origen, DESTINO);
  console.log('✓ HTML publicado instalado en publicar/index.html');
  console.log('  · desde : ' + origen);
  console.log('  · ' + (contenido - contenidoAnterior >= 0 ? 'contenido: ' : 'contenido: ') + (contenido - contenidoAnterior) + ' bloques con datos');
  console.log('');
  console.log('  Ahora ejecute:  npm run build   (y luego  npm run deploy)');
}

const arg = process.argv[2];
if (arg) {
  const p = path.resolve(arg);
  if (!fs.existsSync(p)) {
    console.error('✗ No existe: ' + p);
    process.exit(1);
  }
  instalar(p);
} else {
  const encontrado = buscarReciente();
  if (!encontrado) {
    console.error('✗ No encontré ningún index.html descargado en las últimas 24 horas.');
    console.error('  Descárguelo desde el CMS («🚀 Descargar HTML publicado») y repita,');
    console.error('  o indique la ruta:  node scripts/instalar-html-publicado.js "C:\\ruta\\index.html"');
    process.exit(1);
  }
  console.log('· Encontrado: ' + encontrado.ruta);
  instalar(encontrado.ruta);
}
