/* ============================================================================
  COMPROBAR QUE LOS PARCHES NO ESTÁN ENCADENADOS
  ----------------------------------------------------------------------------
  Un parche "encadenado" es el que modifica el texto que otro parche había
  puesto: el primero deja de encontrar su texto nuevo y la recompilación
  falla con «No se encontró el fragmento».

  Aquí se simula el parcheador de verdad (el mismo orden y la misma regla):
  si un parche no encuentra su texto viejo y tampoco su texto nuevo, se avisa.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');

function desescapar(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && i + 1 < s.length) {
      const d = s[i + 1];
      if (d === 'n') { out += '\n'; i++; continue; }
      if (d === 't') { out += '\t'; i++; continue; }
      if (d === 'r') { out += '\r'; i++; continue; }
      if (d === '\\') { out += '\\'; i++; continue; }
      if (d === "'") { out += "'"; i++; continue; }
      if (d === '"') { out += '"'; i++; continue; }
      if (d === '`') { out += '`'; i++; continue; }
      if (d === '$') { out += '$'; i++; continue; }
      out += d; i++; continue;
    }
    out += c;
  }
  return out;
}

/* Los parches, en el orden en que se aplican. */
function parchesDelParcheador() {
  const src = fs.readFileSync(path.join(RAIZ, 'scripts', 'aplicar-editor-word.js'), 'utf8');
  const lista = [];
  const re = /h = reemplazar\(\s*h,\s*`([\s\S]*?)`,\s*`([\s\S]*?)`,\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    lista.push({ viejo: desescapar(m[1]), nuevo: desescapar(m[2]), etiqueta: m[3] });
  }
  return lista;
}

/* Simula el parcheador sobre una copia del HTML. */
function simular(archivo) {
  const ruta = path.join(RAIZ, archivo);
  if (!fs.existsSync(ruta)) return { archivo: archivo, problemas: [], cambios: 0 };
  let h = fs.readFileSync(ruta, 'utf8');
  const problemas = [];
  let cambios = 0;
  parchesDelParcheador().forEach(function (p) {
    if (h.indexOf(p.nuevo) !== -1) return;                 // ya aplicado
    if (h.indexOf(p.viejo) === -1) {
      problemas.push(p.etiqueta);
      return;
    }
    h = h.split(p.viejo).join(p.nuevo);
    cambios++;
  });
  return { archivo: archivo, problemas: problemas, cambios: cambios };
}

function revisarTodos() {
  const archivos = ['publicar/index.html', 'index.html', 'editor/index.html'];
  const resultados = archivos.map(simular);
  return {
    resultados: resultados,
    problemas: resultados.reduce(function (acc, r) { return acc.concat(r.problemas); }, [])
  };
}

module.exports = { revisarTodos, parchesDelParcheador };

if (require.main === module) {
  const r = revisarTodos();
  console.log('parches en el parcheador:', parchesDelParcheador().length);
  r.resultados.forEach(function (x) {
    console.log('  ' + x.archivo + ': ' + x.cambios + ' parches por aplicar' +
      (x.problemas.length ? ' · PROBLEMAS: ' + x.problemas.join(', ') : ' ✓'));
  });
  if (r.problemas.length) {
    console.log('\n✗ parches que no se pueden aplicar (están encadenados con otro):');
    [...new Set(r.problemas)].forEach(function (p) { console.log('  - ' + p); });
    process.exitCode = 1;
  } else {
    console.log('\n✓ ningún parche está encadenado con otro');
  }
}
