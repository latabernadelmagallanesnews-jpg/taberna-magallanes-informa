# La Taberna del Magallanes News

Gaceta sabermétrica & LVBP, lista para publicar. **No necesita instalación, base
de datos ni servidor especial**: son archivos estáticos que funcionan en
GitHub Pages, Netlify, Cloudflare, Vercel o cualquier hosting.

---

## 1. Qué hay en este paquete

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | **El portal completo.** Portada, crónicas, minuto a minuto, Cabina VIP, heatmap, roster, tabla, carruseles, multimedia, radio, Círculo VIP, **El Paredón del Fanático** y todo el CMS. |
| `redaccion-cms.html` | Puerta privada del equipo: abre el portal en modo redacción y pide su clave. |
| `buscador.html` | Buscador general: crónicas, jugadas, roster, posiciones, playlist y El Paredón. |
| `cronica.html` | Muro de crónicas sabermétricas (lectura larga, se despliegan en la misma página). |
| `roster.html` | Roster filtrable + tabla de posiciones con los cupos resaltados. |
| `vip.html` | Registro de la membresía VIP. Al terminar lleva a WhatsApp del director y desbloquea la Cabina. |
| `404.html` | Página de error elegante (GitHub Pages la usa automáticamente). |
| `data.json` | Contenido del portal en texto plano: lo leen `buscador`, `cronica`, `roster` y `vip`. |
| `rico.js` | Lector de contenido con formato: muestra en esas páginas los textos con el formato del editor Word. |
| `robots.txt` | Aviso para los buscadores. |
| `.nojekyll` | Necesario en GitHub Pages para que no filtre archivos. |
| `README.md` | Este instructivo. |

**El motor del portal vive completo dentro de `index.html`.** Las otras páginas
son pantallas independientes del mismo diario: todas apuntan a `index.html`.

---

## 2. Publicar gratis en GitHub Pages (paso a paso)

> **Alternativa recomendada: Firebase Hosting.** Si su repositorio GitHub trae
> los archivos de este paquete y la carpeta `firebase.json` con
> `"public": "publicar"`, la publicación es un solo comando:
>
> ```
> firebase login
> firebase deploy --only hosting
> ```
>
> El portal queda en `https://la-taberna-del-magallanes-news.web.app`.
> Vea el `README.md` de la raíz del repositorio para el detalle completo.

1. Cree una cuenta en <https://github.com> y verifique su correo.
2. **New repository** → nombre `taberna-magallanes` → **Public** →
   marque *Add a README file* → **Create repository**.
3. **Add file → Upload files** y arrastre **todos** los archivos de esta
   carpeta: `index.html`, `redaccion-cms.html`, `buscador.html`,
   `cronica.html`, `roster.html`, `vip.html`, `404.html`, `data.json`,
   `rico.js`, `robots.txt`, `.nojekyll` → **Commit changes**.
   - Todo debe quedar **en la raíz** del repositorio, no dentro de una carpeta.
   - `.nojekyll` empieza con punto: si su explorador no lo muestra, actívelo.
4. **Settings → Pages** → *Source*: **Deploy from a branch** →
   *Branch*: **main** → carpeta **/ (root)** → **Save**.
5. Espere 1–2 minutos. Su diario queda en:

   ```
   https://SU-USUARIO.github.io/taberna-magallanes/
   ```

   - La puerta privada queda en `.../redaccion-cms.html`
   - El buscador en `.../buscador.html`

### Actualizar el contenido

1. Abra el CMS (`redaccion-cms.html`, `?cms=1` o su puerta `⚙️ Abrir CMS`).
2. Edite lo que quiera.
3. Pulse **🚀 Descargar HTML publicado**: le genera un `index.html` con todo
   el contenido incrustado.
4. En GitHub: **Add file → Upload files** y sobrescriba `index.html` →
   **Commit changes**. Luego abra el enlace con `Ctrl+F5`.

### Otras opciones sin cuenta

