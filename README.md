# La Taberna del Magallanes News

Gaceta sabermétrica, analítica Statcast, scouting y crónicas de investigación
sobre los **Navegantes del Magallanes** y la **LVBP**.

Portal editorial **estático**: no necesita base de datos ni servidor de
aplicaciones. Son archivos que funcionan en **Firebase Hosting**, **GitHub
Pages**, Netlify, Cloudflare o cualquier hosting.

- **Fundador y Director:** Luis Enrique Aponte Guzmán
- **Proyecto Firebase:** `la-taberna-del-magallanes-news`
- **Repositorio:** <https://github.com/latabernadelmagallanesnews-jpg/taberna-magallanes-informa>
- **Sitio publicado (GitHub Pages):**
  <https://latabernadelmagallanesnews-jpg.github.io/taberna-magallanes-informa/>

---

## 1 · Lo nuevo: el área de trabajo estilo Word

El panel de redacción ahora tiene un **editor de texto enriquecido** al estilo
de Microsoft Word. Antes los textos largos se escribían en un cuadro de texto
plano; ahora se escriben **con formato** y ese formato se publica tal cual.

### Qué puede hacer el editor

| Acción | Cómo |
| --- | --- |
| Negrita, cursiva, subrayado, tachado | Botones de la barra (o `Ctrl+B`, `Ctrl+I`, `Ctrl+U`) |
| Título 2, Título 3, Título 4, Cita | Selector *Estilo del párrafo* |
| Tamaño de letra | Selector *Tamaño* |
| Alinear a la izquierda, centrar, derecha, justificar | Botones de alineación |
| Lista con viñetas / lista numerada | Botones de lista |
| Color del texto | Selector de color |
| Insertar enlace | Botón 🔗 |
| Insertar imagen (por URL) | Botón 🖼 |
| Quitar formato | Botón 🧹 |
| Deshacer / rehacer | Botones ↶ ↷ |
| Vista previa de cómo se publicará | Botón *👁 Ver como se publicará* |
| Volver a texto plano | Botón *✏️ Editar como texto simple* |

El editor muestra un **contador de palabras y caracteres** y, al escribir,
**el portal se actualiza en vivo**: lo que se ve en el editor es lo que verá
el lector.

### Dónde está activo

**36 campos** de contenido editorial de los 31 paneles del CMS usan el editor
con formato:

- **Muro de Crónicas (Módulo 06):** cada crónica tiene su propio editor con
  formato para el **título**, la **entradilla** y el **texto completo**. Con 4
  crónicas publicadas son 12 editores.
- Portada (titular, cita, epígrafe y cuerpo completo)
- Banner de WhatsApp, publicidad nativa, Cabina VIP y scouting rival
- Tabla de posiciones, roster y su leyenda
- Carruseles publicitarios, hilos jugada a jugada y redes sociales
- Infografías, memes, radio y podcast
- Círculo VIP (descripción, paywall y beneficios)
- El Paredón del Fanático, Historias y el pie de página

Siguen siendo **texto plano a propósito** (porque son textos del sistema, con
plantillas o que llegan de los lectores): las metaetiquetas de SEO, los avisos
de convivencia, el mensaje automático de WhatsApp con `{nombre}`, el aviso de
copyright y los comentarios de la afición.

### Dónde se ve el resultado

El formato se publica en **todas partes**, no solo en la portada:

| Sitio | Con formato |
| --- | --- |
| El portal (`index.html`) | Sí — muro de crónicas, fichas, portada, memes… |
| `cronica.html` (lectura larga) | Sí |
| `roster.html` (fichas de jugadores) | Sí |
| `vip.html` (beneficios) | Sí |
| `buscador.html` | El título con formato; el texto de búsqueda en plano |

Las páginas sueltas leen `data.json`, que conserva el formato tal como lo
publica el portal, y lo interpretan con `publicar/rico.js` (`ricoHtml` para
mostrarlo, `ricoTexto` para buscarlo o compartirlo).

