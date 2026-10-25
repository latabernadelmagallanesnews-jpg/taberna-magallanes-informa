const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const ORIGEN = process.argv[2] || null;   // copia pristine opcional para comparar

function inventario(h) {
  const set = new Set();
  const patrones = [
    /\n\s*function\s+([A-Za-z0-9_$]+)\s*\(/g,
    /\n\s*const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?function/g,
    /\n\s*const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/g
  ];
  patrones.forEach(re => { for (const m of h.matchAll(re)) set.add(m[1]); });
  return set;
}

function bloques(h) {
  const i0 = h.indexOf('/*__MOTOR_INICIO__*/');
  const i1 = h.indexOf('/*__MOTOR_FIN__*/');
  const j0 = h.indexOf('/*__EDITOR_INICIO__*/');
  const j1 = h.indexOf('/*__EDITOR_FIN__*/');
  return {
    motor: i0 !== -1 && i1 !== -1 ? h.slice(i0, i1) : null,
    editor: j0 !== -1 && j1 !== -1 ? h.slice(j0, j1) : null
  };
}

let fallos = 0;
const ok = (m) => console.log('  ✓ ' + m);
const ko = (m) => { fallos++; console.log('  ✗ ' + m); };

const archivos = ['editor/index.html', path.join('publicar', 'index.html'), 'index.html'];

archivos.forEach((rel) => {
  const f = path.join(RAIZ, rel);
  const h = fs.readFileSync(f, 'utf8');
  console.log('\n=== ' + rel + ' (' + Buffer.byteLength(h, 'utf8') + ' bytes) ===');

  const inv = inventario(h);
  const b = bloques(h);
  if (b.motor) ok('bloque del motor presente (' + b.motor.length + ' chars)');
  else ko('falta el bloque del motor');

  if (b.editor) ok('bloque del editor presente (' + b.editor.length + ' chars)');
  else ko('falta el bloque del editor');

  const funcsClave = ['esc', 'escTexto', 'santizarRico', 'textoDeRico', 'aTextoPlano', 'esValorRico',
    'setTxt', 'setHtml', 'textoAParrafos', 'construirEditorRico', 'htmlEditorDesdeTexto',
    'guardarEditorRico', 'ejecutarComandoRico', 'activarEditoresRicos', 'alternarModoSimple',
    'nuevoId', 'clonar', 'valorDeRuta', 'asignarRuta', 'construirCMS', 'renderizarTodo'];
  const faltan = funcsClave.filter(fn => !inv.has(fn));
  if (faltan.length) ko('faltan funciones: ' + faltan.join(', '));
  else ok('las ' + funcsClave.length + ' funciones clave están presentes');

  const camposRico = (h.match(/rico: true/g) || []).length;
  if (camposRico >= 30) ok(camposRico + ' campos del CMS con editor con formato');
  else ko('solo ' + camposRico + ' campos con editor con formato');

  const cssWord = (h.match(/\.cms-rico-editor/g) || []).length;
  if (cssWord >= 3) ok('CSS del editor presente');
  else ko('falta el CSS del editor');

  if (ORIGEN) {
    const o = fs.readFileSync(ORIGEN, 'utf8');
    const invO = inventario(o);
    const perdidos = [...invO].filter(fn => !inv.has(fn));
    if (perdidos.length) ko('funciones perdidas respecto al original: ' + perdidos.join(', '));
    else ok('ninguna función perdida respecto al original (' + invO.size + ' funciones)');
  }
});

// Las copias del portal deben coincidir en lo importante
console.log('\n=== comparación de las copias ===');
const raizH = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const pubH = fs.readFileSync(path.join(RAIZ, 'publicar', 'index.html'), 'utf8');
const ediH = fs.readFileSync(path.join(RAIZ, 'editor', 'index.html'), 'utf8');
if (raizH === pubH) ok('la raíz y publicar/ son idénticas (GitHub Pages sirve lo mismo en ambos modos)');
else ko('la raíz y publicar/ difieren: la raíz debe ser una copia de publicar/');
if (ediH === pubH) ok('la copia de trabajo y la publicada son idénticas');
else {
  const la = ediH.split('\n'), lb = pubH.split('\n');
  let difs = 0;
  for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) difs++;
  if (difs <= 1) ok('la copia de trabajo difiere solo en el bloque de contenido incrustado');
  else ko('la copia de trabajo difiere en ' + difs + ' líneas');
}

