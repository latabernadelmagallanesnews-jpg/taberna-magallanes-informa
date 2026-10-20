/* ============================================================================
  FIJA LA URL PÚBLICA DEL PORTAL
   ----------------------------------------------------------------------------
  El portal usa esta dirección para:
    · los enlaces que se generan al compartir (WhatsApp, X, Facebook...)
    · los códigos QR
    · la URL canónica y las etiquetas Open Graph que ven los buscadores

  Si se deja vacía o apuntando a un sitio de ejemplo, el portal usa la
  dirección donde esté abierto en ese momento. Eso está bien en el sitio
  publicado, pero al probar en local (localhost) los enlaces que se copian
  apuntan a la computadora y no sirven para nada.

  Con este script la URL queda fijada, así que siempre se comparte el sitio
  real, esté usted donde esté.

  Uso:  node scripts/fijar-url-publica.js [direccion]
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const OBJETIVOS = [
  path.join(RAIZ, 'editor', 'index.html'),
  path.join(RAIZ, 'publicar', 'index.html'),
  path.join(RAIZ, 'index.html')
];

const PREDEFINIDA = 'https://latabernadelmagallanesnews-jpg.github.io/taberna-magallanes-informa/';
const url = (process.argv[2] || PREDEFINIDA).trim().replace(/\/+$/, '') + '/';

/* --- 1 · la URL dentro del estado de fábrica (ESTADO_SEMILLA) ----------- */
const SEMILLA_OLD = "      url: 'https://latabernadelmagallanes.news',";
const SEMILLA_NEW = "      url: '" + url.replace(/'/g, "\\'") + "',";

/* --- 2 · la URL en las etiquetas estáticas del <head> ------------------- */
const CANONICA_OLD = '<link id="seoCanonica" rel="canonical" href="https://latabernadelmagallanes.news">';
const CANONICA_NEW = '<link id="seoCanonica" rel="canonical" href="' + url + '">';

const OG_OLD = '<meta id="ogTagUrl" property="og:url" content="https://latabernadelmagallanes.news">';
const OG_NEW = '<meta id="ogTagUrl" property="og:url" content="' + url + '">';

/* --- 3 · la imagen QR de ejemplo (se reemplaza al abrir el modal) ------ */
const QR_OLD = 'data=https://latabernadelmagallanes.news"';
const QR_NEW = 'data=' + encodeURIComponent(url) + '"';

/* --- 4 · el dominio que se muestra en la vista previa Open Graph -------- */
const DOM_OLD = '<span id="ogModalDominio" style="font-size: 0.65rem; color: #888888; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">latabernadelmagallanes.news</span>';
const DOM_NEW = '<span id="ogModalDominio" style="font-size: 0.65rem; color: #888888; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">' + url.replace(/^https?:\/\//, '').replace(/\/+$/, '') + '</span>';

let tocados = 0;

OBJETIVOS.forEach(function (archivo) {
  if (!fs.existsSync(archivo)) return;
  let h = fs.readFileSync(archivo, 'utf8');
  const antes = h;

  if (h.indexOf(SEMILLA_OLD) !== -1) h = h.split(SEMILLA_OLD).join(SEMILLA_NEW);
  if (h.indexOf(CANONICA_OLD) !== -1) h = h.split(CANONICA_OLD).join(CANONICA_NEW);
  if (h.indexOf(OG_OLD) !== -1) h = h.split(OG_OLD).join(OG_NEW);
  if (h.indexOf(QR_OLD) !== -1) h = h.split(QR_OLD).join(QR_NEW);
  /* El dominio de la vista previa Open Graph (se reemplaza al abrirla, pero
     se deja bien desde el principio). */
  h = h.replace(/(id="ogModalDominio"[^>]*>)[^<]*(<\/span>)/, function (todo, ini, fin) {
    return ini + url.replace(/^https?:\/\//, '').replace(/\/+$/, '') + fin;
  });

  if (h !== antes) {
    fs.writeFileSync(archivo, h, 'utf8');
    tocados++;
    console.log('✓ ' + path.basename(archivo) + ': URL pública fijada en ' + url);
  }
});

/* --- 3 · el portal debe respetar la URL fijada aunque esté en local ---- */
console.log('\n  Recuerde: si algún día publica en otro sitio (Firebase o un');
console.log('  dominio propio), vuelva a ejecutar este script con la nueva');
console.log('  dirección, o cámbielo en el CMS → SEO → «URL canónica».\n');

if (!tocados) console.log('· Nada que cambiar: la URL ya estaba fijada.');
