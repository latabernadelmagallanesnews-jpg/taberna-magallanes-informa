/* ============================================================================
   PORTADAS DEL DIARIO · utilidades compartidas
   ----------------------------------------------------------------------------
   La nota principal de la portada (el «hero») tiene una dirección propia que
   no cambia: notas/<slug>.html. Estas funciones calculan esa dirección igual
   en el build (generar-notas-estaticas.js) y en el archivo de la hemeroteca,
   para que la tapa de hoy siga viva cuando llegue la tapa de mañana.
   ============================================================================ */
'use strict';

const MARCA = '\u241F';

/* El texto del CMS puede venir con formato (editor Word). Para títulos,
   direcciones y descripciones se usa siempre el texto limpio. */
function textoPlano(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(new RegExp(MARCA, 'g'), '')
    /* Las etiquetas se cambian por un espacio, no se borran: si no, dos
       titulares seguidos (<h2>…</h2><h2>…</h2>) quedan pegados. */
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/* Una dirección legible y estable: sin acentos, minúsculas y guiones. */
function slugDeTexto(texto, maximo) {
  const limpio = textoPlano(texto)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return limpio.slice(0, maximo || 90).replace(/-+$/g, '') || '';
}

/* El slug de la portada: si el Director escribió «Slug: …» en los metadatos
   del hero, manda ese; si no, se arma con el titular. */
function slugDeHero(hero) {
  const h = hero || {};
  const declarado = String(h.meta || '').match(/slug\s*:\s*([a-z0-9][a-z0-9_-]*)/i);
  if (declarado) return declarado[1].toLowerCase();
  return slugDeTexto(h.titulo || '', 90) || 'portada';
}

/* La descripción para buscadores y redes: la que escribió el Director en los
   metadatos («Meta description: …») o, si no hay, la entrada de la nota. */
function descripcionDeHero(hero) {
  const h = hero || {};
  const declarada = String(h.meta || '').match(/meta\s*description\s*:\s*([\s\S]+)$/i);
  if (declarada) return textoPlano(declarada[1]);
  return textoPlano(h.cita || h.epigrafe || '');
}

module.exports = { textoPlano, slugDeTexto, slugDeHero, descripcionDeHero };
