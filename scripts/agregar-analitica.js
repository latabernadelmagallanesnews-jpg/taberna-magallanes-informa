/* ============================================================================
  ANALÍTICA, CONTADOR Y SEO PARA EL PORTAL PUBLICADO
  ----------------------------------------------------------------------------
  Este script se ejecuta como parte de `npm run build` y agrega al HTML
  publicado:

  1. Google Analytics 4 (configurable con tu ID de medición)
  2. Contador de visitantes (usa el servidor local si está disponible, o
     localStorage como respaldo)
  3. Optimización SEO básica (meta tags, canonical, JSON-LD)
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PUBLICAR = path.join(RAIZ, 'publicar');
const INDEX = path.join(PUBLICAR, 'index.html');

/* -------------------------------------------------------------------------- */
/* CONFIGURACIÓN                                                              */
/* -------------------------------------------------------------------------- */
/* Pega aquí tu ID de medición de Google Analytics 4.
   Lo obtienes en: https://analytics.google.com/ → Admin → Flujos de datos
   Si no tienes uno, deja GA4_ID vacío y el portal funcionará igual. */
const GA4_ID = 'G-XXXXXXXXXX';  /* ← CAMBIA ESTO por tu ID real de GA4 */

/* -------------------------------------------------------------------------- */

/* Lee el HTML publicado */
let html = fs.readFileSync(INDEX, 'utf8');

/* -------------------------------------------------------------------------- */
/* 1. GOOGLE ANALYTICS 4                                                      */
/* -------------------------------------------------------------------------- */
const codigoGA = `
<!-- Google Analytics 4 - La Taberna del Magallanes News -->
<!-- Reemplaza G-XXXXXXXXXX con tu ID real de medición -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA4_ID}', {
    page_title: document.title,
    page_location: document.location.href
  });
  /* Evento personalizado: cuando se lee una nota completa */
  document.addEventListener('click', function(e) {
    const a = e.target.closest('a');
    if (a && a.href && a.href.includes('cronica.html')) {
      gtag('event', 'click_nota', {
        event_category: 'navegacion',
        event_label: a.getAttribute('href') || a.textContent
      });
    }
    if (a && a.href && a.href.includes('whatsapp')) {
      gtag('event', 'compartir_whatsapp', {
        event_category: 'compartir',
        event_label: document.title
      });
    }
  });
</script>
`;

/* 2. CONTADOR DE VISITANTES */
/* Este script intenta llamar al servidor local para obtener el conteo real.
   Si no hay servidor disponible (ej. en GitHub Pages), usa localStorage
   como respaldo para contar las visitas de este navegador. */
const codigoContador = `
<!-- Contador de visitantes - La Taberna del Magallanes News -->
<div id="contador-visitas" style="
  position:fixed; bottom:10px; right:10px; z-index:9999;
  background:#0b2240; color:#ffffff; padding:6px 10px;
  border-radius:6px; font-family:Inter,sans-serif; font-size:0.75rem;
  box-shadow:0 2px 8px rgba(0,0,0,0.3); display:none;">
  <span id="contador-numero">0</span> <span style="font-size:0.65rem;">lecturas hoy</span>
</div>
<script>
(function(){
  const CONTADOR_URL = 'http://localhost:8099/contador';
  const elNum = document.getElementById('contador-numero');
  const elDiv = document.getElementById('contador-visitas');
  let mostrado = false;

  function mostrar(n) {
    if (!elNum || !elDiv) return;
    elNum.textContent = n;
    elDiv.style.display = 'block';
    mostrado = true;
  }

  /* Intenta obtener el conteo del servidor local */
  fetch(CONTADOR_URL, { mode: 'no-cache' })
    .then(r => r.json())
    .then(d => {
      if (d && d.visitas !== undefined) mostrar(d.visitas);
    })
    .catch(function () {
      /* Sin servidor local: usa localStorage (solo este navegador) */
      const clave = 'taberna_visitas_' + new Date().toISOString().slice(0, 10);
      let n = parseInt(localStorage.getItem(clave) || '0', 10);
      if (!n) {
        n = 1;
        localStorage.setItem(clave, n);
      } else {
        n++;
        localStorage.setItem(clave, n);
      }
      mostrar(n);
    });
})();
</script>
`;

/* 3. SEO BÁSICO - Meta tags y JSON-LD */
/* Asegurar que cada página tenga título, descripción y canonical */
function asegurarMeta(nombre, contenido) {
  if (!contenido) return;
  const re = new RegExp('<meta[^>]*name="' + nombre + '"[^>]*>');
  if (re.test(html)) {
    html = html.replace(re, '<meta name="' + nombre + '" content="' + escapar(contenido) + '">');
  } else {
    /* Insertar antes de </head> */
    html = html.replace('</head>', '<meta name="' + nombre + '" content="' + escapar(contenido) + '">\n</head>');
  }
}

function asegurarOG(nombre, contenido) {
  if (!contenido) return;
  const re = new RegExp('<meta[^>]*property="' + nombre + '"[^>]*>');
  if (re.test(html)) {
    html = html.replace(re, '<meta property="' + nombre + '" content="' + escapar(contenido) + '">');
  } else {
    html = html.replace('</head>', '<meta property="' + nombre + '" content="' + escapar(contenido) + '">\n</head>');
  }
}

function escapar(t) {
  return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Extraer título actual */
const mTitulo = html.match(/<title[^>]*>([^<]*)<\/title>/);
const tituloPagina = mTitulo ? mTitulo[1].trim() : 'La Taberna del Magallanes News';
asegurarMeta('description', 'La Taberna del Magallanes News · Gaceta Sabermétrica & LVBP · ' + tituloPagina);
asegurarOG('og:title', tituloPagina);
asegurarOG('og:description', 'La Taberna del Magallanes News · Gaceta Sabermétrica & LVBP');
asegurarOG('og:type', 'website');
asegurarOG('og:url', locationURL());

function locationURL() {
  /* La URL canónica puede estar ya en el HTML */
  const m = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/);
  return m ? m[1] : 'https://latabernadelmagallanesnews-jpg.github.io/taberna-magallanes-informa/';
}

/* Insertar todo antes de </head> */
html = html.replace('</head>', codigoGA + codigoContador + '</head>');

fs.writeFileSync(INDEX, html, 'utf8');
console.log('✓ Analítica, contador y SEO agregados al portal publicado');
