/* ============================================================================
  ANALÍTICA, CONTADOR Y SEO PARA EL PORTAL PUBLICADO
  ----------------------------------------------------------------------------
  Este script se ejecuta como parte de `npm run build` y agrega a las páginas
  públicas:

  1. Google Analytics 4 (si hay un ID real configurado)
  2. Contador global de lectores (Abacus, con respaldo del servidor local)
  3. Meta tags SEO básicas

  Es idempotente: antes de insertar, quita los bloques que ya estaban. Así
  el HTML no crece en cada compilación.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PUBLICAR = path.join(RAIZ, 'publicar');

/* -------------------------------------------------------------------------- */
/* CONFIGURACIÓN                                                              */
/* -------------------------------------------------------------------------- */
/* El ID de GA4 se puede poner de tres maneras (en este orden):
   1. Variable de entorno:  set GA4_ID=G-XXXXXXXXXX  (Windows)
   2. Archivo:              ga4-id.txt  en la raíz del proyecto
   3. La constante de abajo.
   Si no hay un ID real, no se inserta Google Analytics (mejor no romper la
   página con un ID de ejemplo). */
let GA4_ID = String(process.env.GA4_ID || '').trim();
if (!GA4_ID) {
  try { GA4_ID = fs.readFileSync(path.join(RAIZ, 'ga4-id.txt'), 'utf8').trim(); } catch (e) { }
}
if (!GA4_ID) GA4_ID = 'G-XXXXXXXXXX';
const GA4_CONFIGURADO = /^G-[A-Z0-9]{6,}$/i.test(GA4_ID) && GA4_ID !== 'G-XXXXXXXXXX';

/* Contador global: Abacus (gratuito, sin registro). */
const ABACUS = 'https://abacus.jasoncameron.dev';
const ESPACIO = 'latabernadelmagallanesnews-jpg.github.io';
const CLAVE_TOTAL = 'taberna-magallanes-informa-visitas';

/* -------------------------------------------------------------------------- */
/* BLOQUES                                                                    */
/* -------------------------------------------------------------------------- */
function codigoGA() {
  if (!GA4_CONFIGURADO) return '';
  return `<!-- TABERNA-GA-INICIO -->
<script>
(function () {
  /* La sala de redacción no se mide. */
  if (/\\/editor\\/|redaccion-cms/i.test(location.pathname)) return;
  var id = '${GA4_ID}';
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, {
    page_title: document.title,
    page_location: document.location.href
  });
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a || !a.href) return;
    if (a.href.indexOf('/notas/') !== -1 || a.href.indexOf('cronica.html') !== -1) {
      window.gtag('event', 'click_nota', {
        event_category: 'navegacion',
        event_label: a.getAttribute('href') || a.textContent
      });
    }
    if (a.href.indexOf('whatsapp') !== -1 || a.href.indexOf('wa.me') !== -1) {
      window.gtag('event', 'compartir_whatsapp', {
        event_category: 'compartir',
        event_label: document.title
      });
    }
  });
})();
</script>
<!-- TABERNA-GA-FIN -->`;
}

