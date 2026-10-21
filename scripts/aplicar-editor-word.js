/* ============================================================================
  APLICA EL EDITOR DE TEXTO ENRIQUECIDO (ESTILO WORD) AL PORTAL
   ----------------------------------------------------------------------------
   El portal es un HTML único y autocontenido. Este script le añade el motor de
   texto enriquecido (Word) sin tocar el resto del código:

     1. Motor: saneado de HTML, conversión HTML<->texto y valor "marcado".
     2. Editor Word en el CMS: barra de formato, atajos y vista previa.
     3. Render: esc(), setTxt(), setHtml() y textoAParrafos() entienden el
        contenido enriquecido sin cambiar una sola llamada del portal.

   Uso:  node scripts/aplicar-editor-word.js [archivo.html ...]
   Es idempotente: si el motor ya está instalado, no hace nada.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

/* -------------------------------------------------------------------------- */
/* Utilidades de parcheo                                                      */
/* -------------------------------------------------------------------------- */

/* Instala (o reemplaza) un bloque delimitado por marcas explícitas.
   - Si las marcas ya están: se sustituye el bloque por la versión nueva.
   - Si no: se inserta el bloque justo antes del ancla indicada.
   Nunca se toca nada fuera del bloque. */
function instalarBloque(texto, marcaInicio, marcaFin, contenido, ancla, etiqueta) {
  const i0 = texto.indexOf(marcaInicio);
  if (i0 !== -1) {
    const i1 = texto.indexOf(marcaFin, i0);
    if (i1 === -1) throw new Error('No se encontró «' + marcaFin + '» de «' + etiqueta + '»');
    const resto = texto.slice(i1 + marcaFin.length);
    return texto.slice(0, i0) + contenido + (resto.charAt(0) === '\n' ? resto : '\n' + resto);
  }
  const p = texto.indexOf(ancla);
  if (p === -1) throw new Error('No se encontró el ancla de «' + etiqueta + '»');
  return texto.slice(0, p) + contenido + '\n' + texto.slice(p);
}

function reemplazar(texto, viejo, nuevo, etiqueta, opciones) {
  const opc = opciones || {};
  /* Idempotencia: si el texto nuevo ya está, el parche ya se aplicó. */
  if (texto.indexOf(nuevo) !== -1) return texto;
  const veces = texto.split(viejo).length - 1;
  if (veces === 0) {
    throw new Error('No se encontró el fragmento «' + etiqueta + '»');
  }
  if (veces > 1 && !opc.todas) {
    throw new Error('El fragmento «' + etiqueta + '» aparece ' + veces + ' veces (se esperaba 1)');
  }
  return texto.split(viejo).join(nuevo);
}

/* El bloque de CSS del editor se reinstala COMPLETO: se quita cualquier copia
   que haya (marcada o de versiones anteriores) y deja exactamente una. Pero
   se CONSERVAN los demás bloques que se hayan insertado dentro (por ejemplo,
   el del diseño longform), para que el orden en que se ejecuten los parches
   no importe. */
function instalarCss(texto, css) {
  const ini = '/*__CSS_INICIO__*/';
  const fin = '/*__CSS_FIN__*/';
  const iniPropio = '/*__CSS_PROPIO_INICIO__*/';
  const finPropio = '/*__CSS_PROPIO_FIN__*/';

  let h = texto;

  /* 1 · Recoger lo que hay entre las marcas, separando nuestro CSS del resto
         (por ejemplo, el bloque del diseño longform). */
  let conservado = '';
  const i0 = h.indexOf(ini);
  if (i0 !== -1) {
    const j0 = h.indexOf(fin, i0);
    if (j0 !== -1) {
      let region = h.slice(i0 + ini.length, j0);
      const p0 = region.indexOf(iniPropio);
      if (p0 !== -1) {
        const q0 = region.indexOf(finPropio, p0);
        if (q0 !== -1) region = region.slice(0, p0) + region.slice(q0 + finPropio.length);
      }
      conservado = region.replace(/^\s+/, '').replace(/\s+$/, '');
    }
  }

  /* 2 · Quitar cualquier bloque marcado (el nuestro y los de los demás). */
  let i = h.indexOf(ini);
  while (i !== -1) {
    const j = h.indexOf(fin, i);
    if (j === -1) break;
    /* Se come también el salto de línea que sigue a la marca, para que el
       resultado sea idéntico al original y no se acumulen líneas en blanco. */
    h = h.slice(0, i) + h.slice(j + fin.length).replace(/^\n/, '');
    i = h.indexOf(ini);
  }

  /* 3 · Reinsertar: nuestro CSS y lo que se conserva. */
  const p = h.indexOf('</style>');
  if (p === -1) throw new Error('No se encontró </style>');
  const bloque = ini + css + (conservado ? conservado + '\n' : '') + fin;
  return h.slice(0, p) + bloque + '\n' + h.slice(p);
}

/* -------------------------------------------------------------------------- */
/* Marcas de los bloques inyectados                                           */
/* -------------------------------------------------------------------------- */

const MARCA_MOTOR = '/*__MOTOR_INICIO__*/';
const MARCA_MOTOR_FIN = '/*__MOTOR_FIN__*/';
const MARCA_EDITOR = '/*__EDITOR_INICIO__*/';
const MARCA_EDITOR_FIN = '/*__EDITOR_FIN__*/';

/* -------------------------------------------------------------------------- */
/* 1 · CSS del editor estilo Word                                             */
/* -------------------------------------------------------------------------- */

const CSS_WORD = `/*__CSS_PROPIO_INICIO__*/
    /* ===== EDITOR DE TEXTO ENRIQUECIDO · ESTILO WORD ===== */
    .cms-rico { border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; box-shadow: 0 1px 3px rgba(15,23,42,0.05); }
    .cms-rico-toolbar { display: flex; flex-wrap: wrap; gap: 2px; align-items: center; padding: 6px; background: linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%); border-bottom: 1px solid #cbd5e1; }
    .cms-rico-grupo { display: flex; gap: 2px; align-items: center; padding: 0 6px; border-right: 1px solid #d7dee8; }
    .cms-rico-grupo:last-child { border-right: none; }
    .cms-rico-btn { min-width: 29px; height: 29px; padding: 0 6px; border: 1px solid transparent; background: transparent; border-radius: 5px; cursor: pointer; font-size: 0.8rem; font-family: 'Inter', sans-serif; color: #334155; display: inline-flex; align-items: center; justify-content: center; gap: 3px; }
    .cms-rico-btn:hover { background: #ffffff; border-color: #cbd5e1; color: #0b2240; }
    .cms-rico-btn:active { background: #e2e8f0; }
    .cms-rico-btn:focus-visible { outline: 2px solid #c59b27; outline-offset: 1px; }
    .cms-rico-sel { border: 1px solid #cbd5e1; border-radius: 5px; height: 29px; font-size: 0.72rem; font-family: 'Inter', sans-serif; color: #0b2240; background: #ffffff; padding: 0 4px; }
    .cms-rico-color { width: 27px; height: 27px; padding: 0; border: 1px solid #cbd5e1; border-radius: 5px; background: #fff; cursor: pointer; }
    .cms-rico-editor { min-height: 168px; max-height: 520px; overflow-y: auto; padding: 0.95rem 1.1rem; outline: none; background: #ffffff; color: #1f2937; font-family: 'EB Garamond', Georgia, serif; font-size: 1.02rem; line-height: 1.72; }
    .cms-rico-editor:focus { background: #fffdf7; box-shadow: inset 0 0 0 2px rgba(197,155,39,0.35); }
    .cms-rico-editor:empty::before { content: attr(data-marcador); color: #94a3b8; font-style: italic; }
    .cms-rico-editor h1, .cms-rico-editor h2, .cms-rico-editor h3, .cms-rico-editor h4, .cms-rico-editor h5, .cms-rico-editor h6 { font-family: 'Playfair Display', Georgia, serif; color: #0b2240; line-height: 1.25; margin: 0.7em 0 0.35em; font-weight: 800; }
    .cms-rico-editor h2 { font-size: 1.35rem; } .cms-rico-editor h3 { font-size: 1.15rem; } .cms-rico-editor h4 { font-size: 1.02rem; }
    .cms-rico-editor p { margin: 0 0 0.7em; }
    .cms-rico-editor ul, .cms-rico-editor ol { margin: 0.4em 0 0.7em; padding-left: 1.5rem; }
    .cms-rico-editor li { margin-bottom: 0.25em; }
    .cms-rico-editor blockquote { border-left: 4px solid #c59b27; background: #fffdf5; margin: 0.7em 0; padding: 0.5em 0.9em; font-style: italic; color: #4a3f1c; border-radius: 0 8px 8px 0; }
    .cms-rico-editor a { color: #0b2240; text-decoration: underline; }
    .cms-rico-editor img { max-width: 100%; height: auto; border-radius: 8px; margin: 0.4em 0; }
    .cms-rico-editor hr { border: 0; border-top: 1px solid #dcd9d9; margin: 0.9em 0; }
    .cms-rico-editor table { border-collapse: collapse; width: 100%; margin: 0.6em 0; font-size: 0.9em; }
    .cms-rico-editor td, .cms-rico-editor th { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; }
    .cms-rico-editor mark { background: #ffe9a8; padding: 1px 2px; border-radius: 3px; }
    .cms-rico-pie { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 6px 8px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 0.66rem; color: #64748b; flex-wrap: wrap; }
    .cms-rico-accion { font-family: 'Inter', sans-serif; font-size: 0.66rem; font-weight: 700; border: 1px solid #cbd5e1; background: #ffffff; color: #0b2240; border-radius: 5px; padding: 4px 9px; cursor: pointer; }
    .cms-rico-accion:hover { background: #0b2240; color: #ffcc00; border-color: #0b2240; }
    .cms-rico-accion.activo { background: #0b2240; color: #ffcc00; border-color: #0b2240; }
    .cms-rico-contador { font-family: 'JetBrains Mono', monospace; font-size: 0.64rem; color: #64748b; }
    .cms-rico-plano { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 11px; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; line-height: 1.55; resize: vertical; }
    .cms-rico-nota { font-size: 0.66rem; color: #64748b; margin-top: 4px; display: block; line-height: 1.5; }
    /* Enlace que se va a compartir: visible y copiable */
    .compartir-enlace { display: flex; gap: 8px; align-items: center; justify-content: space-between; background: #f6f3f3; border: 1px solid #e5e5e5; border-radius: 9px; padding: 8px 10px; margin: 0 0 10px; font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: #0b2240; }
    .compartir-enlace-txt { min-width: 0; word-break: break-all; line-height: 1.5; text-decoration: none; color: #0b2240; }
    .compartir-enlace-txt:hover { text-decoration: underline; }
    .compartir-enlace-url { user-select: all; -webkit-user-select: all; }
    .compartir-enlace .red-btn { flex: 0 0 auto; padding: 5px 10px; font-size: 0.68rem; }
    .cms-rico-marcador { display: inline-block; font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #b45309; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 2px 8px; margin-bottom: 6px; }
    /* Entrada discreta a la sala de redacción, en el pie del diario */
    footer a[href="redaccion-cms.html"] { opacity: 0.55; transition: opacity .15s ease; }
    footer a[href="redaccion-cms.html"]:hover { opacity: 1; color: #0b2240 !important; text-decoration: underline !important; }
    /* Columna derecha del muro de crónicas: la nota de la redacción */
    .cronicas-cabecera { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 34%); gap: 1.6rem; align-items: start; border-bottom: 2px solid #0b2240; padding-bottom: 1.1rem; margin-bottom: 1.4rem; }
    .cronicas-cabecera-izq { min-width: 0; }
    .cronicas-nota { background: #fffdf5; border: 1px solid #e8e0cc; border-left: 4px solid #c59b27; border-radius: 0 10px 10px 0; padding: 1rem 1.15rem; box-shadow: 0 2px 10px rgba(0,0,0,.05); }
    .cronicas-nota-tit { display: block; font-family: 'Inter', sans-serif; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #b45309; margin-bottom: 0.55rem; }
    .cronicas-nota-cuerpo { font-family: 'EB Garamond', Georgia, serif; font-size: 1.02rem; line-height: 1.72; color: #3f3f46; }
    .cronicas-nota-cuerpo p { margin: 0 0 0.75em; }
    .cronicas-nota-cuerpo p:last-child { margin-bottom: 0; }
    .cronicas-nota-cuerpo h2, .cronicas-nota-cuerpo h3, .cronicas-nota-cuerpo h4 { font-family: 'Playfair Display', Georgia, serif; color: #0b2240; font-weight: 800; margin: 0.9em 0 0.35em; line-height: 1.3; }
    .cronicas-nota-cuerpo h3 { font-size: 1.12rem; } .cronicas-nota-cuerpo h4 { font-size: 1rem; }
    .cronicas-nota-cuerpo ul, .cronicas-nota-cuerpo ol { margin: 0.45em 0 0.75em; padding-left: 1.25rem; }
    .cronicas-nota-cuerpo li { margin-bottom: 0.3em; }
    .cronicas-nota-cuerpo a { color: #0b2240; text-decoration: underline; }
    .cronicas-nota-cuerpo strong, .cronicas-nota-cuerpo b { color: #0b2240; }
    .cronicas-nota-cuerpo mark { background: #ffe9a8; padding: 1px 3px; border-radius: 3px; }
    .cronicas-nota-cuerpo blockquote { border-left: 3px solid #c59b27; margin: 0.7em 0; padding: 0.4em 0.9em; font-style: italic; color: #4a3f1c; }
    @media (max-width: 860px) { .cronicas-cabecera { grid-template-columns: 1fr; } }
/*__CSS_PROPIO_FIN__*/
`;