### Cómo se guarda

Cada campo tiene dos formas de almacenamiento:

- **texto plano** → `La Taberna es el diario`
- **texto con formato** → un bloque de HTML *saneado* (se quitan scripts,
  manejadores `onclick`, URLs `javascript:` y estilos peligrosos)

El contenido se **sanea siempre** antes de guardarse y antes de publicarse, y
el HTML publicado es válido y limpio.

### Atajos de teclado dentro del editor

| Atajo | Efecto |
| --- | --- |
| `Ctrl+B` | Negrita |
| `Ctrl+I` | Cursiva |
| `Ctrl+U` | Subrayado |
| `Ctrl+Z` | Deshacer |
| `Ctrl+Y` | Rehacer |

---

## 2 · Estructura del repositorio

```
.
├── index.html                 ← EL SITIO (copia de publicar/, la que sirve GitHub Pages)
├── buscador.html  cronica.html  roster.html  vip.html
├── redaccion-cms.html  404.html  data.json  rico.js  robots.txt  .nojekyll
├── editor/
│   └── index.html             ← COPIA DE TRABAJO (la que usted edita)
├── publicar/                  ← EL SITIO (fuente de Firebase Hosting)
│   ├── index.html
│   ├── buscador.html, cronica.html, roster.html, vip.html
│   ├── redaccion-cms.html, 404.html
│   ├── data.json, rico.js, robots.txt, .nojekyll
│   ├── README.md, LEEME-PUBLICACION.txt
├── scripts/
│   ├── aplicar-editor-word.js ←   instala el editor estilo Word en los HTML
│   ├── aplicar-rico-paginas.js←   conecta el lector de formato en las páginas sueltas
│   ├── generar-data-json.js   ←   regenera publicar/data.json
│   ├── sincronizar-raiz.js    ←   copia publicar/ a la raíz del repositorio
│   ├── verificar-sintaxis.js  ←   comprueba que el JavaScript compile
│   ├── verificar-portal.js     ←   comprueba módulos, CMS y que nada se perdió
│   ├── subir-a-github.ps1      ←   publica los cambios en GitHub con un comando
│   └── servidor-local.js       ←   servidor local para trabajar sin internet
├── firebase.json              ← configuración de Firebase Hosting
├── .firebaserc                ← proyecto de Firebase asociado
└── .github/workflows/         ← publicación automática
```

### Por qué el sitio está dos veces

`publicar/` es la fuente y la que sube **Firebase Hosting**. La raíz es una
copia exacta que `npm run sync` mantiene al día.

Motivo: **GitHub Pages** publica *la carpeta que le indique la configuración*.
Si usted usa "GitHub Actions", publica `publicar/`. Si usa "Deploy from a
branch" sobre la raíz, publica la raíz. Con esta copia, **las dos formas
sirven exactamente el mismo sitio**, sin depender de cuál elija.

> En `editor/index.html` vive la copia de trabajo: el CMS con el que usted
> escribe. Es el único archivo que se edita a mano; el resto se genera.

Las puertas de acceso del CMS funcionan en **modo redacción**:

| Quién | Qué ve |
| --- | --- |
| **Un lector** | Nada. Ni botón flotante, ni puerta en el pie, ni aviso al entrar. |
| **Usted (Director)** | **⚙️ Abrir CMS** (flotante, abajo a la derecha) y **⚙️ Sala de redacción / CMS** (pie). Entra directo. |
| **Un periodista con código personal** | Igual que usted, pero con permisos de periodista. |

Para que a usted le aparezcan, basta con **escribir su clave una vez** en cada
equipo (computadora o celular): ese equipo queda autorizado 180 días y el
botón se le queda visible para siempre. Si se autoriza a un periodista desde
**CMS → Seguridad & Accesos → Periodistas autorizados**, a él también le
aparecerá en el suyo.

Las claves se guardan cifradas (SHA-256): **sin la clave no se entra a nada**,
y el código fuente no contiene ninguna clave en texto plano.