function codigoContador() {
  return `<!-- TABERNA-CONTADOR-INICIO -->
<div id="contador-visitas" role="status" aria-live="polite" title="Lectores del multimedio" style="
  position: fixed; bottom: 12px; right: 12px; z-index: 9998;
  background: #0b2240; color: #ffffff; padding: 7px 11px;
  border-radius: 999px; font-family: Inter, sans-serif; font-size: 0.72rem;
  line-height: 1.2; box-shadow: 0 3px 12px rgba(0,0,0,0.28);
  display: none; max-width: calc(100vw - 24px); white-space: nowrap;">
  <span aria-hidden="true">👥</span>
  <b id="contador-numero">0</b>
  <span style="font-size: 0.66rem; opacity: 0.85;">lectores hoy</span>
  <span id="contador-total" style="font-size: 0.66rem; opacity: 0.65;"></span>
</div>
<script>
(function () {
  /* La sala de redacción no se mide. */
  if (/\\/editor\\/|redaccion-cms/i.test(location.pathname)) return;
  var elDiv = document.getElementById('contador-visitas');
  var elNum = document.getElementById('contador-numero');
  var elTot = document.getElementById('contador-total');
  if (!elDiv || !elNum) return;

  /* La fecha se calcula al abrir la página, no al compilar: así el contador
     diario cambia solo aunque el diario pase días sin publicar. */
  var HOY = new Date().toISOString().slice(0, 10);
  var CLAVE_TOTAL = '${CLAVE_TOTAL}';
  var CLAVE_DIA = CLAVE_TOTAL + '-' + HOY;
  var CLAVE_CACHE = 'taberna_contador_cache_v1';
  var CLAVE_CONTADO = 'taberna_contador_contado';
  var NS = '${ESPACIO}';

  function mostrar(dia, total) {
    if (typeof dia === 'number') elNum.textContent = dia.toLocaleString('es-VE');
    if (elTot && typeof total === 'number') elTot.textContent = '· ' + total.toLocaleString('es-VE') + ' en total';
    elDiv.style.display = 'block';
  }

  /* Cache corta: al pasar de una página a otra no se vuelve a pedir. */
  try {
    var cache = JSON.parse(localStorage.getItem(CLAVE_CACHE) || 'null');
    if (cache && cache.fecha === HOY && (Date.now() - cache.ts) < 5 * 60 * 1000) {
      mostrar(cache.dia, cache.total);
      return;
    }
  } catch (e) { }

  var yaContado = false;
  try { yaContado = localStorage.getItem(CLAVE_CONTADO) === HOY; } catch (e) { }
  var accion = yaContado ? 'get' : 'hit';

  function pedir(clave) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var reloj = ctrl ? setTimeout(function () { ctrl.abort(); }, 4500) : null;
    var opciones = { cache: 'no-store' };
    if (ctrl) opciones.signal = ctrl.signal;
    return fetch('${ABACUS}/' + accion + '/' + NS + '/' + encodeURIComponent(clave), opciones)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { return d && typeof d.value === 'number' ? d.value : null; })
      .catch(function () { return null; })
      .then(function (v) { if (reloj) clearTimeout(reloj); return v; });
  }

  Promise.all([pedir(CLAVE_DIA), pedir(CLAVE_TOTAL)]).then(function (v) {
    var dia = v[0], total = v[1];
    if (dia === null && total === null) {
      /* Sin contador global: se intenta el servidor local de la redacción. */
      return fetch('http://localhost:8099/contador', { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && typeof d.visitas === 'number') mostrar(d.visitas, null); })
        .catch(function () { });
    }
    if (!yaContado) {
      try { localStorage.setItem(CLAVE_CONTADO, HOY); } catch (e) { }
    }
    try {
      localStorage.setItem(CLAVE_CACHE, JSON.stringify({
        fecha: HOY, dia: dia, total: total, ts: Date.now()
      }));
    } catch (e) { }
    mostrar(dia, total);
  });
})();
</script>
<!-- TABERNA-CONTADOR-FIN -->`;
}

/* -------------------------------------------------------------------------- */
/* LIMPIEZA E INYECCIÓN                                                       */
/* -------------------------------------------------------------------------- */
function limpiar(html) {
  /* Bloques nuevos, con marcadores. */
  html = html.replace(/<!-- TABERNA-GA-INICIO -->[\s\S]*?<!-- TABERNA-GA-FIN -->\s*/g, '');
  html = html.replace(/<!-- TABERNA-CONTADOR-INICIO -->[\s\S]*?<!-- TABERNA-CONTADOR-FIN -->\s*/g, '');

  /* Bloques viejos, sin marcadores (los que dejó la versión anterior). */
  html = html.replace(/<!-- Google Analytics 4 - La Taberna del Magallanes News -->[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>\s*/g, '');
  html = html.replace(/<!-- Contador de visitantes - La Taberna del Magallanes News -->[\s\S]*?<\/script>\s*/g, '');
  return html;
}

function archivosPublicos() {
  const lista = ['index.html', 'cronica.html', 'roster.html', 'buscador.html', 'vip.html', '404.html']
    .map(function (n) { return path.join(PUBLICAR, n); })
    .filter(function (f) { return fs.existsSync(f); });

  const notas = path.join(PUBLICAR, 'notas');
  if (fs.existsSync(notas)) {
    fs.readdirSync(notas).forEach(function (n) {
      if (/\.html$/i.test(n)) lista.push(path.join(notas, n));
    });
  }
  return lista;
}

function inyectar(archivo) {
  let html = fs.readFileSync(archivo, 'utf8');
  if (html.indexOf('</head>') === -1) {
    console.warn('  ⚠ sin </head>: ' + path.relative(RAIZ, archivo));
    return false;
  }
  const original = html;
  html = limpiar(html);
  html = html.replace('</head>', codigoGA() + '\n</head>');
  /* El contador es un elemento visible: va en el cuerpo, no en <head>. */
  if (html.indexOf('</body>') !== -1) {
    html = html.replace('</body>', codigoContador() + '\n</body>');
  } else {
    html += '\n' + codigoContador();
  }
  if (html === original) return false;
  fs.writeFileSync(archivo, html, 'utf8');
  return true;
}

let tocados = 0;
archivosPublicos().forEach(function (archivo) {
  if (inyectar(archivo)) {
    tocados++;
    console.log('  ✓ ' + path.relative(RAIZ, archivo));
  }
});

if (!GA4_CONFIGURADO) {
  console.warn('  ⚠ Google Analytics sin ID real. Crea ga4-id.txt con tu ID G-… o define GA4_ID.');
}
console.log('✓ Analítica y contador en ' + tocados + ' página(s) pública(s).');
