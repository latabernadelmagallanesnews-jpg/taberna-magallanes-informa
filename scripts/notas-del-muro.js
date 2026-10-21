/* Ajusta el número de notas que muestra el muro de crónicas.
   El valor vive en el bloque de contenido incrustado del HTML publicado. */
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PUBLICAR = path.join(RAIZ, 'publicar', 'index.html');
const CUANTAS = parseInt(process.argv[2] || '4', 10);
const RE = /(<script type="application\/json" id="estadoEmbebido">)([\s\S]*?)(<\/script>)/;

const html = fs.readFileSync(PUBLICAR, 'utf8');
const m = html.match(RE);
if (!m) { console.error('✗ no se encontró el bloque de estado'); process.exit(1); }

const estado = JSON.parse(m[2]);
const antes = (estado.cronicasSeccion || {}).maximoMuro;
estado.cronicasSeccion = estado.cronicasSeccion || {};
estado.cronicasSeccion.maximoMuro = String(CUANTAS);

const nuevo = html.replace(RE, (todo, ini, _c, fin) => ini + JSON.stringify(estado) + fin);
fs.writeFileSync(PUBLICAR, nuevo, 'utf8');

console.log('✓ notas en el carrusel del muro: ' + antes + ' → ' + CUANTAS);
const total = (estado.cronicas || []).length;
console.log('  (el muro tiene ' + total + ' notas; se muestran ' + CUANTAS + ' a la vez)');