Si en algún momento quiere que los lectores también vean el botón (modo
público), se cambia con un comando:

```bash
node scripts/puertas-de-acceso.js cerrar   # modo redacción (lo normal)
node scripts/puertas-de-acceso.js abrir    # modo público
node scripts/puertas-de-acceso.js estado   # ver cómo está
```

También puede manejarlas desde el propio CMS, en **Seguridad & Accesos**.

---

## 3 · Flujo de trabajo del editor

1. Copia de trabajo: `editor/index.html`.
2. Ábrala con doble clic (o `npm run servidor` → `http://localhost:8099/editor/index.html`).
3. Entre al CMS: botón **⚙️ Abrir CMS** (aparece en los equipos ya
   autenticados), o `?cms=1` al final de la dirección, o `Ctrl+Alt+M`, o
   `publicar/redaccion-cms.html`.
4. Escriba con formato en el editor estilo Word.
5. Pulse **💾 Guardar** (se guarda en el navegador) y luego
   **🚀 Descargar HTML publicado**.
6. Copie el `index.html` descargado sobre `publicar/index.html`.
7. `npm run build` → regenera `publicar/data.json` y copia `publicar/` a la
   raíz del repositorio.
8. `npm run deploy` para publicar en Firebase, o `git push` para GitHub.

### La URL pública (compartir y códigos QR)

Los enlaces que se generan al compartir (WhatsApp, X, Facebook, Telegram…) y
los códigos QR usan siempre esta dirección:

```
https://latabernadelmagallanesnews-jpg.github.io/taberna-magallanes-informa/
```

Está fijada, así que **funciona igual probando en local**: si no lo estuviera,
al copiar un enlace desde `localhost` apuntaría a su computadora y no le
serviría a nadie.

Si algún día publica en Firebase o en un dominio propio, cámbiela con:

```bash
node scripts/fijar-url-publica.js https://su-dominio.com/
```

o desde el propio CMS, en **SEO → URL canónica**.

---

## 4 · Publicar en Firebase Hosting

### Una sola vez (en su computadora)

```bash
npm install -g firebase-tools     # si no lo tiene
firebase login                    # abra la cuenta de Google del proyecto
firebase use la-taberna-del-magallanes-news
```

Si la consola dice que el proyecto no existe o no tiene Hosting activado:

1. Entre en <https://console.firebase.google.com/u/1/project/la-taberna-del-magallanes-news/overview>
2. En el menú de la izquierda, **Build → Hosting** y pulse **Get started**.
3. Vuelva a ejecutar `firebase deploy --only hosting`.

### Cada vez que publica

```bash
npm run deploy        # compila, verifica y publica en Firebase Hosting
```

La primera publicación deja el portal en
`https://la-taberna-del-magallanes-news.web.app` (y en
`https://la-taberna-del-magallanes-news.firebaseapp.com`).

### Dominio propio

En la consola de Firebase: **Hosting → Añadir dominio personalizado**. El
portal ya detecta solo el dominio donde esté alojado (el botón de compartir y
el código QR toman la URL real del sitio).

---

## 5 · Publicar en GitHub

### Subir el repositorio

El repositorio ya está creado y configurado:

```
https://github.com/latabernadelmagallanesnews-jpg/taberna-magallanes-informa
```

Para subir cambios desde la terminal:

```bash
git add -A
git commit -m "Actualización del portal"
git push origin main
```

O con el atajo que dejaré listo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/subir-a-github.ps1
```

La primera vez le pide usuario y token (el token va en el campo *contraseña*);
después queda cifrado en el Administrador de credenciales de Windows.

### GitHub Pages (automático)

El flujo `.github/workflows/pages.yml` publica la carpeta `publicar/` cada vez
que se sube algo a `main`. Para activarlo:

**Settings → Pages → Source → GitHub Actions**.

El portal queda en
`https://latabernadelmagallanesnews-jpg.github.io/taberna-magallanes-informa/`.

