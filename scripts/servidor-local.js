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
const os = require('os');
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

/* -------------------------------------------------------------------------- */
/* Contador de visitantes del diario                                           */
/* -------------------------------------------------------------------------- */
const CONTADOR_ARCHIVO = path.join(RAIZ, 'contador.json');
function leerContador() {
  try { return JSON.parse(fs.readFileSync(CONTADOR_ARCHIVO, 'utf8')); }
  catch (e) { return { visitas: 0, ultima: '' }; }
}
function guardarContador(c) {
  try { fs.writeFileSync(CONTADOR_ARCHIVO, JSON.stringify(c, null, 2)); }
  catch (e) { console.error('No se pudo guardar el contador:', e.message); }
}

/* -------------------------------------------------------------------------- */

/* El estado que hay ahora mismo publicado en el diario. */
function leerEstadoPublicado() {
  try {
    const h = fs.readFileSync(path.join(PUBLICAR, 'index.html'), 'utf8');
    const m = h.match(/<script type="application\/json" id="estadoEmbebido">([\s\S]*?)<\/script>/);
    return m ? JSON.parse(m[1]) : null;
  } catch (e) { return null; }
}

function extraerMultimediaPesada(html, estado) {
  const crypto = require('crypto');
  const carpeta = path.join(PUBLICAR, CARPETA_MEDIA);
  let extraidos = 0, ahorro = 0;
  const usados = {};

  const visitar = function (valor) {
    if (typeof valor === 'string') {
      if (valor.indexOf('data:') !== 0) return valor;
      const mm = /^data:(audio|video|image)\/([a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(valor);
      if (!mm) return valor;
      const tipo = mm[1], ext = mm[2], b64 = mm[3];
      /* Las fotos siempre salen a archivo (aunque sean pequeñas): así
         tienen dirección web y se pueden compartir en WhatsApp y en
         las redes. Los audios y videos solo si son pesados. */
      const pesado = tipo !== 'image';
      if (!pesado && b64.length < 4000) return valor;
      if (pesado && b64.length < UMBRAL_MEDIA) return valor;
      const hash = crypto.createHash('sha1').update(b64.slice(0, 4096)).digest('hex').slice(0, 12);
      const clave = tipo + ext + '-' + hash;
      let nombre = usados[clave];
      if (!nombre) {
        const extension = (tipo === 'image')
          ? ({ 'jpeg': 'jpg', 'jpg': 'jpg', 'png': 'png', 'webp': 'webp', 'gif': 'gif', 'svg+xml': 'svg', 'avif': 'avif' }[ext] || 'jpg')
          : (ext === 'mpeg' ? 'mp3' : ext);
        nombre = tipo + '-' + hash + '.' + extension;
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

  /* --- candado: un estado vacío no borra el diario --------------------- */
  /* Si llega un estado SIN notas y el diario publicado SÍ las tiene, no se
     publica así: se conservan las notas. (Una publicación de prueba con el
     navegador en blanco había dejado el diario sin contenido.) */
  const publicado = leerEstadoPublicado();
  if (publicado && (publicado.cronicas || []).length && !(estado.cronicas || []).length) {
    estado.cronicas = publicado.cronicas;
    estado.cronicasSeccion = estado.cronicasSeccion || publicado.cronicasSeccion;
    console.log('  ! el estado que llegó iba SIN notas: se conservan las ' +
      publicado.cronicas.length + ' notas que ya estaban publicadas');
  }

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
      execFileSync('C:\\Windows\\System32\\cmd.exe', ['/c', 'npm.cmd', 'run', 'build'], { cwd: RAIZ, stdio: 'pipe', timeout: 300000 });
      execFileSync(GIT, ['add', '-A'], { cwd: RAIZ, stdio: 'pipe' });
      const est = execFileSync(GIT, ['status', '--porcelain'], { cwd: RAIZ, encoding: 'utf8' });
      if (est.trim()) {
        execFileSync(GIT, ['commit', '-m', 'Publicacion del dia ' + new Date().toLocaleString('es-VE')], { cwd: RAIZ, stdio: 'pipe' });
      }
      execFileSync(GIT, ['push', 'origin', 'main'], { cwd: RAIZ, stdio: 'pipe', timeout: 180000 });
      resultado.publicado = true;
    } catch (e) {
      /* Si la compilación o el envío fallan, NO se puede decir que está
         publicado: hay que avisar del problema real. */
      resultado.publicado = false;
      resultado.ok = false;
      const salida = String((e && e.stdout) || '') + String((e && e.stderr) || '') + String(e && e.message ? e.message : e);
      const linea = salida.split('\n').map(function (x) { return x.trim(); }).filter(function (x) { return x.indexOf('✗') === 0 || x.indexOf('ERROR') !== -1; })[0];
      resultado.error = 'No se pudo publicar: ' + (linea || String(e && e.message ? e.message : e)).slice(0, 300);
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
      const codigo = resultado.ok ? 200 : 500;
      res.writeHead(codigo, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CABECERAS_CORS));
      res.end(JSON.stringify(resultado));
    });
    return;
  }

  /* --- contar cada visita al sitio publicado ----------------------------- */
  /* Cada vez que alguien entra al portal (cualquier página), se cuenta una
     visita. Así sabemos cuánta gente lee el diario. */
  if (req.method === 'GET' && url !== '/contador' && !url.startsWith('/multimedia/') && !url.startsWith('/notas/')) {
    const c = leerContador();
    c.visitas = (c.visitas || 0) + 1;
    c.ultima = new Date().toISOString();
    guardarContador(c);
  }

  /* --- endpoint: consultar el contador ----------------------------------- */
  if (req.method === 'GET' && (url === '/contador' || url === '/contador/')) {
    const c = leerContador();
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CABECERAS_CORS));
    return res.end(JSON.stringify({ visitas: c.visitas || 0, ultima: c.ultima || '' }));
  }

  /* --- endpoint: reiniciar el contador (solo desde la redacción) --------- */
  if (req.method === 'POST' && (url === '/contador/reset' || url === '/contador/reset/')) {
    guardarContador({ visitas: 0, ultima: '' });
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CABECERAS_CORS));
    return res.end(JSON.stringify({ ok: true, visitas: 0 }));
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
  console.log('  · vigilando Descargas: si baja un index.html del CMS, se publica solo');
});