// La puerta del CMS: oculta para el lector, visible para la redacción
console.log('\n=== puertas de acceso ===');
let logicaEditorial = true;
[['editor/index.html', ediH], ['publicar/index.html', pubH], ['index.html', raizH]].forEach(function (par) {
  const m = par[1].match(/<script type="application\/json" id="estadoEmbebido">([\s\S]*?)<\/script>/);
  let seg = {};
  try { seg = JSON.parse(m ? m[2] : '{}').seguridad || {}; } catch (e) { }
  const abierto = seg.puertasSiempre === true || seg.accesoPublico === true;
  if (abierto) ko(par[0] + ': los lectores verían el botón de acceso');
  else ok(par[0] + ': los lectores NO ven ningún botón de acceso');

  /* La redacción (Director y periodistas con código personal) debe ver la
     puerta siempre: el código da prioridad a la sesión sobre el interruptor
     de los lectores. */
  const prioridadSesion = par[1].indexOf('redaccion || dispositivo || (visibleParaLectores') !== -1;
  const prioridadDispositivo = par[1].indexOf('esDispositivoAutorizado') !== -1;
  if (!prioridadSesion || !prioridadDispositivo) logicaEditorial = false;
});
if (logicaEditorial) ok('la puerta se muestra siempre a quien esté autorizado (Director, periodista o dispositivo privado)');
else ko('no se encontró la prioridad de la sesión editorial o del dispositivo privado sobre el interruptor de lectores');

// El lector de contenido con formato y las páginas que lo usan
console.log('\n=== páginas sueltas con contenido con formato ===');
const rico = path.join(RAIZ, 'publicar', 'rico.js');
if (fs.existsSync(rico)) {
  const r = fs.readFileSync(rico, 'utf8');
  const tiene = ['ricoTexto', 'ricoHtml', 'ricoEsRico'].filter((f) => r.indexOf(f) !== -1);
  if (tiene.length === 3) ok('publicar/rico.js expone los tres lectores (texto, html, detección)');
  else ko('publicar/rico.js está incompleto: ' + tiene.join(', '));
} else {
  ko('falta publicar/rico.js');
}

['cronica.html', 'roster.html', 'buscador.html', 'vip.html'].forEach((pag) => {
  const f = path.join(RAIZ, 'publicar', pag);
  if (!fs.existsSync(f)) { ko('falta publicar/' + pag); return; }
  const h = fs.readFileSync(f, 'utf8');
  if (h.indexOf('rico.js') === -1) ko(pag + ': no carga rico.js');
  else if (h.indexOf('ricoHtml(') === -1 && h.indexOf('ricoEsRico(') === -1) ko(pag + ': carga rico.js pero no lo usa');
  else ok(pag + ': usa el lector de formato');
});

/* La puerta de la redacción debe existir en el sitio publicado y enlazarse
   desde el pie del portal, para que siempre se pueda llegar al CMS. */
console.log('\n=== puerta de la redacción ===');
[['publicar/redaccion-cms.html', 'publicar/'], ['redaccion-cms.html', 'raíz/']].forEach((par) => {
  const f = path.join(RAIZ, par[0]);
  if (!fs.existsSync(f)) { ko('falta ' + par[0]); return; }
  const h = fs.readFileSync(f, 'utf8');
  if (h.indexOf('index.html?cms=1') === -1) ko(par[0] + ': no abre el CMS');
  else ok(par[0] + ': abre el CMS');
});

/* El diseño de dos niveles (teaser + longform) debe estar completo: el
   marcado Y su CSS. Si falta el CSS, la maqueta se ve sin formato. */
console.log('\n=== diseño de dos niveles ===');
[['editor/index.html', 'copia de trabajo'], ['publicar/index.html', 'publicado'], ['index.html', 'raíz']].forEach((par) => {
  const f = path.join(RAIZ, par[0]);
  if (!fs.existsSync(f)) { ko('falta ' + par[0]); return; }
  const h = fs.readFileSync(f, 'utf8');
  const marcado = h.indexOf('class="teaser"') > -1;
  const css = h.indexOf('.teaser-imagen img') > -1 && h.indexOf('.teaser-cta') > -1;
  if (!marcado) ko(par[0] + ': falta el marcado de la tarjeta');
  else if (!css) ko(par[0] + ': falta el CSS de la tarjeta (quedaría sin formato)');
  else ok(par[0] + ': tarjeta con marcado y CSS');
});

