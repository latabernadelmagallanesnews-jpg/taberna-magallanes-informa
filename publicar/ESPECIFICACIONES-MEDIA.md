# Especificaciones de multimedia · La Taberna del Magallanes News

Guía de formatos, tamaños y medidas para las fotos, banners, videos y audios
del portal. Todo se sube o se pega desde el **CMS**, en cualquier módulo.

---

## 1 · Formatos que acepta el portal

| Tipo | Formatos | Extensiones |
| --- | --- | --- |
| 🖼️ **Imagen** | JPG, PNG, WebP, GIF, AVIF | `.jpg` `.jpeg` `.png` `.webp` `.gif` `.avif` `.bmp` |
| 🎵 **Audio / MP3** | MP3, M4A, WAV, OGG, OGA, AAC, FLAC, OPUS, WMA, AIFF | `.mp3` `.m4a` `.wav` `.ogg` `.oga` `.aac` `.flac` `.opus` `.wma` `.aif` `.aiff` |
| 🎬 **Video** | MP4, WebM, MOV, MKV, AVI, M4V | `.mp4` `.webm` `.mov` `.mkv` `.avi` `.m4v` |
| 📄 **Documento** | PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP | `.pdf` `.doc` `.docx` `.xls` `.xlsx` `.ppt` `.pptx` `.txt` `.csv` `.zip` |

**Además de subir el archivo**, puede pegar un **enlace**: YouTube, Vimeo,
Google Drive, Dropbox, OneDrive o cualquier URL directa.

- **Google Drive**: el portal convierte solo el enlace a la miniatura
  (`sz=w1600`) y al archivo original.
- **YouTube / Vimeo**: se incrustan con su reproductor, sin subir el video.

### Peso

| | |
| --- | --- |
| Aviso del portal | a partir de **45 MB** avisa que conviene aligerar |
| Recomendado | **imágenes bajo 1 MB**, audios bajo 10 MB, videos por **enlace** |
| GitHub Pages | 100 MB por archivo · 1 GB por repositorio |
| Firebase Hosting | 10 GB de almacenamiento · 1 GB por archivo |

> Si incrusta muchos videos o audios, **súbalos por enlace** (YouTube, Drive):
> el `index.html` se mantiene ligero y la web carga rápido.

---

## 2 · Medidas recomendadas de las imágenes

El portal recorta con `object-fit: cover`: la imagen **se ajusta al marco
(recorta el sobrante)**, así que lo que importa es la **relación de aspecto**.

| Espacio | Medida en pantalla | Relación | **Recomendado** | Peso |
| --- | --- | --- | --- | --- |
| 🏷️ **Banner Tier 1** (publicidad principal) | 1200 × 260 px | panorámico | **1200 × 260 px** | < 300 KB |
| 🛡️ **Banner Tier 2** (publicidad secundaria) | 1200 × 260 px | panorámico | **1200 × 260 px** | < 300 KB |
| 📰 **Portada / Hero** | 1200 × 540 px (máx. 480 alto) | 2.2:1 | **1200 × 540 px** | < 500 KB |
| 📰 **Banner nativo Tier 3** | 84 × 64 px (miniatura) | 1.3:1 | **400 × 260 px** | < 100 KB |
| ✍️ **Foto de crónica** (muro) | ancho × 230 px (190 en móvil) | 5:1 panorámico | **1200 × 540 px** | < 400 KB |
| 📄 **Flyer** (galería de la Cabina) | ancho × 140 px | 3:1 | **1200 × 400 px** | < 250 KB |
| 📊 **Infografía** | ancho × 200 px | 1.8:1 | **900 × 500 px** | < 300 KB |
| 😂 **Meme** (Rincón Filibustero) | ancho × 200 px | 1.8:1 | **900 × 500 px** | < 300 KB |
| 📱 **Historia** (estilo Instagram) | 460 × 800 px (86 % del alto) | **9:16 vertical** | **1080 × 1920 px** | < 800 KB |
| 🔵 **Miniatura de historia** | 62 × 62 px (círculo) | 1:1 | **400 × 400 px** | < 80 KB |
| ⚾ **Foto de jugador** (roster) | ficha del jugador | 1:1 o 4:5 | **800 × 1000 px** | < 300 KB |
| 🎯 **Logo del masthead** | alto 84 px (configurable) | horizontal | **400 × 84 px** (PNG con fondo transparente) | < 100 KB |
| 📷 **Fotos del Heatmap** (módulo 08) | ficha con zoom | libre | **1200 × 800 px** | < 400 KB |