/* -------------------------------------------------------------------------- */
/* VIGILAR LA CARPETA DE DESCARGAS                                              */
/* -------------------------------------------------------------------------- */
/* Cuando el CMS baja el HTML publicado, esta carpeta lo recibe. Aquí se
   recoge y se publica sin que nadie tenga que hacer nada. Así el botón
   «Publicar ahora» del CMS sirve aunque el navegador no alcance al
   servidor: basta con que baje el archivo. */
const CARPETA_DESCARGAS = path.join(os.homedir(), 'Downloads');
const MARCA_PROCESADOS = path.join(RAIZ, '.html-procesados.json');
const EDAD_MAXIMA_MS = 3 * 60 * 1000;   // solo lo nuevo: tres minutos

let procesados = {};
try { procesados = JSON.parse(fs.readFileSync(MARCA_PROCESADOS, 'utf8')); } catch (e) { }

function estadoDelArchivo(ruta) {
  const m = fs.readFileSync(ruta, 'utf8');
  const mm = m.match(/<script type="application\/json" id="estadoEmbebido">([\s\S]*?)<\/script>/);
  if (!mm) return null;
  try { return JSON.parse(mm[1]); } catch (e) { return null; }
}

function vigilarDescargas() {
  setInterval(function () {
    let nombres = [];
    try { nombres = fs.readdirSync(CARPETA_DESCARGAS); } catch (e) { return; }
    nombres.filter(function (n) { return /^index.*\.html$/i.test(n); }).forEach(function (nombre) {
      const ruta = path.join(CARPETA_DESCARGAS, nombre);
      let st;
      try { st = fs.statSync(ruta); } catch (e) { return; }
      if (Date.now() - st.mtimeMs > EDAD_MAXIMA_MS) return;         // no es nuevo
      const clave = st.size + '|' + Math.round(st.mtimeMs);
      if (procesados[nombre] === clave) return;                     // ya se hizo
      procesados[nombre] = clave;
      try { fs.writeFileSync(MARCA_PROCESADOS, JSON.stringify(procesados)); } catch (e) { }

      console.log('· HTML nuevo en Descargas (' + nombre + '): se instala y se publica solo');
      try {
        const { execFileSync } = require('child_process');
        execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'instalar-html-publicado.js')], { stdio: 'pipe' });
        const estado = estadoDelArchivo(path.join(PUBLICAR, 'index.html'));
        if (!estado) { console.log('· el HTML descargado no trae contenido'); return; }
        const r = publicarContenido(estado, { publicar: true });
        console.log(r.publicado
          ? '  ✓ publicado: ' + (r.error ? r.error : 'subido a GitHub')
          : '  ✗ no se pudo publicar: ' + (r.error || ''));
      } catch (e) {
        console.log('· no se pudo publicar el archivo descargado: ' + String(e && e.message ? e.message : e));
      }
    });
  }, 8000);
}
vigilarDescargas();


/* El servidor no debe caerse nunca: si una petición sale mal o se recompila
   el portal mientras se sirve, sigue listening para que «Publicar ahora»
   siga funcionando. */
servidor.on('clientError', function (err, socket) {
  try { socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); } catch (e) { }
});
servidor.on('error', function (err) {
  console.error('· el servidor local tuvo un problema: ' + String(err && err.message ? err.message : err));
});
process.on('uncaughtException', function (err) {
  console.error('· error inesperado en el servidor local: ' + String(err && err.message ? err.message : err));
});