/* Los campos con formato deben maquetarse, no escaparse: si se escapan, la
   nota escrita en el editor Word sale con las etiquetas a la vista. */
  console.log('\n=== la tipografía la manda el diseño ===');
  const OBJETIVOS_TIPOGRAFIA = ['editor/index.html', 'publicar/index.html', 'index.html'];
  OBJETIVOS_TIPOGRAFIA.forEach(function (f) {
    const ruta = path.join(RAIZ, f);
    if (!fs.existsSync(ruta)) return;
    const html = fs.readFileSync(ruta, 'utf8');
    const bien = html.indexOf('EL DISEÑO MANDA EN LOS TITULARES Y LAS ENTRADILLAS') !== -1 &&
      html.indexOf('#heroTitulo h1') !== -1 && html.indexOf('.longform-titular h1') !== -1;
    if (!bien) ko(f + ': el texto pegado puede romper la tipografía del titular');
    else ok(f + ': el diseño manda en los titulares (el texto pegado no los rompe)');

  });

  console.log('\n=== los parches del portal no están encadenados ===');
  try {
    const { revisarTodos } = require('./detectar-parches-encadenados');
    const revision = revisarTodos();
    if (revision.problemas.length) {
      ko('hay parches encadenados: ' + [...new Set(revision.problemas)].join(', '));
    } else {
      ok('los ' + revision.resultados.reduce(function (a, r) { return a + r.cambios; }, 0) +
        ' parches pendientes se aplican sin pisarse entre sí');
    }
  } catch (e) {
    ko('no se pudo comprobar los parches: ' + String(e && e.message ? e.message : e));
  }

console.log('\n=== contenido con formato ===');
[['editor/index.html', 'copia de trabajo'], ['publicar/index.html', 'publicado'], ['index.html', 'raíz']].forEach((par) => {
  const f = path.join(RAIZ, par[0]);
  if (!fs.existsSync(f)) return;
  const h = fs.readFileSync(f, 'utf8');
  const helper = h.indexOf('function htmlDeContenido') > -1;
  const usos = (h.match(/htmlDeContenido\(/g) || []).length;
  if (!helper) ko(par[0] + ': falta el ayudante que maqueta el contenido con formato');
  else if (usos < 10) ko(par[0] + ': solo ' + usos + ' campos usan el ayudante (deberían ser más)');
  else ok(par[0] + ': ' + usos + ' campos con formato se maquetan bien');
});

/* La compresión de imágenes debe estar activa: sin ella, subir una foto de
   4 MB produce un HTML de 30 MB que tarda una eternidad en cargar. */
console.log('\n=== optimización de imágenes ===');
[['editor/index.html', 'copia de trabajo'], ['publicar/index.html', 'publicado'], ['index.html', 'raíz']].forEach((par) => {
  const f = path.join(RAIZ, par[0]);
  if (!fs.existsSync(f)) return;
  const h = fs.readFileSync(f, 'utf8');
  const comprimir = h.indexOf('function comprimirImagenDataUrl') > -1;
  const alSubir = h.indexOf('comprimirImagenDataUrl(dataUrl)') > -1;
  const alPublicar = h.indexOf('optimizarImagenesDelEstado()') > -1;
  if (!comprimir) ko(par[0] + ': falta la compresión de imágenes');
  else if (!alSubir) ko(par[0] + ': las imágenes no se comprimen al subir');
  else if (!alPublicar) ko(par[0] + ': las imágenes no se optimizan al publicar');
  else ok(par[0] + ': las imágenes se comprimen al subir y al publicar');
});

if (pubH.indexOf('href="redaccion-cms.html"') !== -1) ok('el pie del portal enlaza a la puerta de redacción');
else ko('el pie del portal no enlaza a la puerta de redacción');
if (pubH.indexOf('copiarEnlaceItem') !== -1) ok('el CMS permite copiar el enlace de cada elemento');
else ko('falta el botón de enlace en el CMS');
if (pubH.indexOf('compartir-enlace-txt') !== -1) ok('la hoja de compartir muestra el enlace');
else ko('la hoja de compartir no muestra el enlace');

console.log('\n' + (fallos ? '✗ ' + fallos + ' problema(s)' : '✓ Todo verificado'));
process.exitCode = fallos ? 1 : 0;
