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

const archivos = ['index.html', path.join('publicar', 'index.html')];

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

// Las dos copias del portal solo deben diferir en el bloque de estado
const raizH = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const pubH = fs.readFileSync(path.join(RAIZ, 'publicar', 'index.html'), 'utf8');
console.log('\n=== comparación de las dos copias ===');
const la = raizH.split('\n'), lb = pubH.split('\n');
let difs = 0;
for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) difs++;
if (difs === 1) ok('difieren solo en 1 línea (el bloque de contenido incrustado)');
else ko('difieren en ' + difs + ' líneas (debería ser 1)');

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

console.log('\n' + (fallos ? '✗ ' + fallos + ' problema(s)' : '✓ Todo verificado'));
process.exitCode = fallos ? 1 : 0;
