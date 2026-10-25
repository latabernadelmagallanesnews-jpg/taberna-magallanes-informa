/* ============================================================================
   DEJA EL HERO PUBLICADO TAMBIÉN EN EL HTML ESTÁTICO
   ----------------------------------------------------------------------------
   La portada se dibuja con JavaScript, pero la primera pintura (y los
   lectores sin JavaScript) ven el marcado que está en el archivo. Si ese
   marcado conserva una foto o un titular de ejemplo, el lector ve una
   noticia que no es la suya mientras carga.

   Este script lee el estado embebido (el contenido publicado de verdad) y
   escribe el titular, la entrada, la foto, el epígrafe, la firma y la
   etiqueta del hero en el marcado estático de publicar/index.html.

   Es idempotente: se puede ejecutar en cada build.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { slugDeHero } = require('./portadas');

const RAIZ = path.resolve(__dirname, '..');
const PORTAL = path.join(RAIZ, 'publicar', 'index.html');

function escaparHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escaparAtributo(s) {
  return escaparHtml(s).replace(/"/g, '&quot;');
}

function decodificar(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); })
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCodePoint(parseInt(n, 10)); })
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function aTextoPlano(valor) {
  return decodificar(String(valor || '')
    .replace(/^\s*␟/, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, ' ')
    .replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function entradaDeHero(h) {
  const cita = aTextoPlano(h.cita);
  const epigrafe = aTextoPlano(h.epigrafe);
  let lead = cita || epigrafe;
  if (!lead) return '';
  if (cita && epigrafe && epigrafe.indexOf(cita) === 0) {
    const resto = epigrafe.slice(cita.length).trim();
    const espacio = 320 - lead.length - 1;
    if (resto && espacio > 40) {
      const extra = resto.slice(0, espacio);
      const punto = Math.max(extra.lastIndexOf('. '), extra.lastIndexOf('? '), extra.lastIndexOf('! '), extra.lastIndexOf('; '));
      const corte = punto >= 80 ? extra.slice(0, punto + 1) : extra.replace(/\s+\S*$/, '').trim();
      if (corte) lead += ' ' + corte;
    }
  }
  if (lead.length > 320) {
    const corte = lead.slice(0, 320);
    const punto = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('? '), corte.lastIndexOf('! '), corte.lastIndexOf('; '));
    lead = punto >= 120 ? corte.slice(0, punto + 1) : corte.replace(/\s+\S*$/, '').trim() + '…';
  }
  return lead;
}

function leerEstado(html) {
  const inicio = html.indexOf('<script type="application/json" id="estadoEmbebido">');
  if (inicio === -1) throw new Error('No se encontró estadoEmbebido en publicar/index.html');
  const desde = inicio + '<script type="application/json" id="estadoEmbebido">'.length;
  const fin = html.indexOf('</script>', desde);
  if (fin === -1) throw new Error('No se pudo cerrar estadoEmbebido');
  return JSON.parse(html.slice(desde, fin));
}

function reemplazarContenido(html, apertura, cierre, valor, etiqueta) {
  const patron = new RegExp('(' + apertura + ')[\\s\\S]*?(' + cierre + ')');
  if (!patron.test(html)) throw new Error('No se encontró el bloque ' + etiqueta);
  return html.replace(patron, function (_, a, b) { return a + valor + b; });
}

function main() {
  let html = fs.readFileSync(PORTAL, 'utf8');
  const estado = leerEstado(html);
  const hero = estado.hero || {};
  const titulo = aTextoPlano(hero.titulo);
  const entrada = entradaDeHero(hero);
  const imagen = String(hero.imagen || '').trim();
  const badge = aTextoPlano(hero.badge);
  const meta = aTextoPlano(hero.meta);
  const autor = aTextoPlano(hero.autor);

  if (!titulo) throw new Error('El hero publicado no tiene titular');

  html = reemplazarContenido(html, '<h2\\b[^>]*\\bid="heroTitulo"[^>]*>', '<\\/h2>', escaparHtml(titulo), 'heroTitulo');
  html = reemplazarContenido(html, '<p\\b[^>]*\\bid="heroEpigrafe"[^>]*>', '<\\/p>', escaparHtml(entrada), 'heroEpigrafe');
  html = reemplazarContenido(html, '<span\\b[^>]*\\bid="heroBadge"[^>]*>', '<\\/span>', escaparHtml(badge), 'heroBadge');
  html = reemplazarContenido(html, '<span\\b[^>]*\\bid="heroMeta"[^>]*>', '<\\/span>', escaparHtml(meta), 'heroMeta');
  html = reemplazarContenido(html, '<span\\b[^>]*\\bid="heroAutor"[^>]*>', '<\\/span>', escaparHtml(autor), 'heroAutor');

  if (imagen) {
    let hallado = false;
    html = html.replace(/<img\b[^>]*\bid="heroImagen"[^>]*>/i, function (tag) {
      hallado = true;
      let nuevo = tag.replace(/\bsrc="[^"]*"/i, 'src="' + escaparAtributo(imagen) + '"');
      nuevo = nuevo.replace(/\balt="[^"]*"/i, 'alt="' + escaparAtributo(titulo) + '"');
      return nuevo;
    });
    if (!hallado) throw new Error('No se encontró la foto del hero');
  }

  /* La llamada «Leer la crónica completa» apunta a la página PERMANENTE de
     esta portada (notas/<slug>.html): la misma que guarda la hemeroteca. */
  const slug = slugDeHero(hero);
  html = html.replace(/(<a\b[^>]*\bid="heroLeerMas"[^>]*\bhref=")[^"]*(")/i,
    '$1notas/' + slug + '.html$2');

  fs.writeFileSync(PORTAL, html, 'utf8');
  console.log('✓ publicar/index.html: hero estático sincronizado con la nota publicada.');
  console.log('  Titular: ' + titulo.slice(0, 90) + (titulo.length > 90 ? '…' : ''));
  console.log('  Foto: ' + (imagen || '(sin foto)'));
}

main();