/* -------------------------------------------------------------------------- */
/* 2 · Motor de texto enriquecido                                             */
/* -------------------------------------------------------------------------- */

const MOTOR_JS = MARCA_MOTOR + `  /* =====================================================================
     MOTOR DE TEXTO ENRIQUECIDO · EDITOR ESTILO WORD
     ---------------------------------------------------------------------
     Un campo de texto puede guardarse de dos formas:
       · texto plano  -> "Texto normal"
       · texto rico   -> MARCA_RICO + "<p>La <b>Taberna</b></p>"

     El motor es transparente para el resto del portal: esc(), setTxt(),
     setHtml() y textoAParrafos() entienden las dos formas solas.
     ===================================================================== */
  const MARCA_RICO = '\\u241F';

  function esValorRico(v) {
    return typeof v === 'string' && v.charAt(0) === MARCA_RICO;
  }

  /* Convierte HTML enriquecido en texto plano (para compartir, buscar, etc.). */
  function textoDeRico(html) {
    const s = String(html === undefined || html === null ? '' : html);
    if (!s) return '';
    if (!/<[a-zA-Z]/.test(s)) return s.replace(/<[^>]*>/g, '');
    let tmp = null;
    try {
      tmp = document.createElement('div');
      tmp.innerHTML = s;
      Array.prototype.slice.call(tmp.querySelectorAll('br')).forEach(function (br) {
        if (br.parentNode) br.parentNode.replaceChild(document.createTextNode('\\n'), br);
      });
      Array.prototype.slice.call(tmp.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,blockquote,pre,tr,td,th')).forEach(function (b) {
        b.appendChild(document.createTextNode('\\n\\n'));
      });
    } catch (e) { return s.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim(); }
    let txt = (tmp.textContent || '');
    txt = txt.replace(/\\u00a0/g, ' ');
    txt = txt.replace(/[ \\t]+\\n/g, '\\n').replace(/\\n{3,}/g, '\\n\\n');
    return txt.trim();
  }

  /* Texto plano de cualquier valor (rico o no), sin escapar. */
  function aTextoPlano(v) {
    if (v === undefined || v === null) return '';
    const s = String(v);
    return esValorRico(s) ? textoDeRico(s.slice(1)) : s;
  }

  /* Etiquetas y atributos permitidos en el contenido enriquecido. */
  const RICO_TAGS = ['P','BR','DIV','SPAN','STRONG','B','EM','I','U','S','STRIKE','H1','H2','H3','H4','H5','H6','UL','OL','LI','BLOCKQUOTE','A','IMG','MARK','SUB','SUP','HR','FONT','TABLE','THEAD','TBODY','TR','TD','TH','PRE','CODE','SMALL'];
  const RICO_ATTRS = {
    A: ['href','title','target','rel'],
    IMG: ['src','alt','title','width','height'],
    FONT: ['color','size'],
    TD: ['colspan','rowspan'],
    TH: ['colspan','rowspan']
  };
  const RICO_ATTRS_COMUN = ['style', 'class'];

  /* Únicas clases admitidas en el contenido: las de la galería de
     titulares. Cualquier otra se quita al publicar. */
  const RICO_CLASES = ['tit-clasico', 'tit-versalitas', 'tit-caja-alta', 'tit-centrado', 'tit-reglas',
    'tit-sans', 'tit-condensado', 'tit-italica', 'tit-antetitulo', 'tit-bajada', 'tit-subrayado', 'tit-rojo'];
  const RICO_PROPIEDADES = ['color','background-color','font-weight','font-style','font-size','font-family','text-align','text-decoration','text-transform','line-height','letter-spacing','margin','margin-top','margin-bottom','margin-left','margin-right','padding','padding-top','padding-bottom','padding-left','padding-right','width','max-width','height','max-height','border','border-top','border-bottom','border-left','border-right','border-color','border-width','border-style','border-radius','vertical-align','list-style-type'];

  function limpiarEstiloRico(valor) {
    const partes = String(valor || '').split(';');
    const salida = [];
    partes.forEach(function (p) {
      const i = p.indexOf(':');
      if (i < 0) return;
      const prop = p.slice(0, i).trim().toLowerCase();
      const val = p.slice(i + 1).trim();
      if (!val) return;
      if (RICO_PROPIEDADES.indexOf(prop) === -1) return;
      if (/expression|behaviou?r:|url\\s*\\(|javascript:|@import/i.test(val)) return;
      salida.push(prop + ': ' + val);
    });
    return salida.join('; ');
  }

  /* Sanea el HTML del editor: quita scripts, manejadores y URLs peligrosas. */
  function santizarRico(html) {
    const bruto = String(html === undefined || html === null ? '' : html);
    if (!bruto) return '';
    if (!/<[a-zA-Z]/.test(bruto)) return escTexto(bruto);
    let doc = null;
    try {
      doc = new DOMParser().parseFromString('<div id="__rico_tmp__">' + bruto + '</div>', 'text/html');
    } catch (e) { return escTexto(bruto.replace(/<[^>]*>/g, '')); }
    const raiz = doc.getElementById('__rico_tmp__');
    if (!raiz) return escTexto(bruto.replace(/<[^>]*>/g, ''));
    const limpiar = function (nodo) {
      const hijos = Array.prototype.slice.call(nodo.childNodes || []);
      hijos.forEach(function (hijo) {
        if (!hijo) return;
        if (hijo.nodeType === 3) return;
        if (hijo.nodeType !== 1) { if (hijo.parentNode) nodo.removeChild(hijo); return; }
        const tag = String(hijo.tagName || '').toUpperCase();
        if (RICO_TAGS.indexOf(tag) === -1) {
          while (hijo.firstChild) nodo.insertBefore(hijo.firstChild, hijo);
          if (hijo.parentNode) nodo.removeChild(hijo);
          return;
        }
        const permitidos = (RICO_ATTRS[tag] || []).concat(RICO_ATTRS_COMUN);
        Array.prototype.slice.call(hijo.attributes || []).forEach(function (a) {
          const nombre = String(a.name || '').toLowerCase();
          const valor = String(a.value || '');
          if (permitidos.indexOf(nombre) === -1) { hijo.removeAttribute(a.name); return; }
          if (nombre === 'href' || nombre === 'src') {
            if (/^\\s*(javascript|vbscript|data:text\\/html)/i.test(valor)) hijo.removeAttribute(a.name);
            return;
          }
          if (nombre === 'style') { hijo.setAttribute('style', limpiarEstiloRico(valor)); return; }
          if (nombre === 'class') {
            /* Solo pasan las clases de la galería de titulares. */
            const buenas = valor.split(/\\s+/).filter(function (c) { return c && RICO_CLASES.indexOf(c) !== -1; });
            if (buenas.length) hijo.setAttribute('class', buenas.join(' '));
            else hijo.removeAttribute('class');
            return;
          }
        });
        limpiar(hijo);
      });
    };
    limpiar(raiz);
    return raiz.innerHTML;
  }
` + MARCA_MOTOR_FIN;

/* -------------------------------------------------------------------------- */
/* 3 · Editor estilo Word (interfaz del CMS)                                  */
/* -------------------------------------------------------------------------- */

