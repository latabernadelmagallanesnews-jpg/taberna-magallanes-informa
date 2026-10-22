/* ============================================================================
  OPTIMIZADOR SEO PARA EL CMS
  ----------------------------------------------------------------------------
  Analiza cada nota del portal y genera un reporte de SEO con puntuación y
  recomendaciones para mejorar el posicionamiento en buscadores.

  Uso:  node scripts/optimizador-seo.js
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PUBLICAR = path.join(RAIZ, 'publicar');
const RE = /<script type="application\/json" id="estadoEmbebido">([\s\S]*?)<\/script>/;

function leerEstado() {
  const h = fs.readFileSync(path.join(PUBLICAR, 'index.html'), 'utf8');
  const m = h.match(RE);
  return m ? JSON.parse(m[1]) : { cronicas: [], galerias: {} };
}

function sinFormato(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/\u241F/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function analizarNota(c) {
  const titulo = sinFormato(c.titulo);
  const entrada = sinFormato(c.entradilla || c.subtitulo || '');
  const cuerpo = sinFormato(c.cuerpo || '');
  const imagen = c.imagen || '';
  const fecha = sinFormato(c.fecha || '');
  const autor = sinFormato(c.autor || '');

  const problemas = [];
  const recomendaciones = [];
  let puntaje = 100;

  /* Título */
  if (!titulo) {
    problemas.push('Falta el titular de la nota');
    puntaje -= 25;
  } else {
    if (titulo.length < 30) {
      problemas.push('El titular es muy corto (' + titulo.length + ' caracteres). Se recomiendan 30-60.');
      puntaje -= 10;
    }
    if (titulo.length > 70) {
      problemas.push('El titular es muy largo (' + titulo.length + ' caracteres). Se recomiendan máximo 70.');
      puntaje -= 10;
    }
    if (!/[a-zA-Záéíóúñ]/i.test(titulo)) {
      problemas.push('El titular no contiene letras legibles.');
      puntaje -= 15;
    }
  }

  /* Entrada/Subtítulo */
  if (!entrada) {
    problemas.push('Falta la entrada o subtítulo de la nota');
    puntaje -= 20;
  } else {
    if (entrada.length < 50) {
      problemas.push('La entrada es muy corta (' + entrada.length + ' caracteres). Se recomiendan 50-160.');
      puntaje -= 10;
    }
    if (entrada.length > 160) {
      problemas.push('La entrada es muy larga (' + entrada.length + ' caracteres). Se recomiendan máximo 160.');
      puntaje -= 5;
    }
  }

  /* Imagen destacada */
  if (!imagen) {
    problemas.push('Falta la imagen destacada de la nota');
    puntaje -= 15;
  }

  /* Cuerpo */
  if (!cuerpo) {
    problemas.push('Falta el cuerpo de la nota');
    puntaje -= 20;
  } else if (cuerpo.length < 200) {
    problemas.push('El cuerpo es muy corto (' + cuerpo.length + ' caracteres). Se recomiendan al menos 200.');
    puntaje -= 10;
  }

  /* Fecha */
  if (!fecha) {
    problemas.push('Falta la fecha de publicación');
    puntaje -= 10;
  }

  /* Autor */
  if (!autor || autor === 'Redacción') {
    problemas.push('Falta el autor de la nota');
    puntaje -= 5;
  }

  if (puntaje < 0) puntaje = 0;

  return {
    id: c.id,
    titulo: titulo || '(sin título)',
    puntaje,
    problemas,
    recomendaciones,
    tieneImagen: !!imagen,
    tieneCuerpo: !!cuerpo,
    longitudTitulo: titulo.length,
    longitudEntrada: entrada.length,
    longitudCuerpo: cuerpo.length
  };
}

function analizarTodo() {
  const estado = leerEstado();
  const cronicas = (estado.cronicas || []).filter(c => c && c.id);
  const resultados = cronicas.map(c => analizarNota(c));

  resultados.sort((a, b) => a.puntaje - b.puntaje);

  console.log('==================================================================');
  console.log('  AUDITORÍA SEO - LA TABERNA DEL MAGALLANES NEWS');
  console.log('==================================================================\n');

  const total = resultados.length;
  const promedio = total > 0 ? Math.round(resultados.reduce((s, r) => s + r.puntaje, 0) / total) : 0;
  const malas = resultados.filter(r => r.puntaje < 50).length;
  const buenas = resultados.filter(r => r.puntaje >= 80).length;

  console.log('Total de notas analizadas:', total);
  console.log('Puntaje promedio:', promedio + '/100');
  console.log('Notas con puntaje bajo (<50):', malas);
  console.log('Notas con puntaje bueno (>=80):', buenas);
  console.log('');

  resultados.forEach(function (r) {
    const emoji = r.puntaje >= 80 ? '✅' : r.puntaje >= 50 ? '⚠️' : '❌';
    console.log(emoji + ' [' + r.puntaje + '/100] ' + r.titulo);
    if (r.problemas.length > 0) {
      r.problemas.forEach(function (p) { console.log('      • ' + p); });
    }
    console.log('');
  });

  console.log('==================================================================');
  console.log('  RECOMENDACIONES GENERALES');
  console.log('==================================================================\n');

  if (promedio < 60) {
    console.log('• El portal tiene problemas generales de SEO. Prioriza:');
    console.log('    - Agregar títulos descriptivos a todas las notas');
    console.log('    - Escribir entradas de 50-160 caracteres');
    console.log('    - Agregar imagen destacada a cada nota');
    console.log('    - Incluir fecha y autor en cada nota');
  } else if (promedio < 80) {
    console.log('• El portal está bien, pero puede mejorar:');
    console.log('    - Revisar las notas con puntaje bajo');
    console.log('    - Asegurar que todas las notas tengan imagen y fecha');
  } else {
    console.log('• ¡Excelente! El portal tiene un buen SEO base.');
    console.log('    - Mantén la calidad en las nuevas notas');
  }

  console.log('');
  console.log('Para mejorar el posicionamiento en Google:');
  console.log('  1. Publica contenido nuevo regularmente (al menos 1 nota por semana)');
  console.log('  2. Usa palabras clave relevantes en titulares y entradas');
  console.log('  3. Comparte en redes sociales para generar tráfico inicial');
  console.log('  4. Asegura que las imágenes tengan nombres descriptivos');
  console.log('');
}

analizarTodo();
