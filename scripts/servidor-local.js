/* ============================================================================
  SERVIDOR LOCAL DEL DIARIO
   ----------------------------------------------------------------------------
  Sirve el portal para trabajar sin internet y, además, RECIBE el contenido
  que usted escribe en el CMS y lo publica directamente (sin descargas de 30 MB):

    · GET  /            -> el portal publicado (publicar/)
    · GET  /editor/...  -> la copia de trabajo
    · POST /publicar    -> guarda el contenido que envía el CMS, lo instala,
                           sube a GitHub y responde con el resultado

  El botón «🚀 Publicar ahora» del CMS usa este canal: el contenido viaja
  directo a la computadora, sin pasar por un archivo descargado.
   ============================================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const PUBLICAR = path.join(RAIZ, 'publicar');
const PUERTO = Number(process.env.PORT || 8099);
const GIT = 'C:\\Program Files\\Git\\cmd\\git.exe';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf'
};

/* -------------------------------------------------------------------------- */
/* Recibir el contenido del CMS y publicarlo                                   */
/* -------------------------------------------------------------------------- */

const RE_ESTADO = /(<script type="application\/json" id="estadoEmbebido">)([\s\S]*?)(<\/script>)/;
const CARPETA_MEDIA = 'multimedia';
const UMBRAL_MEDIA = 1.5 * 1024 * 1024;

