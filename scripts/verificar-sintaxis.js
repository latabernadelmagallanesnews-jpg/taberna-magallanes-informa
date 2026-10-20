const fs = require('fs');
const vm = require('vm');

const files = process.argv.slice(2);
if (!files.length) files.push('C:/Users/F4NT45M4/Documents/Proyecto predeterminado/publicar/index.html');

let fallos = 0;
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  const scripts = [...h.matchAll(/<script(?![^>]*type="application)/g)];
  console.log('\n=== ' + f + ' ===');
  console.log('bloques <script> encontrados:', scripts.length);

  // localizar el bloque principal (el que no es application/json)
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m, n = 0;
  while ((m = re.exec(h)) !== null) {
    n++;
    const code = m[1];
    const etiqueta = '#' + n + ' (' + code.length.toLocaleString('es-VE') + ' chars)';
    try {
      new vm.Script(code, { filename: 'bloque' + n + '.js' });
      console.log('  ✓ ' + etiqueta + ' sintaxis OK');
    } catch (e) {
      fallos++;
      console.log('  ✗ ' + etiqueta + ' ERROR: ' + e.message);
      const m2 = /(\d+)/.exec(e.stack || '');
      const linea = e.lineNumber || (e.stack ? (e.stack.match(/bloque\d+\.js:(\d+)/) || [])[1] : null);
      if (linea) {
        const ls = code.split('\n');
        const n0 = parseInt(linea, 10);
        for (let i = Math.max(0, n0 - 4); i < Math.min(ls.length, n0 + 3); i++) console.log('      ' + (i + 1) + ': ' + ls[i]);
      }
    }
  }
}
console.log('\n' + (fallos ? '✗ ' + fallos + ' bloque(s) con error' : '✓ Todos los bloques compilan'));
process.exitCode = fallos ? 1 : 0;
