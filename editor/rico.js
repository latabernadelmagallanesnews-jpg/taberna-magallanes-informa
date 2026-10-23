/* ============================================================================
   LA TABERNA DEL MAGALLANES NEWS · LECTURA DE CONTENIDO CON FORMATO
   ----------------------------------------------------------------------------
   Las páginas sueltas (buscador, crónicas, roster y Círculo VIP) leen el
   contenido de data.json. Ese archivo guarda los textos con formato tal como
   los publica el portal, con una marca invisible al principio (␟).

   Este archivo traduce ese contenido:

     · ricoTexto(v)  -> texto plano, para buscar, compartir y leer en voz alta.
     · ricoHtml(v)   -> HTML limpio, para mostrarlo CON su formato (negrita,
                        títulos, listas, citas, colores...).

   El HTML que llega aquí ya viene saneado por el portal; esto es una segunda
   capa de seguridad por si algún dato llegara manipulado.
   ============================================================================ */
(function (global) {
  'use strict';

  var MARCA = '\u241F';

  function esRico(v) {
    return typeof v === 'string' && v.charAt(0) === MARCA;
  }

  function escapar(t) {
    return String(t === undefined || t === null ? '' : t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Texto plano: para el buscador, para compartir y para los atributos alt. */
  function ricoTexto(v) {
    if (v === undefined || v === null) return '';
    var s = String(v);
    if (!esRico(s)) return s;
    var d = document.createElement('div');
    d.innerHTML = s.slice(1);
    /* Separa los bloques: si no, <h2>uno</h2><h2>dos</h2> queda «unodos». */
    Array.prototype.slice.call(d.querySelectorAll('br')).forEach(function (br) {
      if (br.parentNode) br.parentNode.replaceChild(document.createTextNode(' '), br);
    });
    Array.prototype.slice.call(d.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,blockquote,pre,tr,td,th')).forEach(function (b) {
      b.appendChild(document.createTextNode(' '));
    });
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /* HTML con formato: para mostrar el texto tal como lo escribió la redacción. */
  function ricoHtml(v) {
    if (v === undefined || v === null) return '';
    var s = String(v);
    if (!esRico(s)) return escapar(s);
    var d = document.createElement('div');
    d.innerHTML = s.slice(1);
    Array.prototype.slice.call(d.querySelectorAll('script,style,iframe,object,embed,link,meta,base,form,input,button')).forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    Array.prototype.slice.call(d.querySelectorAll('*')).forEach(function (n) {
      Array.prototype.slice.call(n.attributes || []).forEach(function (a) {
        var nombre = String(a.name || '').toLowerCase();
        var valor = String(a.value || '');
        if (nombre.indexOf('on') === 0) { n.removeAttribute(a.name); return; }
        if ((nombre === 'href' || nombre === 'src') && /^\s*(javascript|vbscript|data:text\/html)/i.test(valor)) {
          n.removeAttribute(a.name);
        }
      });
    });
    return d.innerHTML;
  }

  /* TikTok: el enlace natural del video, para incrustarlo. */
  function idTikTok(v) {
    var s = String(v || '');
    var m = /tiktok\.com\/(?:.*\/)?video\/(\d+)/i.exec(s);
    if (m) return m[1];
    m = /tiktok\.com\/embed\/v2\/(\d+)/i.exec(s);
    return m ? m[1] : '';
  }

  global.ricoEsRico = esRico;
  global.idTikTok = idTikTok;
  global.ricoTexto = ricoTexto;
  global.ricoHtml = ricoHtml;
})(window);