let EDITOR_JS = MARCA_EDITOR + `  /* ---------------------------------------------------------------------
     EDITOR ESTILO WORD · barra de formato del CMS
     --------------------------------------------------------------------- */
  /* ¿El campo es una bajada (subtítulo, entradilla)? Entonces la galería
     es la de bajada y no la de titular. */
  function esCampoDeBajada(ruta) {
    return /subtitulo|bajada|entradilla|lead|resumen|deck/i.test(String(ruta || ''));
  }

  function htmlBarraRico(ruta) {
    const esBajada = esCampoDeBajada(ruta);
    const estilos = esBajada ? RICO_ESTILOS_BAJADA : RICO_ESTILOS_TITULAR;
    return '<div class="cms-rico-toolbar">' +
      '<div class="cms-rico-grupo">' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="bold" title="Negrita (Ctrl+B)"><b>N</b></button>' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="italic" title="Cursiva (Ctrl+I)"><i>C</i></button>' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="underline" title="Subrayado (Ctrl+U)"><u>S</u></button>' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="strikeThrough" title="Tachado"><s>T</s></button>' +
      '</div>' +
      '<div class="cms-rico-grupo">' +
        '<select class="cms-rico-sel" data-rico-bloque title="Estilo del párrafo">' +
          '<option value="p">Párrafo</option>' +
          '<option value="h2">Título 2</option>' +
          '<option value="h3">Título 3</option>' +
          '<option value="h4">Título 4</option>' +
          '<option value="blockquote">Cita</option>' +
        '</select>' +
        '<select class="cms-rico-sel" data-rico-tam title="Tamaño de letra">' +
          '<option value="">Tamaño</option>' +
          '<option value="1">Pequeño</option>' +
          '<option value="2">Mediano</option>' +
          '<option value="3">Normal</option>' +
          '<option value="4">Grande</option>' +
          '<option value="5">Muy grande</option>' +
          '<option value="6">Titular</option>' +
        '</select>' +
      '</div>' +
      '<div class="cms-rico-grupo">' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="justifyLeft" title="Alinear a la izquierda">&#8676;</button>' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="justifyCenter" title="Centrar">&#8801;</button>' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="justifyRight" title="Alinear a la derecha">&#8677;</button>' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="justifyFull" title="Justificar">&#9776;</button>' +
      '</div>' +
      '<div class="cms-rico-grupo">' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="insertUnorderedList" title="Lista con viñetas">&#8226;&#8801;</button>' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="insertOrderedList" title="Lista numerada">1&#8801;</button>' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="removeFormat" title="Quitar todo el formato">&#9003;</button>' +
      '</div>' +
      '<div class="cms-rico-grupo">' +
        '<input type="color" class="cms-rico-color" data-rico-color value="#0b2240" title="Color del texto">' +
        '<button type="button" class="cms-rico-btn" data-rico-accion="enlace" title="Insertar enlace">&#128279;</button>' +
        '<button type="button" class="cms-rico-btn" data-rico-accion="imagen" title="Insertar imagen">&#128444;</button>' +
        '<button type="button" class="cms-rico-btn" data-rico-accion="limpiar" title="Borrar todo el texto">&#128465;</button>' +
      '</div>' +
      '<div class="cms-rico-grupo">' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="undo" title="Deshacer (Ctrl+Z)">&#8630;</button>' +
        '<button type="button" class="cms-rico-btn" data-rico-cmd="redo" title="Rehacer (Ctrl+Y)">&#8631;</button>' +
      '</div>' +
      '<div class="cms-rico-grupo cms-rico-grupo-estilos">' +
        '<span class="cms-rico-etiqueta">' + (esBajada ? 'Estilos de bajada' : 'Estilos de titular') + '</span>' +
        estilos.map(function (e) {
          return '<button type="button" class="cms-rico-btn cms-rico-estilo" data-rico-accion="estilo" data-rico-estilo="' + e.clave + '" title="' + esc(e.nombre) + '"><span class="' + e.clave + '">Aa</span></button>';
        }).join('') +
        '<button type="button" class="cms-rico-btn cms-rico-estilo" data-rico-accion="estilo" data-rico-estilo="" title="Quitar el estilo de titular"><span>&#10005;</span></button>' +
      '</div>' +
    '</div>';
  }

  /* Convierte texto plano en párrafos para mostrarlo dentro del editor. */
  function htmlEditorDesdeTexto(texto) {
    const s = String(texto === undefined || texto === null ? '' : texto);
    if (!s.trim()) return '';
    return s.split(/\\n{2,}/).map(function (p) {
      return '<p>' + esc(p).replace(/\\n/g, '<br>') + '</p>';
    }).join('');
  }

  function construirEditorRico(def, ruta, valor) {
    const ayuda = def.ayuda ? '<span class="cms-ayuda">' + esc(def.ayuda) + '</span>' : '';
    const etiqueta = '<label>' + esc(def.label) + '</label>';
    const textoPlano = aTextoPlano(valor || '');
    const html = esValorRico(valor) ? valor.slice(1) : htmlEditorDesdeTexto(textoPlano);
    return '<div class="cms-campo">' + etiqueta +
      '<span class="cms-rico-marcador">✍️ Editor de texto (estilo Word)</span>' +
      '<div class="cms-rico" data-rico-campo="' + esc(ruta) + '">' +
        htmlBarraRico(ruta) +
        '<div class="cms-rico-editor" contenteditable="true" spellcheck="true" data-path="' + esc(ruta) + '" data-tipo="rico" data-marcador="Escriba o pegue aquí el texto…">' + html + '</div>' +
        '<div class="cms-rico-pie">' +
          '<button type="button" class="cms-rico-accion" data-rico-accion="alternar">✏️ Editar como texto simple</button>' +
          '<button type="button" class="cms-rico-accion" data-rico-accion="vista">👁 Ver como se publicará</button>' +
          '<span class="cms-rico-contador" data-rico-contador="' + esc(ruta) + '">0 palabras · 0 caracteres</span>' +
        '</div>' +
        '<textarea class="cms-rico-plano" data-path="' + esc(ruta) + '" data-tipo="texto" rows="6" style="display:none">' + escTexto(textoPlano) + '</textarea>' +
        '<span class="cms-rico-nota">Puede escribir con formato (negrita, títulos, listas, enlaces, colores). Lo que escriba aquí se publica con ese formato. Con «Editar como texto simple» vuelve a texto plano.</span>' +
      '</div>' + ayuda + '</div>';
  }

  function editorRicoDe(ruta) {
    try { return document.querySelector('[data-rico-campo="' + ruta.replace(/"/g, '\\\\"') + '"]'); }
    catch (e) { return null; }
  }

  function contadorDeRico(editor) {
    const txt = editor ? textoDeRico(editor.innerHTML) : '';
    const palabras = txt.trim() ? txt.trim().split(/\\s+/).length : 0;
    const el = editor ? editor.closest('.cms-rico') : null;
    const salida = el ? el.querySelector('[data-rico-contador]') : null;
    if (salida) salida.textContent = palabras + ' palabras · ' + txt.length + ' caracteres';
  }

  /* El navegador deja <p> envolviendo las listas y <p> vacíos al aplicar
     estilos de bloque: se normalizan para que el HTML publicado sea válido. */
  function normalizarBloquesRico(editor) {
    if (!editor || !editor.querySelectorAll) return;
    Array.prototype.slice.call(editor.querySelectorAll('p > ul, p > ol')).forEach(function (lista) {
      var p = lista.parentNode;
      if (!p || p.tagName !== 'P' || !p.parentNode) return;
      while (lista.nextSibling) p.parentNode.insertBefore(lista.nextSibling, p);
      p.parentNode.insertBefore(lista, p);
      p.parentNode.removeChild(p);
    });
    Array.prototype.slice.call(editor.querySelectorAll('p')).forEach(function (p) {
      if (p.textContent && p.textContent.trim()) return;
      if (p.querySelector('img,br,hr,ul,ol,table')) return;
      if (p.parentNode) p.parentNode.removeChild(p);
    });
  }

  function guardarEditorRico(editor) {
    if (!editor) return;
    const ruta = editor.getAttribute('data-path');
    if (!ruta) return;
    const html = santizarRico(editor.innerHTML);
    const visible = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!visible && !/<img/i.test(html)) {
      asignarRuta(portalState, ruta, '');
    } else {
      asignarRuta(portalState, ruta, MARCA_RICO + html);
    }
    contadorDeRico(editor);
    programarRender();
    persistirEstadoPortal();
    actualizarIndicadorEstado('Editando');
  }

  /* Estilos de titular preestablecidos: las formas de titular de los
     grandes diarios. Se aplican con un clic sobre el texto elegido; si
     no hay nada seleccionado, se aplican a todo el campo. */
  const RICO_ESTILOS_TITULAR = [
    { clave: 'tit-clasico', nombre: 'Titular clásico (serif del diario)' },
    { clave: 'tit-versalitas', nombre: 'Titular en versalitas' },
    { clave: 'tit-caja-alta', nombre: 'Titular en caja alta (mayúsculas)' },
    { clave: 'tit-centrado', nombre: 'Titular centrado' },
    { clave: 'tit-reglas', nombre: 'Titular con reglas arriba y abajo' },
    { clave: 'tit-sans', nombre: 'Titular sans (el de los titulares)' },
    { clave: 'tit-condensado', nombre: 'Titular condensado en mayúsculas' },
    { clave: 'tit-italica', nombre: 'Titular en itálica' },
    { clave: 'tit-antetitulo', nombre: 'Antetítulo (encabezado del titular)' },
    { clave: 'tit-subrayado', nombre: 'Titular con marcador' },
    { clave: 'tit-rojo', nombre: 'Titular en rojo de portada' }
  ];

  /* Los estilos de la bajada (el subtítulo que va debajo del titular).
     No están en la galería del titular: un titular nunca debe quedar
     con aspecto de subtítulo. */
  const RICO_ESTILOS_BAJADA = [
    { clave: 'tit-bajada', nombre: 'Bajada en cursiva (estilo diario)' },
    { clave: 'tit-versalitas', nombre: 'Bajada en versalitas' },
    { clave: 'tit-centrado', nombre: 'Bajada centrada' },
    { clave: 'tit-reglas', nombre: 'Bajada con reglas' },
    { clave: 'tit-sans', nombre: 'Bajada sin serifa' },
    { clave: 'tit-subrayado', nombre: 'Bajada con marcador' }
  ];

  /* Quita los estilos de la galería de un trozo de texto: al elegir otro
     estilo, este sustituye al anterior en vez de acumularse. */
  function desenvolverEstilosDeGaleria(nodo) {
    if (!nodo || !nodo.querySelectorAll) return;
    Array.prototype.slice.call(nodo.querySelectorAll('span[class]')).forEach(function (sp) {
      const esEstilo = String(sp.className || '').split(/\\s+/).some(function (c) {
        return RICO_ESTILOS_TITULAR.some(function (e) { return e.clave === c; }) ||
               RICO_ESTILOS_BAJADA.some(function (e) { return e.clave === c; });
      });
      if (!esEstilo) return;
      const padre = sp.parentNode;
      while (sp.firstChild) padre.insertBefore(sp.firstChild, sp);
      padre.removeChild(sp);
    });
  }

  function aplicarEstiloTitular(editor, clase) {
    if (!editor) return;
    const sel = window.getSelection ? window.getSelection() : null;
    const haySeleccion = !!(sel && sel.rangeCount > 0 && !sel.isCollapsed &&
      editor.contains(sel.anchorNode) && editor.contains(sel.focusNode));

    if (clase) {
      let puesto = false;
      if (haySeleccion) {
        try {
          const rango = sel.getRangeAt(0);
          const trozo = rango.extractContents();
          /* Si la selección no traía texto (el campo está tapado o el
             navegador no la reconoce), se aplica al texto entero. */
          if (trozo && String(trozo.textContent || '').trim()) {
            /* Primero se quita el estilo anterior (si lo había). */
            desenvolverEstilosDeGaleria(trozo);
            const span = document.createElement('span');
            span.className = clase;
            span.appendChild(trozo);
            rango.insertNode(span);
            puesto = true;
          }
        } catch (e) { }
      }
      if (!puesto) {
        /* Sin selección útil: se aplica al texto entero del campo. */
        desenvolverEstilosDeGaleria(editor);
        editor.innerHTML = '<span class="' + clase + '">' + editor.innerHTML + '</span>';
      }
    } else {
      /* Quitar el estilo: se desenvuelve el <span> que lo lleva. */
      Array.prototype.slice.call(editor.querySelectorAll('span[class]')).forEach(function (sp) {
        const esEstilo = String(sp.className || '').split(/\\s+/).some(function (c) {
          return RICO_ESTILOS_TITULAR.some(function (e) { return e.clave === c; });
        });
        if (!esEstilo) return;
        const padre = sp.parentNode;
        while (sp.firstChild) padre.insertBefore(sp.firstChild, sp);
        padre.removeChild(sp);
      });
    }
    guardarEditorRico(editor);
    contadorDeRico(editor);
  }

  function ejecutarComandoRico(editor, cmd, valor) {
    if (!editor) return;
    editor.focus();
    try { document.execCommand('styleWithCSS', false, true); } catch (e) { }
    try {
      if (cmd === 'formatBlock') {
        try { document.execCommand('formatBlock', false, '<' + (valor || 'p') + '>'); }
        catch (e2) { document.execCommand('formatBlock', false, valor || 'p'); }
      } else if (cmd === 'foreColor') {
        document.execCommand('foreColor', false, valor || '#000000');
      } else if (cmd === 'fontSize') {
        document.execCommand('fontSize', false, valor || '3');
      } else if (cmd === 'createLink') {
        document.execCommand('createLink', false, valor || '');
      } else if (cmd === 'insertHTML') {
        document.execCommand('insertHTML', false, valor || '');
      } else {
        document.execCommand(cmd, false, null);
      }
    } catch (e) { }
    if (cmd === 'formatBlock' || cmd === 'insertUnorderedList' || cmd === 'insertOrderedList') {
      normalizarBloquesRico(editor);
    }
    guardarEditorRico(editor);
  }

  function alternarModoSimple(editor) {
    if (!editor) return;
    const caja = editor.closest('.cms-rico');
    if (!caja) return;
    const plano = caja.querySelector('.cms-rico-plano');
    const boton = caja.querySelector('[data-rico-accion="alternar"]');
    if (!plano) return;
    const editorVisible = editor.style.display !== 'none';
    if (editorVisible) {
      plano.value = textoDeRico(editor.innerHTML);
      plano.style.display = 'block';
      editor.style.display = 'none';
      if (boton) boton.textContent = '🎨 Volver al editor con formato';
      if (boton) boton.classList.add('activo');
    } else {
      editor.innerHTML = htmlEditorDesdeTexto(String(plano.value || ''));
      plano.style.display = 'none';
      editor.style.display = 'block';
      if (boton) boton.textContent = '✏️ Editar como texto simple';
      if (boton) boton.classList.remove('activo');
      guardarEditorRico(editor);
    }
  }

  function vistaPreviaRico(editor) {
    if (!editor) return;
    const caja = editor.closest('.cms-rico');
    if (!caja) return;
    let vista = caja.querySelector('.cms-rico-vista');
    if (vista) { vista.remove(); return; }
    vista = document.createElement('div');
    vista.className = 'cms-rico-vista';
    vista.style.cssText = 'margin-top:8px;border:1px dashed #cbd5e1;border-radius:8px;background:#fffdf5;padding:10px 12px;font-family:\\'Inter\\',sans-serif;font-size:.78rem;color:#334155;';
    vista.innerHTML = '<b style="display:block;text-transform:uppercase;font-size:.6rem;letter-spacing:.06em;color:#b45309;margin-bottom:6px;">Así se publicará</b>' +
      (santizarRico(editor.innerHTML) || '<i style="color:#94a3b8;">(vacío)</i>');
    caja.appendChild(vista);
  }

  /* Un soloDelegado para todos los editores: los botones usan mousedown para
     que el navegador no pierda la selección del texto antes de aplicar el
     formato. */
  function activarEditoresRicos(contenedor) {
    if (!contenedor) return;

    /* Al abrir el panel se actualizan los contadores de palabras. */
    Array.prototype.slice.call(contenedor.querySelectorAll('.cms-rico-editor')).forEach(function (ed) {
      contadorDeRico(ed);
    });

    if (contenedor.getAttribute('data-rico-ligado') === '1') return;
    contenedor.setAttribute('data-rico-ligado', '1');

    contenedor.addEventListener('mousedown', function (e) {
      const btn = e.target && e.target.closest ? e.target.closest('[data-rico-cmd],[data-rico-accion]') : null;
      if (!btn) return;
      if (btn.hasAttribute('data-rico-cmd') || btn.getAttribute('data-rico-accion') !== 'alternar') e.preventDefault();
    }, true);

    contenedor.addEventListener('click', function (e) {
      const btn = e.target && e.target.closest ? e.target.closest('[data-rico-cmd],[data-rico-accion]') : null;
      if (!btn) return;
      const caja = btn.closest('.cms-rico');
      if (!caja) return;
      const editor = caja.querySelector('.cms-rico-editor');
      if (!editor) return;
      const cmd = btn.getAttribute('data-rico-cmd');
      const accion = btn.getAttribute('data-rico-accion');

      if (cmd) {
        if (cmd === 'formatBlock') return;
        ejecutarComandoRico(editor, cmd, null);
        return;
      }
      if (accion === 'estilo') return aplicarEstiloTitular(editor, btn.getAttribute('data-rico-estilo') || '');
      if (accion === 'alternar') return alternarModoSimple(editor);
      if (accion === 'vista') return vistaPreviaRico(editor);
      if (accion === 'limpiar') {
        editor.innerHTML = '';
        guardarEditorRico(editor);
        return;
      }
      if (accion === 'enlace') {
        const url = window.prompt('Escriba la dirección del enlace:', 'https://');
        if (!url) return;
        ejecutarComandoRico(editor, 'createLink', url);
        return;
      }
      if (accion === 'imagen') {
        const url = window.prompt('Escriba la dirección de la imagen (https://…):', '');
        if (!url) return;
        ejecutarComandoRico(editor, 'insertHTML', '<img src="' + esc(url) + '" alt="">');
        return;
      }
    });

    contenedor.addEventListener('change', function (e) {
      const sel = e.target;
      if (!sel || !sel.getAttribute) return;
      const caja = sel.closest ? sel.closest('.cms-rico') : null;
      if (!caja) return;
      const editor = caja.querySelector('.cms-rico-editor');
      if (!editor) return;
      if (sel.hasAttribute('data-rico-bloque')) {
        ejecutarComandoRico(editor, 'formatBlock', sel.value || 'p');
        return;
      }
      if (sel.hasAttribute('data-rico-tam')) {
        if (!sel.value) return;
        editor.focus();
        try { document.execCommand('styleWithCSS', false, true); } catch (e) { }
        try { document.execCommand('fontSize', false, sel.value); } catch (e2) { }
        guardarEditorRico(editor);
        return;
      }
      if (sel.hasAttribute('data-rico-color')) {
        ejecutarComandoRico(editor, 'foreColor', sel.value);
        return;
      }
    });
  }
` + MARCA_EDITOR_FIN;

