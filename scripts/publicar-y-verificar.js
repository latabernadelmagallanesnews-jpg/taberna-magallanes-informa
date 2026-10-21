/* ============================================================================
  PUBLICA EL DIARIO Y COMPRUEBA QUE YA ESTÁ EN INTERNET
   ----------------------------------------------------------------------------
  Hace todo el ciclo en un solo comando y, sobre todo, ESPERA y VERIFICA que
  el contenido esté de verdad en el sitio publicado. Así nadie se queda con la
  duda de si salió o no.

    1. Busca el index.html descargado del CMS y lo instala en publicar/.
    2. Compila y verifica que todo esté bien.
    3. Sube el cambio a GitHub.
    4. Espera a que GitHub Pages republished y COMPRUEBA que la nota (u otra
       firma del contenido) ya aparece en el sitio público.

  Uso:  node scripts/publicar-y-verificar.js
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const GIT = 'C:\\Program Files\\Git\\cmd\\git.exe';
const SITIO = 'https://latabernadelmagallanesnews-jpg.github.io/taberna-magallanes-informa/';
const RE_ESTADO = /<script type="application\/json" id="estadoEmbebido">([\s\S]*?)<\/script>/;

function paso(txt) { console.log('  ' + txt); }
function titulo(txt) { console.log('\n=== ' + txt + ' ==='); }

function leer(url) {
  return new Promise(function (res) {
    const op = { headers: { 'user-agent': 'taberna-check', 'cache-control': 'no-cache' }, timeout: 45000 };
    https.get(url + '?_=' + Date.now(), op, function (r) {
      let d = '';
      r.on('data', function (c) { d += c; });
      r.on('end', function () { res(d); });
    }).on('error', function () { res(''); }).on('timeout', function () { res(''); });
  });
}

/* Firma del contenido: sirve para saber si lo publicado es lo que publicamos. */
function firma(html) {
  const m = html.match(RE_ESTADO);
  if (!m) return '';
  try {
    const e = JSON.parse(m[1]);
    const c = (e.cronicas || []).map(function (x) { return String(x.titulo || '').replace(/[\u241F]/g, '').slice(0, 60); });
    return c.join('|') + '#' + ((e.cronicas || []).length) + '#' + (e.cronicasSeccion ? e.cronicasSeccion.nota || '' : '').replace(/[\u241F]/g, '').slice(0, 40);
  } catch (e) { return ''; }
}

(async function main() {
  console.log('\n=========================================================');
  console.log('  PUBLICAR LA TABERNA DEL MAGALLANES NEWS');
  console.log('=========================================================\n');

  /* --- 1 · instalar la descarga ---------------------------------------- */
  titulo('1 de 4 · Buscando lo que descargó del CMS');
  try {
    execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'instalar-html-publicado.js')], { stdio: 'inherit' });
  } catch (e) {
    console.log('\n  ✗ No se pudo instalar. Pulse «🚀 Descargar HTML publicado» en el CMS y repita.');
    process.exit(1);
  }

  /* --- 2 · compilar y verificar ---------------------------------------- */
  titulo('2 de 4 · Compilando y verificando');
  try {
    execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'verificar-portal.js')], { stdio: 'inherit' });
  } catch (e) {
    console.log('\n  ✗ La verificación falló. No se publica nada.');
    process.exit(1);
  }

  const local = fs.readFileSync(path.join(RAIZ, 'publicar', 'index.html'), 'utf8');
  const firmaLocal = firma(local);
  if (!firmaLocal) {
    console.log('\n  ⚠ No se pudo leer el contenido del archivo publicado.');
    process.exit(1);
  }

  /* --- 3 · subir ------------------------------------------------------- */
  titulo('3 de 4 · Subiendo a GitHub');
  try {
    execFileSync(GIT, ['add', '-A'], { cwd: RAIZ, stdio: 'inherit' });
    const est = execFileSync(GIT, ['status', '--porcelain'], { cwd: RAIZ, encoding: 'utf8' });
    if (est.trim()) {
      execFileSync(GIT, ['commit', '-m', 'Publicacion del dia ' + new Date().toLocaleString('es-VE')], { cwd: RAIZ, stdio: 'inherit' });
    }
    execFileSync(GIT, ['push', 'origin', 'main'], { cwd: RAIZ, stdio: 'inherit' });
    paso('Subido.');
  } catch (e) {
    console.log('\n  ✗ No se pudo subir a GitHub.');
    process.exit(1);
  }

  /* --- 4 · esperar y comprobar que ya está en internet ----------------- */
  titulo('4 de 4 · Esperando que el sitio se actualice');
  paso('GitHub tarda 1-4 minutos. Comprobando cada 15 segundos…');

  const limite = Date.now() + 5 * 60 * 1000;
  let listo = false;
  let intento = 0;

  while (Date.now() < limite) {
    intento++;
    const enVivo = await leer(SITIO);
    if (enVivo) {
      const f = firma(enVivo);
      if (f && f === firmaLocal) {
        listo = true;
        break;
      }
      if (f && f !== firmaLocal) {
        paso('El sitio todavía muestra la versión anterior (intento ' + intento + ').');
      }
    } else {
      paso('Sin respuesta del sitio (intento ' + intento + ').');
    }
    await new Promise(function (r) { setTimeout(r, 15000); });
  }

  console.log('');
  if (listo) {
    console.log('  ✅ YA ESTÁ PUBLICADO. Lo puede ver cualquier dispositivo:');
    console.log('');
    console.log('     ' + SITIO);
    console.log('');
    console.log('  Para entrar al CMS desde ese dispositivo:');
    console.log('     ' + SITIO + 'redaccion-cms.html');
    console.log('');
  } else {
    console.log('  ⚠ El contenido ya está subido, pero el sitio no responde aún.');
    console.log('    Puede que GitHub tarde un poco más. Revise en unos minutos:');
    console.log('     ' + SITIO);
    console.log('');
  }
})();