function extraerMultimediaPesada(html, estado) {
  const crypto = require('crypto');
  const carpeta = path.join(PUBLICAR, CARPETA_MEDIA);
  let extraidos = 0, ahorro = 0;
  const usados = {};

  const visitar = function (valor) {
    if (typeof valor === 'string') {
      if (valor.indexOf('data:') !== 0) return valor;
      const mm = /^data:(audio|video)\/([a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(valor);
      if (!mm) return valor;
      const tipo = mm[1], ext = mm[2], b64 = mm[3];
      if (b64.length < UMBRAL_MEDIA) return valor;
      const hash = crypto.createHash('sha1').update(b64.slice(0, 4096)).digest('hex').slice(0, 12);
      const clave = tipo + ext + '-' + hash;
      let nombre = usados[clave];
      if (!nombre) {
        nombre = tipo + '-' + hash + '.' + (ext === 'mpeg' ? 'mp3' : ext);
        usados[clave] = nombre;
        try {
          if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
          fs.writeFileSync(path.join(carpeta, nombre), Buffer.from(b64, 'base64'));
        } catch (e) { return valor; }
        extraidos++;
        ahorro += valor.length;
      }
      return CARPETA_MEDIA + '/' + nombre;
    }
    if (Array.isArray(valor)) { for (let i = 0; i < valor.length; i++) valor[i] = visitar(valor[i]); return valor; }
    if (valor && typeof valor === 'object') { Object.keys(valor).forEach(function (k) { valor[k] = visitar(valor[k]); }); }
    return valor;
  };

  visitar(estado);
  return { extraidos: extraidos, ahorro: ahorro };
}

function publicarContenido(estado, opciones) {
  const opc = opciones || {};
  const destino = path.join(PUBLICAR, 'index.html');

  /* El estado con el contenido tal cual lo escribió la redacción. */
  const extraer = extraerMultimediaPesada('', estado);

  /* Se toma el HTML publicado como base (trae el motor del portal) y se le
     sustituye el bloque de contenido por el que envía el CMS. */
  let html = '';
  try { html = fs.readFileSync(destino, 'utf8'); } catch (e) { }
  if (!html) {
    try { html = fs.readFileSync(path.join(RAIZ, 'editor', 'index.html'), 'utf8'); } catch (e) { }
  }
  if (!html) return { ok: false, error: 'No se encontró el HTML del portal' };

  if (!RE_ESTADO.test(html)) {
    return { ok: false, error: 'El HTML no tiene el bloque de contenido' };
  }
  const json = JSON.stringify(estado).replace(/<\//g, '<\\/').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  html = html.replace(RE_ESTADO, function (todo, ini, _c, fin) { return ini + json + fin; });
  fs.writeFileSync(destino, html, 'utf8');

  const resultado = { ok: true, extraidos: extraer.extraidos, ahorro: extraer.ahorro, peso: fs.statSync(destino).size };

  if (opc.publicar) {
    try {
      execFileSync('C:\\Windows\\System32\\cmd.exe', ['/c', 'npm.cmd', 'run', 'build'], { cwd: RAIZ, stdio: 'pipe' });
      execFileSync(GIT, ['add', '-A'], { cwd: RAIZ, stdio: 'pipe' });
      const est = execFileSync(GIT, ['status', '--porcelain'], { cwd: RAIZ, encoding: 'utf8' });
      if (est.trim()) {
        execFileSync(GIT, ['commit', '-m', 'Publicacion del dia ' + new Date().toLocaleString('es-VE')], { cwd: RAIZ, stdio: 'pipe' });
      }
      execFileSync(GIT, ['push', 'origin', 'main'], { cwd: RAIZ, stdio: 'pipe', timeout: 180000 });
      resultado.publicado = true;
    } catch (e) {
      resultado.publicado = false;
      resultado.error = String(e.message || e).slice(0, 300);
    }
  }
  return resultado;
}

/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Conexión desde el sitio publicado                                           */
/* -------------------------------------------------------------------------- */
/* El CMS abierto en https://... le pide a este servidor que publique. Como
   son orígenes distintos, el navegador exige permisos CORS y un examen previo
   (OPTIONS) antes de dejarle pasar la peticion. Sin esto dice "No se pudo
   publicar". Aqui se concede solo lo justo: publicar. */
const CABECERAS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Opciones',
  'Access-Control-Max-Age': '600'
};

/* -------------------------------------------------------------------------- */

const servidor = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);

  /* --- examen previo del navegador -------------------------------------- */
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CABECERAS_CORS);
    return res.end();
  }

  /* --- el CMS publica por aquí --- */
  if (req.method === 'POST' && (url === '/publicar' || url === '/publicar/')) {
    let cuerpo = '';
    req.on('data', function (c) { cuerpo += c; });
    req.on('end', function () {
      let estado = null;
      try { estado = JSON.parse(cuerpo); } catch (e) { }
      if (!estado || typeof estado !== 'object') {
        res.writeHead(400, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CABECERAS_CORS));
        return res.end(JSON.stringify({ ok: false, error: 'Contenido no válido' }));
      }
      const opciones = {};
      try { Object.assign(opciones, JSON.parse(req.headers['x-opciones'] || '{}')); } catch (e) { }
      let resultado;
      try { resultado = publicarContenido(estado, opciones); }
      catch (e) { resultado = { ok: false, error: String(e.message || e).slice(0, 300) }; }
      res.writeHead(resultado.ok ? 200 : 500, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CABECERAS_CORS));
      res.end(JSON.stringify(resultado));
    });
    return;
  }

  /* --- servir archivos --- */
  let destino = path.join(RAIZ, url);
  if (url === '/' || url === '') destino = path.join(PUBLICAR, 'index.html');
  if (!path.resolve(destino).startsWith(path.resolve(RAIZ))) { res.writeHead(403); return res.end('Prohibido'); }
  fs.stat(destino, function (err, st) {
    if (!err && st.isDirectory()) destino = path.join(destino, 'index.html');
    fs.readFile(destino, function (e2, data) {
      if (e2) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado: ' + url); }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(destino).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(data);
    });
  });
});

servidor.listen(PUERTO, function () {
  console.log('Servidor local del diario en http://localhost:' + PUERTO + '/');
  console.log('  · portal publicado : http://localhost:' + PUERTO + '/');
  console.log('  · copia de trabajo : http://localhost:' + PUERTO + '/editor/index.html');
});