/* --- parches que van DENTRO del bloque del editor --------------------- */
/* Ojo: si se aplican sobre el HTML, el bloque del editor se reinstala
   después (instalarBloque) y los borra. Por eso se parchea la fuente. */
EDITOR_JS = reemplazar(
  EDITOR_JS,
  `  function activarEditoresRicos(contenedor) {`,
  `  /* Al pegar desde Word o desde el explorador de archivos, las imagenes
     llegan como file:///C:/... y SOLO existen en esa computadora: no se
     pueden publicar. Se quitan y se avisa de que hay que subirlas. */
  function limpiarPegado(contenedor) {
    var imagenes = contenedor.querySelectorAll('img[src^="file:"], img[src^="blob:"], img[data-src^="file:"]');
    if (!imagenes.length) return;
    Array.prototype.slice.call(imagenes).forEach(function (im) {
      if (im.parentNode) im.parentNode.removeChild(im);
    });
    toast('⚠️ Se quitaron ' + imagenes.length + ' imagen(es) locales del portapapeles. Para que se publiquen, súbalas con el botón de multimedia del módulo.', 7000);
  }

  function activarEditoresRicos(contenedor) {`,
  'limpieza al pegar'
);

EDITOR_JS = reemplazar(
  EDITOR_JS,
  `'<span class="cms-rico-nota">Puede escribir con formato (negrita, títulos, listas, enlaces, colores). Lo que escriba aquí se publica con ese formato. Con «Editar como texto simple» vuelve a texto plano.</span>'`,
  `'<span class="cms-rico-nota">Puede escribir con formato (negrita, títulos, listas, enlaces, colores). Lo que escriba aquí se publica con ese formato. Con «Editar como texto simple» vuelve a texto plano. En la barra, «Estilos de titular» aplica al texto elegido el estilo que usted elija (si no ha marcado nada, al campo entero): son formas de titular grande, nunca de subtítulo. En el campo del subtítulo, la galería cambia a «Estilos de bajada». El estilo se ve igual en la portada y en la nota larga.</span>'`,
  'ayuda de la galería de titulares'
);

EDITOR_JS = reemplazar(
  EDITOR_JS,
  `    contenedor.addEventListener('change', function (e) {
      const sel = e.target;`,
  `    contenedor.addEventListener('paste', function (e) {
      const ed = e.target && e.target.closest ? e.target.closest('.cms-rico-editor') : null;
      if (!ed) return;
      setTimeout(function () { limpiarPegado(ed); }, 0);
    });

    contenedor.addEventListener('change', function (e) {
      const sel = e.target;`,
  'escucha del pegado en los editores'
);


/* -------------------------------------------------------------------------- */
/* 4 · Campos del esquema que usan el editor con formato                      */
/* -------------------------------------------------------------------------- */

/* Solo los campos de contenido editorial. Los textos con plantillas
   ({nombre}, {correo}), los metadatos de SEO y los mensajes de los lectores
   siguen siendo texto plano a propósito. */
const CAMPOS_RICO = [
  "{ path: 'whatsapp.descripcion', label: 'Descripción', tipo: 'area' },",
  "{ path: 'publicidad.tier3.texto', label: 'NATIVO 19 · Texto breve', tipo: 'area' },",
  "{ path: 'hero.titulo', label: 'Titular principal', tipo: 'area' },",
  "{ path: 'hero.cita', label: 'Cita destacada (pull quote)', tipo: 'area' },",
  "{ path: 'hero.epigrafe', label: 'Epígrafe de la fotografía', tipo: 'area' },",
  "{ path: 'hero.cuerpo', label: 'Cuerpo completo de la crónica (separe párrafos con línea vacía)', tipo: 'area', filas: true },",
  "{ path: 'titulo', label: 'Titular', tipo: 'area' },",
  "{ path: 'entradilla', label: 'Entrada (el párrafo que engancha)', tipo: 'area' },",
  "{ path: 'cuerpo', label: 'Texto completo', tipo: 'area', filas: true },",
  "{ path: 'cabinaVip.subtitulo', label: 'Subtítulo del flyer', tipo: 'area' },",
  "{ path: 'cabinaVip.scoutingRival.notas', label: 'Notas de inteligencia', tipo: 'area' },",
  "{ path: 'pie', label: 'Pie de foto / descripción', tipo: 'area' },",
  "{ path: 'tablaPosiciones.nota', label: 'Ayuda de la tabla', tipo: 'area' },",
  "{ path: 'tablaPosiciones.leyenda', label: 'Leyenda inferior', tipo: 'area' },",
  "{ path: 'roster.nota', label: 'Ayuda de la plantilla', tipo: 'area' }",
  "{ path: 'bio', label: 'Ficha / descripción', tipo: 'area' },",
  "{ path: 'publicidadCarruseles.nota', label: 'Nota descriptiva', tipo: 'area' },",
  "{ path: 'descripcion', label: 'Descripción de la categoría', tipo: 'area' }",
  "{ path: 'sub', label: 'Subtítulo / oferta', tipo: 'area' },",
  "{ path: 'texto', label: 'Texto de la ficha publicitaria', tipo: 'area', filas: true },",
  "{ path: 'hilosSeccion.nota', label: 'Nota descriptiva', tipo: 'area' },",
  "{ path: 'descripcion', label: 'Descripción', tipo: 'area' },",
  "{ path: 'texto', label: 'Descripción de la jugada', tipo: 'area', filas: true },",
  "{ path: 'redesMultimedia.nota', label: 'Nota descriptiva', tipo: 'area' },",
  "{ path: 'desc', label: 'Descripción o entradilla', tipo: 'area' },",
  "{ path: 'desc', label: 'Descripción', tipo: 'area' },",
  "{ path: 'sub', label: 'Texto inferior', tipo: 'area' },",
  "{ path: 'multimedia.desc', label: 'Descripción', tipo: 'area' },",
  "{ path: 'circuloVip.descripcion', label: 'Descripción', tipo: 'area' },",
  "{ path: 'circuloVip.paywall.texto', label: 'PAYWALL · Texto', tipo: 'area' },",
  "campos: [{ path: 'texto', label: 'Texto del beneficio', tipo: 'area' }]",
  "{ path: 'paredon.descripcion', label: 'Descripción', tipo: 'area' },",
  "{ path: 'texto', label: 'Texto de la historia (si es de texto)', tipo: 'area' },",
  "{ path: 'texto', label: 'Mensaje', tipo: 'area' },",
  "{ path: 'footer.descripcion', label: 'Descripción institucional', tipo: 'area' },"
];

/* -------------------------------------------------------------------------- */
/* Aplicación                                                                 */
/* -------------------------------------------------------------------------- */

