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
/* Carpetas donde el navegador deja las descargas. Se mira también un nivel
   hacia dentro, porque el navegador a veces crea una carpeta con el nombre
   del sitio donde descarga el archivo. */
function carpetasDeDescargas() {
  const lista = [];
  const perfil = process.env.USERPROFILE || os.homedir();
  ['Downloads', 'Descargas', 'Desktop', 'Escritorio', 'Documentos', 'Documents'].forEach(function (d) {
    const p = path.join(perfil, d);
    try {
      if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) return;
      lista.push(p);
      fs.readdirSync(p).forEach(function (sub) {
        const sp = path.join(p, sub);
        try { if (fs.statSync(sp).isDirectory()) lista.push(sp); } catch (e) { }
      });
    } catch (e) { }
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
  const gal = estado.galerias || {};
  Object.keys(gal).forEach(function (k) {
    const piezas = gal[k] || [];
    n += Array.isArray(piezas) ? piezas.length : 0;
  });
  ['hero', 'footer', 'cabecera', 'seo', 'circuloVip', 'paredon', 'whatsapp'].forEach(function (k) {
    if (estado[k]) n++;
  });
  return n;
}

/* Busca la descarga más reciente que SEA una copia con contenido.
   Se descartan los archivos que están dentro del propio proyecto (el index.html
   del portal no es una descarga) y los que no traen contenido. */
function buscarReciente() {
  const candidatos = [];
  const ahora = Date.now();
  const raiz = path.resolve(RAIZ);

  carpetasDeDescargas().forEach(function (dir) {
    let nombres = [];
    try { nombres = fs.readdirSync(dir); } catch (e) { return; }
    nombres.forEach(function (n) {
      /* El navegador descarga como "index.html" o "index (2).html". */
      if (!/^index/i.test(n)) return;
      if (!/\.html?$/i.test(n)) return;
      const p = path.join(dir, n);
      try {
        const st = fs.statSync(p);
        if (ahora - st.mtimeMs > 24 * 3600 * 1000) return;   // solo del último día
        /* Los archivos del propio proyecto no son descargas. */
        if (path.resolve(p).startsWith(raiz)) return;
        candidatos.push({ ruta: p, mtime: st.mtimeMs });
      } catch (e) { }
    });
  });

  candidatos.sort(function (a, b) { return b.mtime - a.mtime; });
  for (let i = 0; i < candidatos.length; i++) {
    const estado = leerEstado(fs.readFileSync(candidatos[i].ruta, 'utf8'));
    if (estado && cuantoContenido(estado) >= 2) return candidatos[i];
  }
  return candidatos[0] || null;
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