### Firebase desde GitHub (automático)

El flujo `.github/workflows/publicar-firebase.yml` publica en Firebase Hosting
en cada `push` a `main`. Necesita dos secretos en
**Settings → Secrets and variables → Actions**:

| Secreto | Valor |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | El JSON de la cuenta de servicio (todo el archivo, en una sola línea) |
| `FIREBASE_PROJECT_ID` | `la-taberna-del-magallanes-news` |

Para crear la cuenta de servicio: consola de Firebase → **Configuración del
proyecto → Cuentas de servicio → Generar nueva cuenta de servicio** → edítela
y añada el rol **Firebase Hosting Admin** → cree una clave JSON.

---

## 6 · Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run servidor` | Abre el portal en `http://localhost:8099/` |
| `npm run parche` | Instala (o actualiza) el editor estilo Word en los HTML |
| `npm run data` | Regenera `publicar/data.json` |
| `npm run url` | Fija la URL pública (la de los enlaces al compartir y los QR) |
| `npm run sync` | Copia `publicar/` a la raíz del repositorio |
| `npm run paginas` | Conecta el lector de formato en las páginas sueltas |
| `node scripts/puertas-de-acceso.js` | Enciende o apaga la puerta «🔒 Acceso Redacción» |
| `npm run sintaxis` | Comprueba que el JavaScript del portal compile |
| `npm run verificar` | Comprueba módulos, CMS y que no se perdió nada |
| `npm run build` | Todo lo anterior, en orden |
| `npm run deploy` | Compila, verifica y publica en Firebase Hosting |

Todos los scripts son **idempotentes**: se pueden volver a ejecutar sin
dañar nada.

> **En Windows con PowerShell:** si al escribir `npm` aparece un error de
> *política de ejecución*, use `npm.cmd` en vez de `npm`:
>
> ```
> npm.cmd run build
> npm.cmd run deploy
> ```
>
> O bien habilite los scripts para su usuario con una sola vez:
>
> ```
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

---

## 7 · Módulos del portal

**21 módulos editoriales**, todos editables desde el CMS (**31 paneles**):

Cabecera · Ticker en vivo · Banner de WhatsApp · Publicidad (tier 1, 2 y
nativa) · Portada Hero · Muro de Crónicas · Cabina Statcast VIP · Heatmap de
9 zonas · Tabla de posiciones · Roster · Carruseles publicitarios · Hilos
informativos jugada a jugada · Multimedia y redes sociales · Infografías ·
Memes · Radio y Podcast · Círculo VIP · **El Paredón del Fanático** · Chat del
Fanático · Historias estilo Instagram · Pie de página.

Además: carga multimedia (imagen, audio, video, PDF) en todos los módulos,
comentarios y reacciones con emojis, compartir en redes, códigos QR, muro de
crónicas en carrusel y moderación.

---

## 8 · Seguridad (honesta)

El portal es un archivo estático: la clave protege el **panel de edición** y
las puertas de acceso, pero no impide que alguien curioso lea el código
fuente de la página. Lo que un lector **nunca** puede hacer es cambiar lo que
ven los demás: sus ediciones solo llegan al público cuando se descarga el
HTML publicado y se sube al hosting.

Para blindaje total, publique la copia de trabajo en una **carpeta protegida
con contraseña** del servidor y deje en la raíz pública solo el `index.html`
ya publicado:

```
/public_html/index.html             ← el portal que ve el público
/public_html/redaccion/index.html   ← copia de trabajo (protegida)
```

---

## 9 · Límites

- GitHub Pages admite archivos de hasta 100 MB y repositorios de 1 GB.
- Si incrusta muchos audios y videos, súbalos por enlace (YouTube / Google
  Drive) para aligerar el `index.html`.
- El HTML publicado se regenera con el contenido que esté en el navegador del
  editor: si edita en dos computadoras a la vez, la última que descargue el
  HTML publicado es la que manda.