- **Netlify Drop** — <https://app.netlify.com/drop> (arrastre el `.zip`)
- **Cloudflare Pages** — <https://pages.cloudflare.com>
- **Vercel** — <https://vercel.com/new>

---

## 3. Acceso al CMS (privado)

| Archivo | Puerta de acceso `🔒` |
| --- | --- |
| **Su copia de trabajo** (el `index.html` de su computadora) | **Sí se ve** — un clic + su clave y entra |
| **El HTML publicado** (botón 🚀 y el de este paquete) | **No se ve** — los lectores no ven ninguna puerta |

Los dispositivos de la redacción que ya introdujeron su clave quedan
**autorizados y recordados hasta 180 días**: ven `⚙️ Abrir CMS` y no les vuelve
a pedir la clave. Para desautorizar: *CMS → Seguridad → 🚪 Cerrar sesión*.

### Entrar desde un dispositivo nuevo

Cualquiera de estas abre el pedido de clave:

1. `?cms=1` al final de la dirección — ej. `https://su-sitio.com/?cms=1`
   → **recomendado: guárdelo en Favoritos.**
2. `#sala-de-redaccion` al final de la dirección.
3. Teclado: `Ctrl + Alt + M`.
4. **5 toques seguidos** sobre el título *La Taberna del Magallanes News*.
5. La página `redaccion-cms.html`.

### Sus claves (privadas, cifradas)

Las claves **no están escritas en ningún archivo visible**: se guardan cifradas
(SHA-256) dentro del portal. El Director entrega cada código **en privado** y
puede cambiarlos en *CMS → Seguridad & Accesos*.

### Autorizar periodistas (solo el Director)

1. Entre como Director → *CMS → Seguridad & Accesos* →
   **👥 Periodistas autorizados**.
2. Escriba el **nombre** del periodista, invente su **código personal**
   (mínimo 6 caracteres) y pulse **✅ Autorizar periodista**.
3. Entréguele el código **en privado** (su WhatsApp personal, no por un grupo)
   y dígale que entre con `?cms=1`.
4. Pulse **🚀 Descargar HTML publicado** y suba el archivo: desde ese momento el
   código funciona en el sitio público.
5. Para retirar el acceso: **Revocar** (puede reactivarlo después) o **Quitar**.
   Vuelva a publicar el HTML para que el cambio surta efecto.

Con **🔐 Modo seguro** activado, la clave genérica de periodista queda
desactivada: **solo** entran su clave de Director y los códigos personales de la
lista.

### Nota de seguridad honesta

El portal es un archivo estático: la clave protege el **panel de edición** y
las puertas de acceso, pero no impide que alguien curioso lea el código fuente
de la página. Lo que un lector **nunca** puede hacer es cambiar lo que ven los
demás: sus ediciones solo llegan al público cuando usted descarga el HTML
publicado y lo sube al hosting.

Para blindaje total, suba su copia de trabajo (con CMS) a una **carpeta
protegida con contraseña** del servidor y deje en la raíz pública solo el
`index.html` ya publicado:

```
/public_html/index.html             ← el portal que ve el público
/public_html/redaccion/index.html   ← copia de trabajo (protegida)
```

---

## 4. Contenido y módulos

- **21 módulos editoriales**, todos editables desde el CMS (**31 paneles**).
- **Área de trabajo estilo Word.** Los 36 campos de contenido largo se escriben
  en un editor con formato (negrita, cursiva, títulos, listas, alineación,
  colores, enlaces e imágenes), igual que en Microsoft Word. El portal se
  actualiza mientras se escribe y el formato se publica tal cual. Cada campo
  trae contador de palabras, vista previa y un botón para volver a texto
  simple.
- Carga multimedia (imagen, audio, video, PDF) en **todos** los módulos, desde
  PC o teléfono: subir, arrastrar y soltar, o pegar enlace (Drive, YouTube…).
- Cada módulo con **Ficha, Compartir, Comentar y reacciones con emojis**.
- **El lector también manda:** sin cuenta ni sesión puede **compartir en sus
  propias redes** (WhatsApp, Facebook, X, Telegram, LinkedIn, correo, copiar
  enlace o el menú del teléfono), **generar el código QR estilo Instagram** y
  **escribir su comentario dentro del módulo**, con filtro de respeto.