### Tips para que las fotos se vean bien

- **Banners:** texto y logo dentro de la zona central; el portal les pone un
  degradado oscuro abajo, así que **no ponga texto en el tercio inferior**.
- **Portada:** la imagen se recorta a 480 px de alto como máximo; en móvil se
  ve más alta, así que deje el sujeto en el centro.
- **Fotos de crónica:** son panorámicas. Una foto vertical se recorta mucho.
- **Historias:** vertical 9:16, como en Instagram. El texto de la historia
  aparece en la parte baja, sobre un degradado.
- **Logo:** PNG con fondo transparente; si no, el fondo del logo se verá como
  un rectángulo sobre la cabecera.

---

## 3 · Videos y audios

| | Formato | Peso | Cómo se ve |
| --- | --- | --- | --- |
| 🎬 **Video en línea** (crónicas, flyers, galería) | MP4 (H.264) o WebM | por enlace, ideal | reproductor con controles, se abre en ficha |
| 📺 **YouTube / Vimeo** | enlace | 0 KB | se incrusta con su reproductor |
| 🎵 **MP3 de cabina / pódcast / playlist** | MP3 o M4A | < 10 MB | reproductor con `preload="metadata"` (carga rápido) |

- **MP4 es el más compatible**: funciona en iPhone, Android y en cualquier
  navegador. Use **H.264 + AAC**.
- Los audios se cargan con `preload="metadata"`: el lector ve la duración y
  el nombre **sin descargar todo el archivo**.
- Cada flyer, crónica, módulo y pódcast puede llevar **su propio MP3**.

---

## 4 · Dónde se coloca cada cosa

| Módulo | Campo de imagen | Campo de video | Campo de audio |
| --- | --- | --- | --- |
| 01 Cabecera | logo del masthead | — | — |
| 03 WhatsApp | — | — | — |
| 04 / 14 / 19 Publicidad | banner Tier 1 / 2 / 3 | — | MP3 del patrocinante |
| 05 Portada | foto de portada | — | audio de portada |
| 06 Crónicas | foto de cada crónica | video de la nota | MP3 de la crónica |
| 07 Cabina VIP | flyers de la galería | video del flyer | MP3 de cada flyer |
| 08 Heatmap | fotos del módulo | video | MP3 del análisis |
| 10 Roster | foto de cada jugador | — | — |
| 11 Carruseles | flyers publicitarios | video | MP3 del flyer |
| 12 Hilos | imagen de la jugada | video de la jugada | — |
| 13 Redes | imagen de cada publicación | enlace incrustado | — |
| 17 Círculo VIP | imagen de beneficios | — | MP3 del club |
| 21 Historias | imagen o video vertical | video 9:16 | audio del relato |

Además, **todos** los módulos tienen un **Centro multimedia** para cargar
imágenes, MP3, videos y PDF en lote (subir varios a la vez o arrastrar y
soltar).

---

## 5 · Cómo subir

1. **CMS → el módulo que quiere → el campo de imagen** (🖼️).
2. **Subir**: pulse el botón y elija el archivo del computador o del celular.
3. **Pegar enlace**: pegue la URL de Drive, YouTube, Dropbox, etc.
4. **Arrastrar y soltar**: arrastre el archivo hasta el recuadro.
5. Verifique la **vista previa** y el peso antes de guardar.

Todo se guarda cifrado dentro del HTML y se publica con el resto del portal.

---

## 6 · Rendimiento

- Use **WebP** para las fotos: pesa la mitad que un JPG con la misma calidad.
- El portal ya sirve las imágenes con **carga diferida** (`loading="lazy"`):
  no ralentiza la primera pantalla.
- Para imágenes externas (Unsplash, etc.) puede pedir el tamaño exacto
  adding `?w=1200&h=540&fit=crop` a la URL: se descargan solo los píxeles
  que se usan, no el original.
- **Una sola foto para todos los tamaños** es suficiente: el portal recorta.