function aplicar(archivo) {
  let h = fs.readFileSync(archivo, 'utf8');
  const original = h;

  /* --- CSS ------------------------------------------------------------- */
  h = instalarCss(h, CSS_WORD);

  /* --- esc() pasa a entender el contenido enriquecido ------------------- */
  h = reemplazar(
    h,
    `  function esc(v) {
    return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }`,
    `  function esc(v) {
    if (v === undefined || v === null) return '';
    const s = String(v);
    if (esValorRico(s)) return santizarRico(s.slice(1));
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escTexto(v) {
    if (v === undefined || v === null) return '';
    return aTextoPlano(v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }`,
    'función esc()'
  );

  /* --- el motor (saneado, conversión, valor marcado) ------------------- */
  h = instalarBloque(h, MARCA_MOTOR, MARCA_MOTOR_FIN, MOTOR_JS, '  let contadorId = 0;', 'motor de texto enriquecido');

  /* --- setTxt() / setHtml() ------------------------------------------- */
  h = reemplazar(
    h,
    `  function setTxt(id, val) { const el = document.getElementById(id); if (el && val !== undefined && val !== null) el.textContent = val; }
  function setHtml(id, html) { const el = document.getElementById(id); if (el && html !== undefined) el.innerHTML = html; }`,
    `  function setTxt(id, val) {
    const el = document.getElementById(id);
    if (!el || val === undefined || val === null) return;
    const s = String(val);
    if (esValorRico(s)) { el.innerHTML = santizarRico(s.slice(1)); return; }
    el.textContent = s;
  }
  function setHtml(id, html) {
    const el = document.getElementById(id);
    if (!el || html === undefined) return;
    const s = String(html);
    el.innerHTML = esValorRico(s) ? santizarRico(s.slice(1)) : s;
  }`,
    'setTxt() / setHtml()'
  );

  /* --- textoAParrafos() ------------------------------------------------ */
  h = reemplazar(
    h,
    `  function textoAParrafos(txt) {
    if (!txt) return '';
    return String(txt).split(/\\n{2,}/).map(function (p) { return '<p style="margin-bottom:0.85rem;">' + esc(p).replace(/\\n/g, '<br>') + '</p>'; }).join('');
  }`,
    `  function textoAParrafos(txt) {
    if (!txt) return '';
    const s = String(txt);
    if (esValorRico(s)) return santizarRico(s.slice(1));
    return s.split(/\\n{2,}/).map(function (p) { return '<p style="margin-bottom:0.85rem;">' + esc(p).replace(/\\n/g, '<br>') + '</p>'; }).join('');
  }`,
    'textoAParrafos()'
  );

  /* --- el editor Word entra en el esquema ----------------------------- */
  h = reemplazar(
    h,
    `    if (tipo === 'area') {
      const filas = def.filas ? ' rows="8"' : '';
      return '<div class="cms-campo">' + etiqueta + '<textarea data-path="' + esc(path) + '" data-tipo="texto"' + filas + '>' + esc(valor || '') + '</textarea>' + ayuda + '</div>';
    }`,
    `    if (tipo === 'area') {
      if (def.rico) return construirEditorRico(def, path, valor);
      const filas = def.filas ? ' rows="8"' : '';
      return '<div class="cms-campo">' + etiqueta + '<textarea data-path="' + esc(path) + '" data-tipo="texto"' + filas + '>' + escTexto(valor || '') + '</textarea>' + ayuda + '</div>';
    }`,
    'rama "area" de construirCampo()'
  );

  /* --- guardar lo que se escribe en el editor ------------------------- */
  h = reemplazar(
    h,
    `  function manejarEntradaCMS(e) {
    const el = e.target;
    if (!el || !el.dataset || !el.dataset.path) return;
    if (el.dataset.tipo !== 'texto') return;`,
    `  function manejarEntradaCMS(e) {
    const el = e.target;
    if (!el || !el.dataset || !el.dataset.path) return;
    if (el.dataset.tipo === 'rico') {
      if (el.classList && el.classList.contains('cms-rico-editor')) guardarEditorRico(el);
      return;
    }
    if (el.dataset.tipo !== 'texto') return;`,
    'manejarEntradaCMS()'
  );

  /* --- conectar los editores al panel ---------------------------------- */
  h = reemplazar(
    h,
    `      cont.innerHTML = construirPanel(g);
      activarZonasDeCarga(cont);`,
    `      cont.innerHTML = construirPanel(g);
      activarZonasDeCarga(cont);
      activarEditoresRicos(cont);`,
    'construirPanelCmsSiHaceFalta()'
  );

  /* --- textos que viajan a redes sociales o meta etiquetas ------------- */
  h = reemplazar(
    h,
    `    const titulo = (d && d.titulo) || (portalState.seo && portalState.seo.ogTitulo) || '';
    const desc = String(((d && (d.sub || d.texto)) || (portalState.seo && portalState.seo.ogDesc) || '')).slice(0, 200);`,
    `    const titulo = aTextoPlano((d && d.titulo) || (portalState.seo && portalState.seo.ogTitulo) || '');
    const desc = aTextoPlano(((d && (d.sub || d.texto)) || (portalState.seo && portalState.seo.ogDesc) || '')).slice(0, 200);`,
    'aplicarMetaCompartida()'
  );

  h = reemplazar(
    h,
    `alt="' + esc(d.titulo || 'Imagen destacada') + '"`,
    `alt="' + escTexto(d.titulo || 'Imagen destacada') + '"`,
    'alt de la imagen destacada de la ficha'
  );

  /* --- la URL canónica manda, también probando en local ----------------- */
  h = reemplazar(
    h,
    `    const esEjemplo = !configurada || /latabernadelmagallanes\\.news/i.test(configurada) || /localhost|127\\.0\\.0\\.1/i.test(configurada);
    return (configurada && !esEjemplo) ? configurada : (lugar || configurada || 'https://latabernadelmagallanes.news');`,
    `    /* La URL canónica fijada en el CMS manda SIEMPRE, también probando en
       local: si no, los enlaces que se comparten y los códigos QR apuntarían
       a localhost y no servirían para nada. */
    const esEjemplo = /latabernadelmagallanes\\.news/i.test(configurada);
    const esLocal = /localhost|127\\.0\\.0\\.1/i.test(configurada);
    if (configurada && !esEjemplo && !esLocal) return configurada;
    return lugar || configurada || 'https://latabernadelmagallanes.news';`,
    'urlPublicaPortal()'
  );

  h = reemplazar(
    h,
    `    const img = urlDestacada(fichaActual);
    const titulo = fichaActual.titulo || 'La Taberna del Magallanes News';`,
    `    const img = imagenDeFicha(fichaActual);
    const titulo = fichaActual.titulo || 'La Taberna del Magallanes News';`,
    'imagen de la hoja de compartir'
  );

  h = reemplazar(
    h,
    `      '<div style="margin-top:0.7rem;">' +
        '<button type="button" class="red-btn" style="width:100%;" onclick="cerrarHojaCompartir(); abrirFicha(fichaActual)">💬 Ver y escribir comentarios</button>' +
      '</div>';`,
    `      '<div style="margin-top:0.7rem; display:flex; gap:6px; flex-wrap:wrap;">' +
        '<button type="button" class="red-btn" style="flex:1; min-width:150px;" onclick="descargarImagenFicha()">🖼️ Descargar la imagen</button>' +
        '<button type="button" class="red-btn" style="flex:1; min-width:150px;" onclick="cerrarHojaCompartir(); abrirFicha(fichaActual)">💬 Ver y escribir comentarios</button>' +
      '</div>';`,
    'botones de la hoja de compartir'
  );

  h = reemplazar(
    h,
    `      '<div class="compartir-enlace">' +
        '<span class="compartir-enlace-txt">🔗 <span class="compartir-enlace-url">' + esc(enlaceFicha(fichaActual)) + '</span></span>' +
        '<button type="button" class="red-btn" onclick="copiarEnlaceFicha()">📋 Copiar</button>' +
      '</div>' +`,
    `      '<div class="compartir-enlace">' +
        '<a class="compartir-enlace-txt" href="' + esc(enlaceFicha(fichaActual)) + '" target="_blank" rel="noopener" title="Abrir este enlace">' +
          '🔗 <span class="compartir-enlace-url">' + esc(enlaceFicha(fichaActual)) + '</span>' +
        '</a>' +
        '<button type="button" class="red-btn" onclick="copiarEnlaceFicha()">📋 Copiar</button>' +
      '</div>' +`,
    'enlace clicable de la hoja de compartir'
  );

  /* --- la hoja de compartir debe MOSTRAR el enlace, no solo el texto ---- */
  h = reemplazar(
    h,
    `      '<p class="compartir-ayuda">Elija su red social o muestre el <b>código QR estilo Instagram</b> para que otro lo escanee con la cámara del teléfono.</p>' +`,
    `      '<div class="compartir-enlace">' +
        '<a class="compartir-enlace-txt" href="' + esc(enlaceFicha(fichaActual)) + '" target="_blank" rel="noopener" title="Abrir este enlace">' +
          '🔗 <span class="compartir-enlace-url">' + esc(enlaceFicha(fichaActual)) + '</span>' +
        '</a>' +
        '<button type="button" class="red-btn" onclick="copiarEnlaceFicha()">📋 Copiar</button>' +
      '</div>' +
      '<p class="compartir-ayuda">Elija su red social o muestre el <b>código QR estilo Instagram</b> para que otro lo escanee con la cámara del teléfono.</p>' +`,
    'hoja de compartir'
  );

  h = reemplazar(
    h,
    `  function cerrarHojaCompartir() {`,
    `  /* Copia el enlace del contenido que se está compartiendo. */
  function copiarEnlaceFicha() {
    const enlace = enlaceFicha(fichaActual);
    copiarTextoAlPortapapeles(enlace, '📋 Enlace copiado al portapapeles');
  }
  function cerrarHojaCompartir() {`,
    'copiarEnlaceFicha()'
  );

  /* --- la vista previa Open Graph también muestra la dirección completa -- */
  h = reemplazar(
    h,
    `          <p id="ogModalDesc" style="font-size: 0.75rem; color: #4b5563; line-height: 1.45; margin-bottom: 8px;">
            Investigación especial: Análisis de comando y telemetría de lanzamientos en Valencia.
          </p>`,
    `          <p id="ogModalDesc" style="font-size: 0.75rem; color: #4b5563; line-height: 1.45; margin-bottom: 8px;">
            Investigación especial: Análisis de comando y telemetría de lanzamientos en Valencia.
          </p>
          <p id="ogModalUrl" style="font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: #6b7280; word-break: break-all; margin: 0 0 8px; user-select: all; -webkit-user-select: all;">—</p>`,
    'vista previa Open Graph (elemento)'
  );

  h = reemplazar(
    h,
    `    try { setTxt('ogModalDominio', new URL(urlPublicaPortal()).hostname); } catch (e) { }`,
    `    try { setTxt('ogModalDominio', new URL(urlPublicaPortal()).hostname); } catch (e) { }
    setTxt('ogModalUrl', urlPublicaPortal());`,
    'vista previa Open Graph (contenido)'
  );

  /* --- compartir: imagen + entrada + enlace en TODAS las plataformas ------ */

  /* --- la ficha también muestra el enlace (no solo el texto) ------------- */
  h = reemplazar(
    h,
    `          htmlRedesCompartir() +
        '</div>' +
        '<div class="ficha-bloque" id="fichaBloqueComentarios">' +`,
    `          '<div class="compartir-enlace" style="margin:9px 0 10px;">' +
            '<a class="compartir-enlace-txt" href="' + esc(enlaceFicha(d)) + '" target="_blank" rel="noopener" title="Abrir este enlace">' +
              '🔗 <span class="compartir-enlace-url">' + esc(enlaceFicha(d)) + '</span>' +
            '</a>' +
            '<button type="button" class="red-btn" onclick="copiarEnlaceFicha()">📋 Copiar</button>' +
          '</div>' +
          htmlRedesCompartir() +
        '</div>' +
        '<div class="ficha-bloque" id="fichaBloqueComentarios">' +`,
    'enlace de la ficha de contenido'
  );

  /* --- al abrir un enlace de nota, el desplazamiento debe ser fiable ---- */
  h = reemplazar(
    h,
    `      if (btn && cuerpo && !cuerpo.classList.contains('activa')) toggleCronica(id, btn);
      try { tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch (e) { }`,
    `      if (btn && cuerpo && !cuerpo.classList.contains('activa')) toggleCronica(id, btn);
      desplazarHasta(tarjeta);`,
    'desplazamiento al abrir una nota'
  );

  h = reemplazar(
    h,
    `  function abrirCronicaDesdeHash() {`,
    `  /* Lleva la nota a la vista de forma fiable: la imagen de la crónica
     carga después y mueve el diseño, así que se reintenta el desplazamiento. */
  function desplazarHasta(el) {
    if (!el) return;
    const ejecutar = function () {
      try {
        const arriba = el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0);
        const destino = Math.max(0, arriba - Math.max(60, (window.innerHeight - el.offsetHeight) / 2));
        window.scrollTo({ top: destino, behavior: 'smooth' });
      } catch (e) {
        try { el.scrollIntoView({ block: 'center' }); } catch (e2) { }
      }
    };
    ejecutar();
    setTimeout(ejecutar, 400);
    setTimeout(ejecutar, 1300);
  }

  function abrirCronicaDesdeHash() {`,
    'desplazarHasta()'
  );

  /* --- el enlace del Paredón también usa la URL pública ---------------- */
  h = reemplazar(
    h,
    `    const url = location.href.split('#')[0] + '#modulo-18-paredon-fanatico';`,
    `    const url = urlPublicaPortal() + '#modulo-18-paredon-fanatico';`,
    'compartirParedon()'
  );

  /* --- en el CMS, cada elemento de una lista tiene su enlace ------------ */
  h = reemplazar(
    h,
    `          '<button type="button" class="cms-boton rojo mini" data-accion="eliminarItem" data-lista="' + esc(rep.path) + '" data-indice="' + i + '" title="Eliminar">✕</button>' +`,
    `          '<button type="button" class="cms-boton sec mini" data-accion="copiarEnlaceItem" data-ruta="' + esc(base) + '" title="Copiar el enlace de este contenido para compartirlo">🔗</button>' +
          '<button type="button" class="cms-boton rojo mini" data-accion="eliminarItem" data-lista="' + esc(rep.path) + '" data-indice="' + i + '" title="Eliminar">✕</button>' +`,
    'botón de enlace en cada elemento del CMS'
  );

  h = reemplazar(
    h,
    `    if (accion === 'pestanaItem') {`,
    `    if (accion === 'copiarEnlaceItem') {
      const ruta = el.getAttribute('data-ruta');
      const item = valorDeRuta(portalState, ruta);
      const enlace = enlaceDeElemento(ruta, item);
      copiarTextoAlPortapapeles(enlace, '🔗 Enlace copiado: ' + enlace);
      return;
    }
    if (accion === 'pestanaItem') {`,
    'acción copiarEnlaceItem'
  );

  h = reemplazar(
    h,
    `  function buscarRepeater(pathLista) {`,
    `  /* Ancla de cada módulo del portal, para los enlaces profundos. */
  const MODULO_ANCLA = {
    'cronicas': 'modulo-06-cronica',
    'publicidadCarruseles': 'modulo-11-carruseles-publicidad',
    'hilos': 'modulo-12-hilos-informativos',
    'redesMultimedia': 'modulo-13-multimedia-redes',
    'cabinaVip': 'modulo-07-cabina-statcast',
    'infografias': 'modulo-07-cabina-statcast',
    'memes': 'modulo-07-cabina-statcast',
    'paredon': 'modulo-18-paredon-fanatico',
    'historias': 'modulo-05-hero',
    'chatFanatico': 'modulo-12-hilos-informativos'
  };

  /* Enlace público de un elemento concreto del portal.
     Las crónicas llevan su ancla propia (#cronica-<id>), que abre la nota. */
  function enlaceDeElemento(ruta, item) {
    const base = urlPublicaPortal();
    const modulo = String(ruta || '').split('.')[0];
    if (modulo === 'cronicas' && item && item.id) return base + '#cronica-' + item.id;
    const ancla = MODULO_ANCLA[modulo];
    return ancla ? base + '#' + ancla : base;
  }

  function buscarRepeater(pathLista) {`,
    'enlaceDeElemento()'
  );

  /* --- entrada visible a la redacción, discreta para el lector ----------- */
  h = reemplazar(
    h,
    `        <div><span id="footerCopyright">© 2026 La Taberna del Magallanes News. Todos los derechos reservados. Dirección General: Luis Enrique Aponte Guzmán.</span></div>`,
    `        <div><span id="footerCopyright">© 2026 La Taberna del Magallanes News. Todos los derechos reservados. Dirección General: Luis Enrique Aponte Guzmán.</span>
          <a href="redaccion-cms.html" title="Acceso privado de la redacción (Director y Periodistas)" style="color:#9a9a9a; text-decoration:none; margin-left:10px; white-space:nowrap;">✍️ Redacción</a></div>`,
    'enlace de redacción en el pie de página'
  );

  /* --- "Leer más" lleva a la NOTA COMPLETA en su propia página ---------- */


  /* --- cada crónica tiene su dirección propia (permalink) ---------------- */
  h = reemplazar(
    h,
    `      clave: 'cronica-' + c.id,
      modulo: '06-cronica',`,
    `      clave: 'cronica-' + c.id,
      url: urlPublicaPortal() + 'cronica.html?c=' + encodeURIComponent(c.id),
      modulo: '06-cronica',`,
    'enlace propio de cada crónica'
  );

  h = reemplazar(
    h,
    `  function enlaceFicha(d) {
    const propio = String((d && d.enlace) || '').trim();
    if (propio && /^https?:\\/\\//i.test(propio)) return propio;
    return urlPublicaPortal() + ((d && d.clave) ? '#' + d.clave : '');
  }`,
    `  function enlaceFicha(d) {
    const propio = String((d && d.enlace) || '').trim();
    if (propio && /^https?:\\/\\//i.test(propio)) return propio;
    /* Las crónicas tienen página propia (cronica.html?c=ID). */
    if (d && d.url) return String(d.url);
    return urlPublicaPortal() + ((d && d.clave) ? '#' + d.clave : '');
  }`,
    'enlaceFicha()'
  );

  /* --- la NOTA DERECHA del muro: columna de redacción de verdad ---------- */
  h = reemplazar(
    h,
    `        { path: 'cronicasSeccion.nota', label: 'Nota derecha', tipo: 'texto' },`,
    `        { path: 'cronicasSeccion.nota', label: 'Nota de la redacción (columna derecha del muro)', tipo: 'area', rico: true },`,
    'nota derecha del muro de crónicas'
  );

  h = reemplazar(
    h,
    `      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0b2240; padding-bottom: 0.5rem; margin-bottom: 1.25rem; gap: 0.75rem; flex-wrap: wrap;">
        <div>
          <span id="cronicasEtiqueta" style="font-family: 'Inter', sans-serif; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #c59b27; letter-spacing: 0.1em;">Investigación de Terreno</span>
          <h3 id="cronicasTitulo" style="font-family: 'Playfair Display', Georgia, serif; font-size: 1.75rem; font-weight: 800; color: #0b2240; line-height: 1.1;">Muro de la Crónica &amp; Scouting Reports</h3>
        </div>
        <span id="cronicasNota" style="font-family: 'Inter', sans-serif; font-size: 0.7rem; color: #666666;">Lectura con despiece analítico</span>
      </div>`,
    `      <div class="cronicas-cabecera">
        <div class="cronicas-cabecera-izq">
          <span id="cronicasEtiqueta" style="font-family: 'Inter', sans-serif; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #c59b27; letter-spacing: 0.1em;">Investigación de Terreno</span>
          <h3 id="cronicasTitulo" style="font-family: 'Playfair Display', Georgia, serif; font-size: 1.75rem; font-weight: 800; color: #0b2240; line-height: 1.1;">Muro de la Crónica &amp; Scouting Reports</h3>
        </div>
        <aside class="cronicas-nota" id="cronicasNota">
          <b class="cronicas-nota-tit">Nota de la redacción</b>
          <div class="cronicas-nota-cuerpo" id="cronicasNotaCuerpo">Lectura con despiece analítico</div>
        </aside>
      </div>`,
    'cabecera del muro de crónicas'
  );

  h = reemplazar(
    h,
    `    setTxt('cronicasNota', s.nota);`,
    `    setTxt('cronicasNotaCuerpo', s.nota);
    const cajaNota = document.getElementById('cronicasNota');
    if (cajaNota) cajaNota.style.display = String(s.nota || '').trim() ? '' : 'none';`,
    'render de la nota derecha'
  );

  /* --- la crónica lleva titular, subtítulo y entrada ------------------------ */
  h = reemplazar(
    h,
    `            { path: 'titulo', label: 'Título', tipo: 'area', rico: true },
            { path: 'entradilla', label: 'Entradilla', tipo: 'area', rico: true },`,
    `            { path: 'titulo', label: 'Titular', tipo: 'area', rico: true },
            { path: 'subtitulo', label: 'Subtítulo', tipo: 'area', rico: true },
            { path: 'entradilla', label: 'Entrada (el párrafo que engancha)', tipo: 'area', rico: true },`,
    'titular, subtítulo y entrada de la crónica'
  );

  /* --- el muro muestra también el subtítulo ------------------------------- */


  /* --- el panel del CMS debe redibujarse cuando llega el contenido ------- */
  h = reemplazar(
    h,
    `    renderizarTodo();
    actualizarIndicadorEstado(guardado ? 'Estado restaurado' : 'Plantilla cargada');`,
    `    renderizarTodo();
    /* El panel del CMS se dibujó al abrir la página, antes de que llegara el
       contenido guardado: hay que redibujarlo para que muestre los textos
       reales y los contadores de palabras correctos. */
    refrescarPanelCMS();
    actualizarIndicadorEstado(guardado ? 'Estado restaurado' : 'Plantilla cargada');`,
    'redibujado del panel del CMS tras cargar el contenido'
  );

  h = reemplazar(
    h,
    `    cont.innerHTML = construirPanel(g);
    activarZonasDeCarga(cont);
    abiertos.forEach(function (clave) {`,
    `    cont.innerHTML = construirPanel(g);
    activarZonasDeCarga(cont);
    /* Al redibujar hay que volver a calcular los contadores de los editores
       con formato (palabras y caracteres). */
    activarEditoresRicos(cont);
    abiertos.forEach(function (clave) {`,
    'contadores al refrescar el panel del CMS'
  );

  /* --- helper para MOSTRAR contenido con formato --------------------------- */
  h = reemplazar(
    h,
    `  function textoDeRico(html) {`,
    `  /* Muestra un valor del CMS: si viene con formato (editor Word) lo
     interpreta como HTML; si es texto plano, lo escapa. Sin esto, una nota
     escrita con formato salía con las etiquetas a la vista.

     Si el contenido es un solo párrafo, se desenvuelve: insertado dentro de
     un <p> o un <span>, el navegador cerraría la etiqueta antes de tiempo y
     el texto se quedaría fuera. */
  function htmlDeContenido(valor) {
    if (valor === undefined || valor === null) return '';
    const s = String(valor);
    if (!esValorRico(s)) return esc(s);
    const html = santizarRico(s.slice(1));
    const soloParrafo = /^<p>([\\s\\S]*)<\\/p>$/.exec(html);
    return soloParrafo ? soloParrafo[1] : html;
  }

  function textoDeRico(html) {`,
    'htmlDeContenido()'
  );

  /* --- el teaser y la ficha muestran el contenido con formato -------------- */
  h = reemplazar(
    h,
    `        '<h3 class="teaser-titular">' + esc(c.titulo) + '</h3>' +
        (c.subtitulo ? '<p class="teaser-subtitulo">' + esc(c.subtitulo) + '</p>' : '') +
        '<p class="teaser-lead">' + esc(c.entradilla) + '</p>' +`,
    `        '<h3 class="teaser-titular">' + htmlDeContenido(c.titulo) + '</h3>' +
        (c.subtitulo ? '<p class="teaser-subtitulo">' + htmlDeContenido(c.subtitulo) + '</p>' : '') +
        '<p class="teaser-lead">' + htmlDeContenido(c.entradilla) + '</p>' +`,
    'teaser de la crónica'
  );

  h = reemplazar(
    h,
    `        '<h3 class="ficha-titulo">' + esc(d.titulo || 'Sin título') + '</h3>' +
        (d.sub ? '<p class="ficha-sub">' + esc(d.sub) + '</p>' : '') +`,
    `        '<h3 class="ficha-titulo">' + htmlDeContenido(d.titulo || 'Sin título') + '</h3>' +
        (d.sub ? '<p class="ficha-sub">' + htmlDeContenido(d.sub) + '</p>' : '') +`,
    'ficha de contenido'
  );

  /* --- el CMS tampoco debe mostrar el HTML crudo al editar -------------- */
  h = reemplazar(
    h,
    `  function construirEditorRico(def, ruta, valor) {`,
    `  function construirEditorRico(def, ruta, valor) {`,
    'construirEditorRico()'
  );

  /* --- todos los campos con formato se MUESTRAN con su formato ----------- */
  /* Antes se escapaban con esc(), así que una nota escrita en el editor Word
     salía con las etiquetas a la vista en vez de maquetada. */
  const CON_FORMATO = [
    ['<p style="font-size:0.8125rem; color:#4a4a4a; margin-bottom:0.85rem;">\' + esc(i.desc) + \'</p>',
      '<p style="font-size:0.8125rem; color:#4a4a4a; margin-bottom:0.85rem;">\' + htmlDeContenido(i.desc) + \'</p>',
      'descripción de la infografía'],

    ['<p style="font-size:0.75rem; color:#555; font-style:italic; margin-bottom:0.6rem;">\' + esc(m.sub) + \'</p>',
      '<p style="font-size:0.75rem; color:#555; font-style:italic; margin-bottom:0.6rem;">\' + htmlDeContenido(m.sub) + \'</p>',
      'subtítulo del meme'],

    ['return \'<li style="margin-bottom: 5px;">★ \' + esc(b.texto) + \'</li>\';',
      'return \'<li style="margin-bottom: 5px;">★ \' + htmlDeContenido(b.texto) + \'</li>\';',
      'beneficio del Círculo VIP'],

    ['\' data-flyer-campo="sub" data-flyer-indice="\' + indice + \'">\' + esc(f.sub || \'Sin descripción\') + \'</span>\'',
      '\' data-flyer-campo="sub" data-flyer-indice="\' + indice + \'">\' + htmlDeContenido(f.sub || \'Sin descripción\') + \'</span>\'',
      'subtítulo del flyer'],

    ['esc(s.leyenda || \'\'));',
      'htmlDeContenido(s.leyenda || \'\'));',
      'leyenda de la tabla de posiciones'],

    ['\'<b class="cp-titulo">\' + esc(d.titulo || \'\') + \'</b>\'',
      '\'<b class="cp-titulo">\' + htmlDeContenido(d.titulo || \'\') + \'</b>\'',
      'previsualización de la ficha'],

    ['\' data-pub-campo="sub" data-pub-id="\' + esc(f.id) + \'">\' + esc(f.sub || \'Sin descripción\') + \'</span>\'',
      '\' data-pub-campo="sub" data-pub-id="\' + esc(f.id) + \'">\' + htmlDeContenido(f.sub || \'Sin descripción\') + \'</span>\'',
      'subtítulo del flyer publicitario'],

    ['\'<span class="pub-desc">\' + esc(cat.descripcion || \'\') + \'</span>\'',
      '\'<span class="pub-desc">\' + htmlDeContenido(cat.descripcion || \'\') + \'</span>\'',
      'descripción de la categoría publicitaria'],

    ['\' data-rm-campo="desc" data-rm-id="\' + esc(it.id) + \'">\' + esc(it.desc || \'\') + \'</span>\'',
      '\' data-rm-campo="desc" data-rm-id="\' + esc(it.id) + \'">\' + htmlDeContenido(it.desc || \'\') + \'</span>\'',
      'descripción de la publicación de redes'],

    ['\'<p class="hj-texto">\' + esc(j.texto || \'\') + \'</p>\'',
      '\'<p class="hj-texto">\' + htmlDeContenido(j.texto || \'\') + \'</p>\'',
      'texto de la jugada'],

    ['\'<span class="hilo-sub">\' + esc(hilo.descripcion || \'\') + \'</span>\'',
      '\'<span class="hilo-sub">\' + htmlDeContenido(hilo.descripcion || \'\') + \'</span>\'',
      'descripción del hilo'],

    ['\' data-hm-campo="pie" data-hm-id="\' + esc(m.id) + \'">\' + esc(m.pie || \'Sin descripción\') + \'</span>\'',
      '\' data-hm-campo="pie" data-hm-id="\' + esc(m.id) + \'">\' + htmlDeContenido(m.pie || \'Sin descripción\') + \'</span>\'',
      'pie de foto del heatmap'],

    ['\';\"><p>\' + esc(it.texto || it.titulo || \'Historia\') + \'</p></div>\'',
      '\';\"><p>\' + htmlDeContenido(it.texto || it.titulo || \'Historia\') + \'</p></div>\'',
      'texto de la historia']
  ];

  CON_FORMATO.forEach(function (c) {
    h = reemplazar(h, c[0], c[1], c[2]);
  });

  /* --- compresión de imágenes: sin esto el HTML pesa 30 MB ------------------ */
  h = reemplazar(
    h,
    `  function leerArchivoComoDataURL(archivo) {`,
    `  /* Reduce el peso de una imagen incrustada: la reescala a un ancho máximo
     y la vuelve a codificar en JPEG (o WebP si el navegador lo soporta).
     Sin esto, una foto de 4 MB incrustada weighs 5,5 MB en el HTML. */
  const ANCHO_MAXIMO_IMAGEN = 1600;
  const CALIDAD_IMAGEN = 0.82;

  function comprimirImagenDataUrl(dataUrl, maxAncho, calidad) {
    return new Promise(function (res) {
      const url = String(dataUrl || '');
      if (url.indexOf('data:image/') !== 0) return res(url);
      const limite = maxAncho || ANCHO_MAXIMO_IMAGEN;
      const img = new Image();
      img.onload = function () {
        try {
          const escala = Math.min(1, limite / (img.naturalWidth || limite));
          const w = Math.max(1, Math.round((img.naturalWidth || limite) * escala));
          const h = Math.max(1, Math.round((img.naturalHeight || limite) * escala));
          const lienzo = document.createElement('canvas');
          lienzo.width = w; lienzo.height = h;
          const ctx = lienzo.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const webp = lienzo.toDataURL('image/webp', calidad || CALIDAD_IMAGEN);
          const jpg = lienzo.toDataURL('image/jpeg', calidad || CALIDAD_IMAGEN);
          const mejor = (webp && webp.length && webp.length < jpg.length) ? webp : jpg;
          /* Si comprimir no ayuda (o el original es un GIF animado, que el
             lienzo no puede reproducir), se conserva el original. */
          if (!mejor || mejor.length >= url.length) return res(url);
          res(mejor);
        } catch (e) { res(url); }
      };
      img.onerror = function () { res(url); };
      img.src = url;
    });
  }

  /* Recorre el estado y comprime todas las imágenes incrustadas. */
  async function optimizarImagenesDelEstado() {
    let procesadas = 0, antes = 0, despues = 0;
    const visitar = async function (valor) {
      if (typeof valor === 'string') return valor;
      if (Array.isArray(valor)) {
        for (let i = 0; i < valor.length; i++) valor[i] = await visitar(valor[i]);
        return valor;
      }
      if (valor && typeof valor === 'object') {
        const claves = Object.keys(valor);
        for (let i = 0; i < claves.length; i++) {
          const k = claves[i];
          if (typeof valor[k] === 'string' && valor[k].indexOf('data:image/') === 0) {
            antes += valor[k].length;
            const optimizada = await comprimirImagenDataUrl(valor[k]);
            if (optimizada.length < valor[k].length) { despues += optimizada.length; procesadas++; }
            else despues += valor[k].length;
            valor[k] = optimizada;
          } else {
            valor[k] = await visitar(valor[k]);
          }
        }
      }
      return valor;
    };
    await visitar(portalState);
    return { procesadas: procesadas, antes: antes, despues: despues };
  }

  function leerArchivoComoDataURL(archivo) {`,
    'compresión de imágenes'
  );

  /* Al subir un archivo, las imágenes se comprimen al momento.
     Se aceptan las dos formas del bloque (con y sin compresión previa) para
     que el parche sirva tanto sobre un archivo recién descargado del CMS
     como sobre el que ya estaba optimizado. */
  const SUBIR_NUEVO = `      let dataUrl = await leerArchivoComoDataURL(archivo);
      if (dataUrl && dataUrl.indexOf('data:image/') === 0) {
        if (dataUrl.indexOf('data:image/gif') === 0) {
          /* Un GIF animado no se puede recomprimir sin perder la animación. */
          toast('⚠️ GIF de ' + formatearPeso(dataUrl.length) + ': los GIF animados pesan mucho. Súbalo como video MP4 o por enlace (Drive / YouTube).');
        } else {
          const comprimida = await comprimirImagenDataUrl(dataUrl);
          if (comprimida.length < dataUrl.length) {
            toast('🧹 Imagen optimizada: ' + formatearPeso(dataUrl.length) + ' → ' + formatearPeso(comprimida.length));
            dataUrl = comprimida;
          }
        }
      }
      asignarRuta(portalState, path, dataUrl);`;

  h = reemplazar(
    h,
    `      const dataUrl = await leerArchivoComoDataURL(archivo);
      asignarRuta(portalState, path, dataUrl);`,
    SUBIR_NUEVO,
    'compresión al subir'
  );

  h = reemplazar(
    h,
    `      let dataUrl = await leerArchivoComoDataURL(archivo);
      if (dataUrl && dataUrl.indexOf('data:image/') === 0) {
        const comprimida = await comprimirImagenDataUrl(dataUrl);
        if (comprimida.length < dataUrl.length) {
          toast('🧹 Imagen optimizada: ' + formatearPeso(dataUrl.length) + ' → ' + formatearPeso(comprimida.length));
          dataUrl = comprimida;
        }
      }
      asignarRuta(portalState, path, dataUrl);`,
    SUBIR_NUEVO,
    'compresión al subir (versión previa)'
  );

  /* Al publicar, se optimizan las imágenes incrustadas antes de generar el
     HTML: si no, un archivo con fotos de 4 MB pesa 30 MB y la web tarda
     una eternidad en cargar. */
  h = reemplazar(
    h,
    `      const patron = /(<script type="application\\/json" id="estadoEmbebido">)[\\s\\S]*?(<\\/script>)/;
      if (!patron.test(html)) { toast('⚠️ No se encontró el bloque de contenido incrustado en este archivo'); return; }

      const json = JSON.stringify(estadoParaPublicar())`,
    `      const patron = /(<script type="application\\/json" id="estadoEmbebido">)[\\s\\S]*?(<\\/script>)/;
      if (!patron.test(html)) { toast('⚠️ No se encontró el bloque de contenido incrustado en este archivo'); return; }

      /* Optimizar las imágenes antes de publicar. */
      try {
        const opt = await optimizarImagenesDelEstado();
        if (opt && opt.procesadas) {
          toast('🧹 ' + opt.procesadas + ' imagen(es) optimizadas: ' + formatearPeso(opt.antes) + ' → ' + formatearPeso(opt.despues));
          await ALMACEN.guardar(portalState);
        }
      } catch (e) { }

      const json = JSON.stringify(estadoParaPublicar())`,
    'optimización al publicar'
  );

  /* --- el campo de la foto de la crónica debe decir para qué sirve ------- */
  h = reemplazar(
    h,
    `            { path: 'imagen', label: 'Imagen destacada (la que se ve al compartir)', tipo: 'imagen' },`,
    `            { path: 'imagen', label: 'Foto de la nota (la de la tarjeta del muro y la que se comparte)', tipo: 'imagen' },`,
    'etiqueta de la foto de la crónica'
  );

  /* --- qué es privado y qué no ------------------------------------------- */
  /* Solo el material EXCLUSIVO es para suscriptores: el scouting, el roster
     y las fichas de la Cabina Statcast (pestaña 1). Las infografías, el
     Rincón Filibustero, la radio, el podcast y la playlist son parte del
     diario y los ve todo el mundo. */
  h = reemplazar(
    h,
    `    for (let i = 1; i <= 3; i++) {
      const panel = document.getElementById('panelVipPestana' + i);
      if (!panel) continue;
      panel.classList.toggle('vip-bloqueado', bloqueado && ocultar);
      panel.classList.toggle('vip-difuso', bloqueado && !ocultar);
      panel.style.filter = '';
      panel.style.pointerEvents = '';
      panel.style.userSelect = '';
    }`,
    `    for (let i = 1; i <= 3; i++) {
      const panel = document.getElementById('panelVipPestana' + i);
      if (!panel) continue;
      /* Solo la pestaña 1 (Scouting & Roster) es material exclusivo. */
      const esPrivado = (i === 1);
      panel.classList.toggle('vip-bloqueado', bloqueado && ocultar && esPrivado);
      panel.classList.toggle('vip-difuso', bloqueado && !ocultar && esPrivado);
      panel.style.filter = '';
      panel.style.pointerEvents = '';
      panel.style.userSelect = '';
    }`,
    'puertas de acceso por pestaña'
  );

  h = reemplazar(
    h,
    `  const MODULOS_VIP = ['07-cabina-statcast', '08-heatmap', '16-playlist'];`,
    `  /* La playlist es pública: es parte del diario, no material exclusivo. */
  const MODULOS_VIP = ['07-cabina-statcast', '08-heatmap'];`,
    'módulos con material exclusivo'
  );

  h = reemplazar(
    h,
    `? 'Solo los suscriptores VIP registrados ven la Cabina Statcast, las fichas de scouting, los mapas de calor y la radio.'`,
    `? 'Solo los suscriptores VIP registrados ven el scouting, el roster y las fichas de la Cabina Statcast. Las infografías, la radio y la playlist son públicas.'`,
    'aviso del paywall'
  );

  /* --- incrustados de redes sociales --------------------------------------- */
  /* Facebook solo se puede incrustar con la dirección de una publicación
     concreta: con el dominio suelto el plugin sale roto. */
  h = reemplazar(
    h,
    `    if (/facebook\\.com|fb\\.watch/i.test(url)) return { tipo: 'social', iframe: true, src: 'https://www.facebook.com/plugins/post.php?href=' + encodeURIComponent(url) + '&show_text=true&width=520' };`,
    `    const fb = url.match(/facebook\\.com\\/(?:[^/]+\\/)?(posts|photos|videos|permalink|media|share|reel)\\//i) || url.match(/fb\\.watch\\//i);
    if (fb) return { tipo: 'social', iframe: true, src: 'https://www.facebook.com/plugins/post.php?href=' + encodeURIComponent(url) + '&show_text=true&width=520' };`,
    'incrustado de Facebook'
  );

  /* El CMS explica cómo se va a mostrar cada enlace al pegarlo. */
  h = reemplazar(
    h,
    `  function urlHttp(valor) {`,
    `  /* Cómo se va a mostrar una publicación pegada en el CMS. */
  function redDeUnaUrl(url) {
    const u = String(url || '').trim();
    if (!u) return { nombre: 'enlace', incrusta: false };
    if (/youtube\\.com|youtu\\.be/i.test(u)) return { nombre: 'YouTube', incrusta: true };
    if (/vimeo\\.com/i.test(u)) return { nombre: 'Vimeo', incrusta: true };
    if (/instagram\\.com\\/(p|reel|reels|tv)\\//i.test(u)) return { nombre: 'Instagram', incrusta: true };
    if (/tiktok\\.com\\/(?:.*\\/)?video\\//i.test(u)) return { nombre: 'TikTok', incrusta: true };
    if (/facebook\\.com\\/(?:[^/]+\\/)?(posts|photos|videos|permalink|media|share|reel)\\//i.test(u) || /fb\\.watch\\//i.test(u)) return { nombre: 'Facebook', incrusta: true };
    if (/open\\.spotify\\.com\\//i.test(u)) return { nombre: 'Spotify', incrusta: true };
    if (/(?:twitter|x)\\.com\\/[^/]+\\/status\\//i.test(u)) return { nombre: 'X', incrusta: true };
    if (/\\.(mp4|webm|mov|mkv)(\\?|$)/i.test(u)) return { nombre: 'video', incrusta: true };
    if (/\\.(mp3|m4a|wav|ogg)(\\?|$)/i.test(u)) return { nombre: 'audio', incrusta: true };
    if (/\\.(jpe?g|png|webp|gif|avif)(\\?|$)/i.test(u)) return { nombre: 'imagen', incrusta: true };
    return { nombre: 'enlace', incrusta: false };
  }

  function urlHttp(valor) {`,
    'detección de red al pegar un enlace'
  );

  /* Al pegar un enlace, el CMS avisa de cómo se va a ver. */
  h = reemplazar(
    h,
    `    renderizarTodo();
    refrescarPanelCMS();
    toast('📡 Publicación de ' + redPorId(red).nombre + ' incrustada en el Módulo 13');
  }`,
    `    renderizarTodo();
    refrescarPanelCMS();
    /* Se avisa de cómo se va a ver: incrustada o como enlace. */
    const como = redDeUnaUrl(url);
    toast(como.incrusta
      ? ('📡 Publicación de ' + redPorId(red).nombre + ' incrustada en el Módulo 13')
      : ('🔗 Se guardó como enlace a ' + como.nombre + '. Para incrustarla, pegue la dirección de la publicación concreta (por ejemplo .../posts/123).'), 6000);
  }`,
    'aviso al pegar un enlace de red social'
  );

  /* --- 1 · el listado del CMS no debe MAQUETAR el título ------------------ */
  h = reemplazar(
    h,
    `      try { if (rep.etiquetaItem) etiquetaItem = String(rep.etiquetaItem(item, i) || etiquetaItem); } catch (e) { }`,
    `      try { if (rep.etiquetaItem) etiquetaItem = aTextoPlano(String(rep.etiquetaItem(item, i) || etiquetaItem)); } catch (e) { }`,
    'etiqueta de los elementos en el listado del CMS'
  );

  /* --- las descargas grandes necesitan más tiempo ------------------------ */
  /* Con un archivo de 30 MB, revocar el enlace a los 1,5 s cancelaba la
     descarga a medias y el navegador avisaba que no se pudo descargar. */
  h = reemplazar(
    h,
    `    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);`,
    `    setTimeout(function () { URL.revokeObjectURL(url); }, 120000);`,
    'tiempo de vida del enlace de descarga'
  );

  /* --- el enlace se guarda hasta que la descarga arranca ---------------- */
  /* Chrome cancela la descarga ("No se pudo descargar el archivo") si el
     <a> se quita del documento justo después del clic, sobre todo con
     archivos grandes. Se deja un buen rato antes de retirarlo. */
  h = reemplazar(
    h,
    `    document.body.appendChild(a); a.click(); a.remove();`,
    `    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 120000);`,
    'el enlace de descarga se conserva en el documento'
  );

  /* --- publicar desde el CMS, sin descargar archivos de 30 MB ------------- */
  if (h.indexOf('async function publicarAhora(') === -1) {
  h = reemplazar(
    h,
    `  async function descargarPaginaPublicada() {`,
    `  /* Publica el contenido directamente en la computadora que tiene el
     proyecto. Evita descargar un archivo de 30 MB (y que el navegador lo
     cancele). Si el portal está abierto con doble clic (file://), no hay
     servidor: se avisa y se cae al método de siempre. */
  async function publicarAhora() {
    if (!rolSesion) { toast('🔐 Identifíquese para publicar'); solicitarAccesoCMS(); return; }
    toast('🚀 Publicando…');
    try {
      const r = await fetch('http://localhost:' + (location.port || 8099) + '/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Opciones': JSON.stringify({ publicar: true }) },
        body: JSON.stringify(estadoParaPublicar())
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error desconocido');
      toast('✅ Publicado. GitHub lo sube en 1-4 minutos.');
      if (j.extraidos) toast('🗂 ' + j.extraidos + ' archivo(s) de audio/video sacados a la carpeta multimedia/');
    } catch (e) {
      toast('⚠️ No se pudo publicar desde aquí. Si está en el teléfono o en otro equipo, baje el archivo con «⬇️ Descargar HTML publicado» y en la computadora del diario doble clic en PUBLICAR-EL-DIARIO.cmd. Si está en esta computadora, abra ese mismo PUBLICAR-EL-DIARIO.cmd para encender el servidor y vuelva a pulsar.', 12000);
    }
  }

  async function descargarPaginaPublicada() {`,
    'publicarAhora()'
  );
  }

  /* --- botón «Publicar ahora» en la barra del CMS ------------------------ */
  h = reemplazar(
    h,
    `          <button type="button" class="cms-boton oro" onclick="descargarPaginaPublicada()" title="Genera un index.html con todo su contenido dentro, listo para subir al hosting">🚀 Descargar HTML publicado</button>`,
    `          <button type="button" class="cms-boton oro" onclick="publicarAhora()" title="Publica el contenido directamente en esta computadora y lo sube a GitHub (sin descargar archivos de 30 MB)">🚀 Publicar ahora</button>
          <button type="button" class="cms-boton" onclick="descargarPaginaPublicada()" title="Genera un index.html con todo su contenido dentro, listo para subir al hosting">⬇️ Descargar HTML publicado</button>`,
    'botón Publicar ahora'
  );

  /* --- al publicar, las imágenes locales (file://) no van ---------------- */
  /* Una imagen pegada desde el escritorio (file:///C:/...) solo existe en esa
     computadora. Si se publica, sale rota y el navegador avisa al visitante.
     Se quitan del contenido al publicar y se avisa de que hay que subirlas. */
  h = reemplazar(
    h,
    `  function estadoParaPublicar() {`,
    `  /* Cuenta y quita las imágenes que solo existen en esta computadora. */
  function quitarImagenesLocales(valor) {
    let total = 0;
    const limpiar = function (txt) {
      return String(txt)
        .replace(/<img\\b[^>]*?\\bsrc\\s*=\\s*["']?(?:file|blob):[^>]*>/gi, function () { total++; return ''; })
        .replace(/<img\\b[^>]*?\\bdata-src\\s*=\\s*["']?(?:file|blob):[^>]*>/gi, function () { total++; return ''; });
    };
    const visitar = function (v) {
      if (typeof v === 'string') return limpiar(v);
      if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) v[i] = visitar(v[i]); return v; }
      if (v && typeof v === 'object') { Object.keys(v).forEach(function (k) { v[k] = visitar(v[k]); }); }
      return v;
    };
    visitar(valor);
    return total;
  }

  function estadoParaPublicar() {`,
    'quitar imágenes locales al publicar'
  );

  h = reemplazar(
    h,
    `    const copia = clonar(portalState);
    const seg = copia.seguridad || (copia.seguridad = {});`,
    `    const copia = clonar(portalState);
    const locales = quitarImagenesLocales(copia);
    if (locales) toast('⚠️ Se quitaron ' + locales + ' imagen(es) locales (file://) del contenido: no se pueden publicar. Súbalas con el botón de multimedia del módulo.', 9000);
    const seg = copia.seguridad || (copia.seguridad = {});`,
    'aviso de imágenes locales al publicar'
  );

  /* --- si el archivo es muy grande, se avisa de la otra vía --------------- */
  h = reemplazar(
    h,
    `      if (html.length > 26214400) toast('⚠️ El archivo es muy pesado: suba los audios y videos como enlaces (Drive, YouTube) para aligerarlo');`,
    `      if (html.length > 5242880) toast('⚠️ El archivo pesa más de 5 MB: algunos navegadores rechazan esas descargas. Pulse «🚀 Publicar ahora» (un clic, sin límite de tamaño).', 9000);
      if (html.length > 26214400) toast('⚠️ El archivo es muy pesado: suba los audios y videos como enlaces (Drive, YouTube) para aligerarlo');`,
    'aviso de archivo pesado en la descarga'
  );

  /* --- la ayuda del CMS explica el botón nuevo -------------------------- */
  h = reemplazar(
    h,
    `<b>Para publicarlos en internet:</b> pulse <b>🚀 Descargar HTML publicado</b>, obtendrá un archivo <b>index.html</b> con todo el contenido dentro; súbalo a su hosting (reemplazando el anterior) y sus visitantes verán los cambios.`,
    `<b>Para publicarlos en internet:</b> pulse <b>🚀 Publicar ahora</b>. En un solo clic su contenido se guarda en esta computadora, se sube a GitHub y queda publicado (sin descargar archivos de 30 MB, sin subir nada a mano).<br>Si prefiere el archivo, pulse <b>⬇️ Descargar HTML publicado</b>: obtendrá un <b>index.html</b> con todo su contenido dentro, listo para subirlo a su hosting.`,
    'ayuda de publicación del CMS'
  );

  /* --- al cargar, las imágenes locales (file://) se limpian ---------------- */
  /* Una imagen pegada desde el escritorio (file:///C:/...) solo existe en esa
     computadora: se ve rota y no se puede publicar. Se quita al abrir. */
  h = reemplazar(
    h,
    `    portalState = fusionar(base, guardado);
    const contador = document.getElementById('cmsContadorModulos');`,
    `    portalState = fusionar(base, guardado);
    const locales = quitarImagenesLocales(portalState);
    if (locales) {
      toast('⚠️ Se quitaron ' + locales + ' imagen(es) locales (file://): no se pueden publicar. Súbalas con el botón de multimedia del módulo.', 9000);
      persistirEstadoPortal(false);
    }
    const contador = document.getElementById('cmsContadorModulos');`,
    'limpieza de imágenes locales al cargar'
  );

  /* --- la política de seguridad deja hablar con el servidor local ------- */
  /* Sin esto, el navegador bloquea la petición de «Publicar ahora» cuando el
     CMS se abre desde el sitio publicado (HTTPS) y dice que no se puede
     publicar. Solo se abre la conexión al servidor de esta computadora. */
  h = reemplazar(
    h,
    `connect-src 'self' https: data: blob:;`,
    `connect-src 'self' https: data: blob: http://localhost:8099 http://127.0.0.1:8099;`,
    'política de seguridad: conexión al servidor local'
  );


  /* --- compartir: texto limpio, foto y enlace -------------------------- */
  /* Al compartir, el titular puede venir con formato (editor Word): se
     manda el texto limpio, nunca las etiquetas. Y las etiquetas Open Graph
     se escriben en las que existen, para que la vista previa del enlace
     (WhatsApp, X, Facebook) muestre la foto, el título y el enlace. */
  h = reemplazar(
    h,
    `    const titulo = (portalState.hero && portalState.hero.titulo) || s.ogTitulo || '';`,
    `    /* El titular puede venir con formato (editor Word): para compartir va
       el texto limpio, nunca las etiquetas. */
    const titulo = aTextoPlano((portalState.hero && portalState.hero.titulo) || s.ogTitulo || '');`,
    'el titular del hero se comparte en texto plano'
  );

  h = reemplazar(
    h,
    `    metaContenido('ogTagTitulo', s.ogTitulo);
    metaContenido('ogTagDesc', s.ogDesc);`,
    `    metaContenido('ogTagTitulo', aTextoPlano(s.ogTitulo));
    metaContenido('ogTagDesc', aTextoPlano(s.ogDesc));`,
    'las etiquetas og:title y og:description en texto plano'
  );

  h = reemplazar(
    h,
    `    metaContenido('twTagTitulo', s.twTitulo);
    metaContenido('twTagDesc', s.twDesc);`,
    `    metaContenido('twTagTitulo', aTextoPlano(s.twTitulo));
    metaContenido('twTagDesc', aTextoPlano(s.twDesc));`,
    'las etiquetas twitter:* en texto plano'
  );

  h = reemplazar(
    h,
    `    if (titulo) { metaContenido('ogTagTitle', titulo); metaContenido('twitterTagTitle', titulo); }
    if (desc) { metaContenido('ogTagDesc', desc); metaContenido('twitterTagDesc', desc); }
    if (img) { metaContenido('ogTagImagen', img); metaContenido('twitterTagImagen', img); }`,
    `    /* OJO: los nombres de las etiquetas. Antes se escribía en
       'ogTagTitle' y 'twitterTagTitle', que no existen, y por eso la vista
       previa del enlace nunca se actualizaba. */
    if (titulo) { metaContenido('ogTagTitulo', titulo); metaContenido('twTagTitulo', titulo); }
    if (desc) { metaContenido('ogTagDesc', desc); metaContenido('twTagDesc', desc); }
    if (img) { metaContenido('ogTagImagen', img); metaContenido('ogTagImagenSegura', img); metaContenido('twTagImagen', img); }`,
    'las etiquetas Open Graph se escriben en las que existen'
  );

  h = reemplazar(
    h,
    `    const img = urlDestacada(d);
    const titulo = aTextoPlano((d && d.titulo) || (portalState.seo && portalState.seo.ogTitulo) || '');`,
    `    const img = imagenParaVistaPrevia(d);
    const titulo = aTextoPlano((d && d.titulo) || (portalState.seo && portalState.seo.ogTitulo) || '');`,
    'la foto de la vista previa es una dirección web'
  );

  h = reemplazar(
    h,
    `  /* Imagen destacada del contenido que se comparte (con respaldo general). */
  function imagenDeFicha(d) {
    return urlDestacada(d) || (portalState.seo && portalState.seo.ogImagen) || '';
  }`,
    `  /* Imagen destacada del contenido que se comparte (con respaldo general). */
  function imagenDeFicha(d) {
    return urlDestacada(d) || (portalState.seo && portalState.seo.ogImagen) || '';
  }

  /* Foto para la vista previa del enlace (WhatsApp, X, Facebook, Telegram).
     Esos sitios solo enseñan la foto si la dirección es una dirección web
     (https://...); una imagen incrustada (data:) no se ve. Si la nota no
     tiene una foto publicada, se usa la del diario. */
  function imagenParaVistaPrevia(d) {
    const propia = urlDestacada(d);
    if (propia && /^https?:\\/\\//i.test(propia)) return propia;
    const general = String((portalState.seo && portalState.seo.ogImagen) || '');
    return /^https?:\\/\\//i.test(general) ? general : '';
  }`,
    'imagenParaVistaPrevia (foto web para la vista previa)'
  );


  h = reemplazar(
    h,
    `          '<b class="cp-titulo">' + esc(titulo) + '</b>' +`,
    `          '<b class="cp-titulo">' + esc(aTextoPlano(titulo)) + '</b>' +`,
    'la hoja de compartir muestra el título limpio'
  );

  h = reemplazar(
    h,
    `          '<span class="cp-desc">' + esc(String(fichaActual.sub || fichaActual.texto || '').slice(0, 160)) + '</span>' +`,
    `          '<span class="cp-desc">' + esc(aTextoPlano(String(fichaActual.sub || fichaActual.texto || '')).slice(0, 160)) + '</span>' +`,
    'la hoja de compartir muestra la entrada limpia'
  );

  h = reemplazar(
    h,
    `    setTxt('qrModalSubtitulo', 'Escanea para leer: ' + (tema || portalState.hero.titulo));`,
    `    setTxt('qrModalSubtitulo', 'Escanea para leer: ' + aTextoPlano(tema || portalState.hero.titulo));`,
    'el subtítulo del QR en texto plano'
  );

  h = reemplazar(
    h,
    `    const texto = '«' + m.texto + '» — ' + (m.autor || 'Fanático') + ' en El Paredón del Fanático · La Taberna del Magallanes News';`,
    `    const texto = '«' + aTextoPlano(m.texto) + '» — ' + (m.autor || 'Fanático') + ' en El Paredón del Fanático · La Taberna del Magallanes News';`,
    'el mensaje del Paredón en texto plano'
  );

  h = reemplazar(
    h,
    `    const cuerpo = textoParaCompartir(d, true);`,
    `    /* En las redes solo van el texto y el enlace: la foto sale en la vista
       previa del enlace, no como una línea larguísima con su dirección. */
    const cuerpo = textoParaCompartir(d, red === 'copiar');`,
    'el mensaje a las redes lleva texto y enlace (la foto va en la vista previa)'
  );
  /* --- la imagen de Twitter tiene que ser una dirección web ---------------- */
  /* Si la imagen del diario está incrustada (data:) no se puede leer desde
     fuera, así que se usa la de Open Graph, que sí es una dirección web. */
  h = reemplazar(
    h,
    `    metaContenido('twTagImagen', s.twImagen);`,
    `    metaContenido('twTagImagen', /^https?:\\/\\//i.test(String(s.twImagen || '')) ? s.twImagen : s.ogImagen);`,
    'la imagen de Twitter es una dirección web'
  );

  /* --- ?cms=1 abre el CMS si el equipo ya está autorizado -------------- */
  h = reemplazar(
    h,
    `    if (hash && permitidos.indexOf(hash) !== -1) { solicitarAccesoCMS(); return; }
    if (consulta.indexOf('cms=1') !== -1 || consulta.indexOf('redaccion=1') !== -1) solicitarAccesoCMS();`,
    `    if (hash && permitidos.indexOf(hash) !== -1) { abrirAccesoEditorial(); return; }
    if (consulta.indexOf('cms=1') !== -1 || consulta.indexOf('redaccion=1') !== -1) abrirAccesoEditorial();`,
    'abrirAccesoPorURL()'
  );

  /* --- el motor y la interfaz del editor ------------------------------ */
  h = instalarBloque(h, MARCA_EDITOR, MARCA_EDITOR_FIN, EDITOR_JS, '  function construirCMS() {', 'interfaz del editor Word');

  /* --- marcar los campos que usan el editor con formato ---------------- */
  CAMPOS_RICO.forEach(function (campo) {
    const marcado = campo.replace("tipo: 'area'", "tipo: 'area', rico: true");
    if (h.indexOf(marcado) !== -1) return;            // ya estaba marcado
    if (h.indexOf(campo) === -1) throw new Error('No se encontró el campo del esquema: ' + campo);
    h = h.split(campo).join(marcado);
  });

  if (h === original) {
    console.log('· ' + path.basename(archivo) + ': ya estaba actualizado (sin cambios).');
    return false;
  }

  fs.writeFileSync(archivo, h, 'utf8');
  console.log('✓ ' + path.basename(archivo) + ': editor estilo Word instalado (' + h.length.toLocaleString('es-VE') + ' caracteres).');
  return true;
}

/* -------------------------------------------------------------------------- */
/* Ejecución                                                                  */
/* -------------------------------------------------------------------------- */

const raiz = path.resolve(__dirname, '..');
const porDefecto = [
  path.join(raiz, 'editor', 'index.html'),
  path.join(raiz, 'publicar', 'index.html'),
  path.join(raiz, 'index.html')
];

const objetivos = process.argv.slice(2).length ? process.argv.slice(2) : porDefecto;

objetivos.forEach(function (archivo) {
  if (!fs.existsSync(archivo)) {
    console.error('✗ No existe: ' + archivo);
    process.exitCode = 1;
    return;
  }
  try {
    aplicar(archivo);
  } catch (err) {
    console.error('✗ Error al parchear ' + archivo + ': ' + err.message);
    process.exitCode = 1;
  }
});