- **Muro de noticias (Módulo 06):** se actualiza solo, **tipo carrusel**, con la
  **foto destacada** y la **entrada** de cada nota; debajo aparece el botón
  **«Leer más ▾»** que despliega la nota completa **dentro de su propia
  tarjeta**. Mientras el lector está en una nota, el carrusel se detiene y sigue
  al cerrarla. Cada nota se comparte con su foto y su entrada, y su enlace
  (`#cronica-…`) vuelve a abrir **la misma nota** donde corresponde.
- **Módulo 20 · Chat del Fanático:** botón flotante con chat en vivo, moderado
  y con adjuntos (foto, nota de voz, video o PDF). Solo se abre cuando el
  Director lo **autoriza** (ideal durante las transmisiones en vivo); mientras
  tanto muestra el aviso y el enlace al grupo general de WhatsApp.
- **Módulo 21 · Historias del Magallanes (estilo Instagram):** fila de historias
  con anillo de color, visor a pantalla completa con barras de progreso, flechas
  y teclado, reacciones, comentarios, compartir y QR. Aparecen en la portada, en
  la sección EN VIVO y junto a El Paredón; se editan desde el CMS.
- Módulo 13: publicaciones incrustadas de YouTube, Instagram, X, TikTok,
  Facebook, Vimeo y Spotify, con su caja de comentarios y su botón de compartir.
- Círculo VIP: la Cabina Statcast, el Heatmap y la Radio solo se muestran a los
  suscriptores registrados.
- **Módulo 18 · El Paredón del Fanático:** el muro abierto de la afición, con
  filtro automático de groserías e improperios (detecta mayúsculas, acentos,
  números y letras repetidas), reacciones, compartir y moderación previa
  opcional desde el CMS.

---

## 5. Los dos grupos de WhatsApp

El portal maneja **dos destinos distintos**, y ambos se editan desde el CMS:

| Grupo | Quién entra | Dónde se configura |
| --- | --- | --- |
| **Grupo General** | Cualquier lector | *CMS → Módulo 03 · WhatsApp → Enlace del GRUPO GENERAL* |
| **Grupo VIP privado** | Solo suscriptores registrados | *CMS → Módulo 17 · Círculo VIP → Enlace del GRUPO VIP PRIVADO* |

- El enlace del **grupo general** aparece en el banner superior, en la franja de
  El Paredón, en el módulo VIP y en el pie de página.
- El enlace del **grupo VIP** solo se revela **después** de completar el
  registro (`vip.html` o el formulario del portal) y, si lo prefiere, se puede
  cambiar por *«Solo al teléfono personal»* para invitar usted mismo.
- En WhatsApp active **«Aprobar nuevos participantes»** en el grupo VIP: así
  usted decide quién entra.

---

## 6. Dónde van los banners (estrategia)

Nada invasivo: ningún aviso tapa el texto ni interrumpe la lectura.

| Posición | Módulo | Uso |
| --- | --- | --- |
| Arriba de todo | 04 · Tier 1 | Patrocinante principal, cintillo horizontal |
| Dentro del flujo (tras la portada) | 19 · Patrocinado nativo | Contenido patrocinado discreto, integrado al ritmo de lectura |
| Al centro del portal | 14 · Tier 2 | Segunda marca, cintillo panorámico |
| Antes del pie | 11 · Carruseles | Flyers premium / medio / estándar en rotación |

Total: **4 espacios comerciales** visibles y **2 banners editoriales de
comunidad** (WhatsApp general y El Paredón). Todos se encienden y apagan desde
el CMS («Mostrar» / «Mostrar módulo»).

---

## 7. Límites

GitHub Pages admite archivos de hasta 100 MB y repositorios de 1 GB. Si incrusta
muchos audios y videos, súbalos por enlace (YouTube / Google Drive) para aligerar
el `index.html`.
