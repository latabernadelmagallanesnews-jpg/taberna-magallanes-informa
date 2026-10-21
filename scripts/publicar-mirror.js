/* ============================================================================
  ¿DÓNDE PUBLICAR EL PORTAL?  ·  UN COMANDO PARA CADA DESTINO
   ----------------------------------------------------------------------------
  GitHub Pages, Firebase Hosting, Netlify y Vercel publican exactamente la
  misma carpeta (publicar/). Lo que cambia es la DIRECCIÓN y el alcance
  geográfico:

    · GitHub Pages  → la más simple. El repositorio ES el sitio.
    · Firebase      → con analítica, rollback instantáneo y mejor CDN.
    · Netlify       → una de las pocas que se ven desde China.
    · Vercel        → también accesible desde China, muy rápido.

  Uso:
      node scripts/publicar-mirror.js netlify     (prepara la publicación)
      node scripts/publicar-mirror.js vercel
      node scripts/publicar-mirror.js firebase
      node scripts/publicar-mirror.js estado
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const PUBLICA = 'publicar';

const DESTINOS = {
  github: {
    nombre: 'GitHub Pages',
    url: 'https://latabernadelmagallanesnews-jpg.github.io/taberna-magallanes-informa/',
    estado: 'publicado',
    china: 'NO (github.io está bloqueado en China continental)',
    comando: 'git push origin main'
  },
  firebase: {
    nombre: 'Firebase Hosting',
    url: 'https://la-taberna-del-magallanes-news.web.app/',
    estado: 'preparado (falta iniciar sesión y el secreto)',
    china: 'NO (la red de Google está bloqueada en China continental)',
    comando: 'firebase login && firebase use la-taberna-del-magallanes-news && firebase deploy --only hosting'
  },
  netlify: {
    nombre: 'Netlify',
    url: 'https://<su-sitio>.netlify.app',
    estado: 'preparado (netlify.toml listo)',
    china: 'SÍ, se ve desde China continental',
    comando: 'netlify deploy --prod --dir=publicar'
  },
  vercel: {
    nombre: 'Vercel',
    url: 'https://<su-sitio>.vercel.app',
    estado: 'preparado (vercel.json listo)',
    china: 'SÍ, se ve desde China continental',
    comando: 'vercel --prod'
  }
};

function estado() {
  console.log('\n=== ¿DÓNDE ESTÁ PUBLICADO EL PORTAL? ===\n');
  Object.keys(DESTINOS).forEach(function (k) {
    const d = DESTINOS[k];
    console.log('  ' + d.nombre + ' (' + k + ')');
    console.log('    dirección : ' + d.url);
    console.log('    estado    : ' + d.estado);
    console.log('    en China  : ' + d.china);
    console.log('    publicar  : ' + d.comando);
    console.log('');
  });
  console.log('  Todos publican la misma carpeta: ' + PUBLICA + '/');
  console.log('  Con un dominio propio (por ejemplo latabernadelmagallanes.news)');
  console.log('  puede cambiar de plataforma sin cambiar la direccion para el lector.\n');
}

function preparar(cual) {
  const d = DESTINOS[cual];
  if (!d) {
    console.error('✗ Destino no reconocido. Use: netlify | vercel | firebase | github | estado');
    process.exit(1);
  }
  console.log('\n=== PREPARANDO ' + d.nombre.toUpperCase() + ' ===\n');
  console.log('  Se publica la carpeta: ' + PUBLICA + '/');
  console.log('  Comando: ' + d.comando + '\n');

  if (cual === 'netlify') {
    console.log('  Conector con GitHub (recomendado):');
    console.log('    1) https://app.netlify.com -> Add new site -> Import an existing project');
    console.log('    2) Elija  latabernadelmagallanesnews-jpg/taberna-magallanes-informa');
    console.log('    3) Netlify lee el netlify.toml y publica solo en cada push.\n');
  }
  if (cual === 'vercel') {
    console.log('  Conector con GitHub (recomendado):');
    console.log('    1) https://vercel.com/new -> Import Project');
    console.log('    2) Elija el repositorio; Vercel lee el vercel.json\n');
  }
  if (cual === 'firebase') {
    console.log('  Pasos para dejarlo listo:');
    console.log('    1) npm install -g firebase-tools   (si no lo tiene)');
    console.log('    2) firebase login');
    console.log('    3) firebase use la-taberna-del-magallanes-news');
    console.log('    4) firebase deploy --only hosting\n');
    console.log('  Y para que el workflow lo publique solo en cada push, añada en');
    console.log('  Settings -> Secrets and variables -> Actions:');
    console.log('    FIREBASE_SERVICE_ACCOUNT  =  el JSON de la cuenta de servicio');
    console.log('    FIREBASE_PROJECT_ID      =  la-taberna-del-magallanes-news\n');
  }
  if (cual === 'github') {
    console.log('  Ya esta publicado. Cada push a main vuelve a construir y publicar.');
    console.log('  Los ultimos pasos: npm run instalar  (instala el HTML descargado del CMS)');
    console.log('                     npm run build      (compila y verifica)\n');
  }
}

const accion = (process.argv[2] || 'estado').toLowerCase();
if (accion === 'estado') estado();
else preparar(accion);
