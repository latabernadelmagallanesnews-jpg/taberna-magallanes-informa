/* ============================================================================
  QUE EL SERVIDOR LOCAL ARRANQUE SOLO CON WINDOWS
  ----------------------------------------------------------------------------
  El botón «Publicar ahora» del CMS habla con el servidor de esta
  computadora. Si la computadora se reinicia y el servidor no arranca solo,
  el botón deja de funcionar y parece que «no se permite publicar».

  Este script deja un acceso en la carpeta de Inicio de Windows para que el
  servidor se encienda con el sistema.
   ============================================================================ */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const NODE = 'C:\\Program Files\\nodejs\\node.exe';

const INICIO = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft',
  'Windows', 'Start Menu', 'Programs', 'Startup');
const ACCESO = path.join(INICIO, 'Taberna del Magallanes - servidor local.cmd');

const contenido = [
  '@echo off',
  'rem ===========================================================================',
  'rem  Enciende el servidor local del diario.',
  'rem  Es lo que permite que el boton "Publicar ahora" del CMS funcione.',
  'rem  No hace nada visible: se queda corriendo en segundo plano.',
  'rem ===========================================================================',
  'cd /d "' + RAIZ + '"',
  'start "" /min "' + NODE + '" scripts\\servidor-local.js',
  'exit',
  ''
].join('\r\n');

try {
  if (!fs.existsSync(INICIO)) fs.mkdirSync(INICIO, { recursive: true });
  fs.writeFileSync(ACCESO, contenido, 'utf8');
  console.log('✓ el servidor local arrancará solo con Windows');
  console.log('  ' + ACCESO);
} catch (e) {
  console.log('✗ no se pudo crear el acceso de inicio: ' + (e && e.message ? e.message : e));
  console.log('  Si publica a mano, doble clic en PUBLICAR-EL-DIARIO.cmd.');
}
