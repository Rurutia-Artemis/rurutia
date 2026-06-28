<div align="center">

<img src="public/logo.png" alt="Rurutia" width="120" />

# Rurutia

**La cabina de mando de tu Coding Agent —— una versión personal mejorada de [FanBox](https://github.com/alchaincyf/fanbox)**

Dirige a Claude Code / Codex para que trabajen en local, observa cada archivo que tocaron y cada línea que cambiaron, y toma el control en cualquier momento.<br>
Sobre esa base, Rurutia rehízo lo visual y la tipografía, agregó **18 skins de color**, un **prompt de terminal con Starship incluido** y una **barra de herramientas con iconos de marca en la terminal**, y pulió los accesos de la barra lateral, el panel de uso y los detalles de interacción para que todo resulte más cómodo.

[![Licencia: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Plataforma](https://img.shields.io/badge/macOS-Apple%20Silicon-black?logo=apple)](#instalación)
[![Firmado](https://img.shields.io/badge/Firmado-Developer%20ID%20%2B%20Notarizado-success?logo=apple)](#instalación)
[![Versión](https://img.shields.io/badge/Versión-v2.7.2-ff3d8b)](../../releases)
[![Upstream](https://img.shields.io/badge/Upstream-FanBox%20v2.3.3-blueviolet)](https://github.com/alchaincyf/fanbox)

[简体中文](README.md) · [繁體中文](README.zh-TW.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Français](README.fr.md) · **Español**

</div>

---

<p align="center">
  <img src="docs/screenshots/overview.png" alt="Interfaz principal de Rurutia: barra lateral a la izquierda · cuadrícula de archivos en el centro · terminal integrada a la derecha, con un skin oscuro y uno claro lado a lado" width="100%">
</p>
<p align="center"><sub>▲ Vista general de la interfaz principal —— la misma interfaz, a la izquierda la oscura «Luz de Píxel» y a la derecha la clara «Gelatina Digital». La cuadrícula de archivos lleva insignias de proyecto en colores vivos y la barra lateral resume los proyectos de Agent y el uso oficial.</sub></p>

---

## Tabla de contenidos

- [¿Qué es esto?](#qué-es-esto)
- [En 30 segundos](#en-30-segundos)
- [Qué puede hacer el FanBox original (funciones completas)](#qué-puede-hacer-el-fanbox-original-funciones-completas)
- [Qué cambió Rurutia](#qué-cambió-rurutia): 18 skins · prompt de terminal · iconos de marca + pestañas arcoíris · barra lateral
- [Instalación](#instalación)
- [Compilar desde el código fuente](#compilar-desde-el-código-fuente)
- [Cómo se organizan los cambios (estilo parche)](#cómo-se-organizan-los-cambios-estilo-parche)
- [Privacidad y seguridad](#privacidad-y-seguridad)
- [Arquitectura técnica](#arquitectura-técnica)
- [Agradecimientos y licencia](#agradecimientos-y-licencia)

---

## ¿Qué es esto?

[**FanBox**](https://github.com/alchaincyf/fanbox) (creado por [Huashu](https://github.com/alchaincyf)) es una «**cabina de mando para Coding Agents**» que corre en local: navegas / previsualizas / editas archivos locales mientras ejecutas Claude Code, Codex o cualquier coding agent en una terminal real integrada, y cada archivo que el agent modifica se resalta en tiempo real —— **recuperar archivos → ejecutar el agent → ver con claridad los cambios**, todo en una sola ventana. Backend sin dependencias, los datos no salen de tu máquina.

> *«La IA te ayuda a arrancar diez proyectos en una tarde, y luego nunca más los vuelves a encontrar. FanBox te ayuda a recuperarlos.»*

**Rurutia** es una **personalización** que hice sobre FanBox v2.3.1 (`c93a486`): las capacidades centrales provienen 100% de FanBox; yo rehíce lo visual / la tipografía / los colores, agregué todo un sistema de skins y de prompts de terminal, y pulí docenas de detalles de comodidad cotidiana. Abajo primero explico **las funciones completas del proyecto original** y luego **qué cambié exactamente**.

---

## En 30 segundos

| Lo que quieres hacer | En Rurutia |
|---|---|
| Recuperar los diez proyectos que arrancaste sin orden en una tarde | Búsqueda difusa global con `⌘K` · las carpetas llevan insignias node/web/py/rs/go para reconocer el tipo de un vistazo |
| Poner al agent a trabajar y aun así ver con claridad qué cambió | Terminal real integrada para ejecutar Claude Code / Codex; el archivo que escribe hace que su tarjeta brille al instante y la previsualización lo sigue en tiempo real |
| Retomar la sesión de ayer | Abre el proyecto para ver las sesiones anteriores; «▶ Retomar» recupera el contexto con `claude --resume` / `codex resume` en un clic |
| Vigilar el uso oficial para no pasarte del límite | La barra lateral muestra siempre la ventana de 5 h + la cuota semanal de Claude / Codex; al acercarte al límite, barra roja + notificación de escritorio |
| Cambiar el aspecto de toda la interfaz según tu humor | 18 skins de color + 16 temas de prompt de terminal; la UI / la terminal / el resaltado de código cambian todos a la vez |

---

## Qué puede hacer el FanBox original (funciones completas)

> Esta parte corresponde a las capacidades propias de FanBox, que Rurutia conserva por completo. La documentación original en inglés está en [`README.fanbox.md`](README.fanbox.md).

### 🗂 Archivos · recuperación y previsualización
- **Búsqueda difusa global con ⌘K**: basta con recordar un fragmento del nombre; `⌘↵` abre el proyecto completo en el editor; el prefijo `内容:` (p. ej. `内容:palabra`) cambia a la búsqueda de texto completo.
- **Iconos sólidos de colores vivos**: cada tipo de archivo «se parece a sí mismo» —— PDF en rojo, JS en amarillo, Markdown en azul; las fotos y los videos se muestran con su proporción real.
- **Previsualización en el sitio**: renderizado de Markdown, HTML como producto en vivo, resaltado de sintaxis de código, imágenes/videos/PDF integrados (incluido HEIC), lista del contenido de los archivos comprimidos y fondo a cuadros para las imágenes transparentes.
- **Miniaturas aceleradas**: el desplazamiento y los clics en carpetas grandes responden en menos de 0,1 segundos.
- **Insignias de proyecto**: las tarjetas de carpeta marcan node / web / py / rs / go, para reconocer de un vistazo el tipo de los diez proyectos que arrancaste en una tarde.

### 👀 Ver qué cambió el agent
- **Panel vivo**: cada vez que el agent escribe un archivo, su tarjeta lanza un efecto de onda y brilla con un latido según la frecuencia de los cambios; la luz va hacia donde el agent escribe.
- **Modo seguimiento**: con un clic, la vista de archivos + la previsualización siguen el archivo que el agent está editando —— el código parpadea resaltando las líneas recién escritas, el HTML se renderiza en vivo a medida que se escribe (doble búfer, sin parpadeo en blanco) y el Markdown se renderiza en tiempo real. Cualquier navegación manual te devuelve el control de inmediato.
- **Repetición de sesión**: arrastra la línea de tiempo como si fuera un video para revivir, paso a paso, qué archivos cambió el agent durante ese período.
- **Bandeja de cambios**: reúne, a través de varios proyectos, todos los archivos modificados en la sesión actual.
- **Diff de cambios de Git**: el DiffEditor de solo lectura de Monaco muestra lado a lado HEAD vs el área de trabajo actual.

### 🤖 Cabina de mando del Agent
- **Memoria del proyecto**: abre cualquier carpeta de proyecto para ver qué hizo la IA ahí —— las sesiones anteriores (tu primera frase como título), los archivos cambiados en cada sesión y las skills que se activaron; «▶ Retomar» recupera el contexto en la terminal integrada con `claude --resume` / `codex resume` en un clic.
- **Vía directa para capturas**: en cuanto una captura del sistema se guarda en disco, aparece una tarjeta de acceso directo —— para pasársela al agent en la terminal, recogerla en la carpeta `素材/` (materiales) del proyecto, o anotarla antes de enviarla.
- **Organización con IA**: la IA solo mira los metadatos para proponer una organización (no lee el contenido ni toca el sistema de archivos); tras tu revisión punto por punto, ejecuta + escribe un registro de reversión, con deshacer todo en un clic.
- **Asistente de publicación**: para proyectos node, encadena en un clic el número de versión, el CHANGELOG, el empaquetado, el push y el GitHub Release.
- **Vista de Skills**: todas las skills de agent de tu máquina en una sola vista —— estadísticas de activación, chequeo de salud, presupuesto de context e interruptores de encendido/apagado que no eliminan archivos.
- **Uso del Agent**: la ventana oficial de 5 h / cuota semanal de Claude Code (de la misma fuente que `/usage`) + el conteo local de tokens; una instantánea del límite de Codex.
- **Vista del uso de disco**: un ranking de barras con el uso real según el criterio de `du`, con posibilidad de profundizar.

### 🖥 Terminal · dar órdenes al agent
- **Terminal real integrada**: node-pty + xterm.js (renderizado con WebGL); ejecuta Claude Code / vim / htop sin glitches de pantalla y muestra correctamente los caracteres anchos del chino.
- **Arrastrar archivos a la terminal**: arrastra archivos/carpetas desde la lista de archivos a la terminal y la ruta se inserta automáticamente para dársela al agent como contexto.
- **Rutas clicables**: las rutas de archivo que aparecen en la terminal se abren con un clic (reconoce nombres de captura con espacios, nombres en chino y rutas largas con salto de línea).
- **Selecciona y envía a la terminal**: selecciona un fragmento de texto en la previsualización y envíalo a la terminal en un clic con formato «origen del archivo + bloque de código cercado».
- **Conciencia de estado**: el punto de la pestaña indica si el agent está en ejecución/inactivo/cerrado; cuando es tu turno, el borde de la terminal late como aviso, y al terminar una tarea larga se envía una notificación del sistema.

### ✍️ Edición · lo que ves es lo que obtienes
- **Markdown**: Milkdown Crepe ofrece una edición WYSIWYG al estilo Notion, con guardado automático 0,8 segundos después de dejar de escribir.
- **Código/JSON**: el editor Monaco (el mismo núcleo que VS Code).
- **Anotación de imágenes**: pincel/flechas/texto/pixelado, conversión de formato, compresión y ajuste de resolución.
- **Guardián de cambios sin guardar**: los tres editores interceptan de forma unificada la salida con cambios sin guardar.

---

## Qué cambió Rurutia

> Las capacidades centrales provienen por completo de FanBox; abajo está la parte que agregué / rehíce. Todo gira en torno a cuatro cosas: **que se vea bien**, **que sea fácil de reconocer**, **una terminal cómoda de usar** y **que moleste poco**.

### 🎨 18 skins de color (sistema multi-acento)

Haz clic en «Skins» en la barra lateral para abrir la cuadrícula de muestras y cambiar; el predeterminado es «Luz de Píxel». Cada skin es una «**base neutra + 3 colores de acento en paralelo** (principal: botones/estado activo · secundario: títulos de sección y enlaces · destacado: insignias) + un juego de colores de estado semántico» —— colores más vivos, pero coordinados gracias al reparto de roles. El texto / los colores de acento / la tipografía de las insignias / los 16 ANSI de la terminal **pasan todos la verificación de contraste WCAG**; cada skin se adapta automáticamente a la interfaz principal, la barra lateral, los colores de la terminal y el resaltado de código, e incluso el color de fondo del editor Monaco sigue la misma temperatura de color.

Inspirados en la colección de paletas con aire sofisticado de la cuenta de WeChat «色所»: Neo-Memphis / Moda Ácida / Gelatina Digital / Placa de Circuito / Vacío / Naranja Lava / Núcleo de Aguas Profundas… 9 claros y 9 oscuros, 18 skins en total.

<p align="center">
  <img src="docs/screenshots/skins.png" alt="Vista general de los 18 skins de color: 9 claros y 9 oscuros, cada uno se adapta automáticamente a la UI / la terminal / el resaltado de código" width="100%">
</p>
<p align="center"><sub>▲ Vista general de los 18 skins (9 claros y 9 oscuros). Cambia uno y la interfaz principal / la barra lateral / los colores de la terminal / el resaltado de código cambian todos a la vez.</sub></p>

La UI en su conjunto también se modernizó: bordes finísimos, un ritmo unificado de esquinas redondeadas, controles segmentados tipo cápsula flotante, resplandor del color de acento, estado seleccionado de la barra lateral y transiciones contenidas —— todo sigue el color de acento del skin actual. La interfaz, los nombres de archivo, el código y la terminal usan de forma unificada **Maple Mono CN** (incluye el set completo de caracteres chinos + kana japonés, woff2 incrustado, disponible sin conexión).

### 🚀 Prompt de terminal (Starship incluido · 16 temas)

**Un prompt powerline listo para usar**: trae starship firmado y notarizado + la tipografía de iconos Nerd Font; en cuanto instalas y abres la terminal, ya tienes las pastillas powerline (directorio / estado de git / versión del lenguaje / ♥ hora), **sin instalar starship por tu cuenta ni configurar `~/.zshrc`**.

Se inyecta vía ZDOTDIR: primero hace source de tu dotfile real (PATH / alias idénticos al detalle, `claude` / `codex` se siguen encontrando) y luego superpone starship —— **solo surte efecto en la terminal de esta app, no toca ningún dotfile y no deja residuos al desinstalar**. Solo macOS + zsh.

<p align="center">
  <img src="docs/screenshots/prompt.png" alt="Selector de prompt de terminal: 16 temas completos (con miniatura de previsualización powerline) + 5 modificadores combinables" width="100%">
</p>
<p align="center"><sub>▲ Selector «Prompt» de la barra lateral: eliges un tema completo y puedes marcar varios modificadores combinables; el cambio surte efecto al instante, y una terminal en ejecución cambia con solo pulsar Enter.</sub></p>

- **16 temas de prompt (independientes del skin)**: Pastilla · Moca / Pastel / Noche de Tokio / Gruvbox Arcoíris / Nord Polar / Dracula / Rosé Pine / Everforest / Kanagawa / Latte Claro / Colores Planos / Jetpack Cabina / Pure Minimalista / Una Línea Minimalista / Dos Líneas / Texto Plano.
- **5 modificadores combinables (se pueden marcar varios a la vez)**: ocultar la versión del lenguaje / símbolos de texto plano · sin iconos / quitar la hora / quitar la duración del comando / quitar la línea en blanco inicial.
- **Colores de terminal propios por skin**: el fondo / el cursor / la selección de la terminal + los 16 ANSI se derivan todos del skin; en los skins claros, el texto de colores se ajusta a un contraste ≥ 3,5 para que ya no se difumine sobre el fondo claro.

### 🖥 Terminal · iconos de marca + pestañas arcoíris

<p align="center">
  <img src="docs/screenshots/terminal.png" alt="Terminal: pestañas de proyecto en colores arcoíris + barra de herramientas con iconos de marca Claude/OpenAI/Codex/WeChat + prompt powerline" width="100%">
</p>
<p align="center"><sub>▲ Terminal integrada: las pestañas se colorean por proyecto con el ángulo áureo (arcoíris); la fila de iconos de marca oficiales de la barra superior lanza directamente Claude / Codex / WeChat, y el prompt es el powerline de starship incluido.</sub></p>

- **Barra de herramientas con iconos de marca**: los accesos de lanzamiento como Claude Code / Codex / WeChat se reemplazan por **iconos vectoriales de marca oficiales**, claros de un vistazo en la fila superior; el resto de los botones de acción (seguimiento de previsualización / nueva pestaña / pantalla completa / alternar dock / silenciar…) se rediseñaron como iconos vectoriales monocromos que siguen el color del tema.
- **Pestañas arcoíris**: cada pestaña de terminal toma su color por proyecto con el ángulo áureo, y al tener varios proyectos lado a lado se escalonan automáticamente formando un arcoíris, para distinguir de un vistazo qué terminal corresponde a qué proyecto; las pestañas son más altas, su ancho se adapta al nombre del archivo y se pueden reordenar arrastrándolas con elasticidad (al pasar sobre una pestaña vecina, esta cede el sitio en tiempo real).
- **Botón «Terminal normal»**: junto a Claude Code / Codex, abre con un clic un shell limpio en la carpeta actual (sin agent).
- **Tarjeta de terminal con esquinas redondeadas propia**: el borde superior de la barra de navegación es curvo y el fondo sigue el color base del skin actual para integrarse con el conjunto (en los skins oscuros ya no es un bloque negro abrupto); en los skins claros, la pestaña activa pasa a un tinte suave y se elimina la barra de color inferior sobrante.

### 🗂 Barra lateral · accesos y proyectos de Agent que puedes agregar y quitar

<p align="center">
  <img src="docs/screenshots/sidebar.png" alt="Barra lateral: accesos rápidos / favoritos / proyectos de Agent, con agregar/quitar y reordenar arrastrando + panel de uso oficial" width="34%">
</p>
<p align="center"><sub>▲ Barra lateral: accesos rápidos / favoritos / proyectos de Agent, con agregar, quitar y ordenar arrastrando; el panel de uso de Agent en la parte inferior muestra siempre los límites oficiales.</sub></p>

- **Accesos rápidos que puedes agregar y quitar**: ➕ añade la carpeta actual, ✕ al pasar el cursor la elimina (también puedes borrar los elementos predeterminados), con persistencia en el servidor.
- **Proyectos de Agent que puedes agregar y quitar**: añádelos manualmente y fíjalos arriba, oculta los que no quieras ver (una vez ocultos, los escaneos ya no los vuelven a sacar); también puedes arrastrarlos desde la lista a «Favoritos / Accesos rápidos», o arrastrarlos arriba y abajo dentro de la lista para ordenarlos a tu gusto (el orden se conserva).
- **Panel de uso mejorado**: el límite oficial de Claude Code (ventana de 5 h / cuota semanal) se **muestra siempre** —— si se obtiene, aparece una barra de progreso; si no, se indica el motivo (sin suscripción/sesión iniciada / red restringida / sin datos de la ventana) + reintentar; al acercarse al límite (≥85 %), **barra de advertencia roja + notificación de escritorio** (con throttling para no molestar), y se actualiza automáticamente al desplegar el panel. La API del límite oficial tiene un límite de tasa estricto, así que se pasó a una caché de 10 minutos + reutilizar los datos anteriores cuando hay limitación de tasa, para ya no mostrar «sin datos» por una limitación esporádica.

### Otros pulidos

- **Clic en la ✕ roja = ocultar la ventana (macOS)**: ya no destruye la ventana ni mata la terminal; al hacer clic en el Dock la trae de vuelta tal cual (la terminal / el estado siguen ahí), y ⌘Q es la salida de verdad.
- **Toda la franja en blanco de la parte superior de la ventana se puede arrastrar**: ya no hace falta agarrarla solo por una esquina de la zona de marca; los semáforos de la esquina superior izquierda dejan suficiente espacio y no se solapan con el logo.
- **Barra de desplazamiento rehecha**: fina y redondeada, sigue el color de acento, y sus extremos se retraen para evitar las esquinas redondeadas de las tarjetas, sin sobresalir.
- **Cursor personalizado en las pestañas**: la zona de pestañas de la terminal usa un cursor de flecha pequeña que sigue el color de acento del skin.
- **Avance automático de puertos**: si el puerto predeterminado 4567 está ocupado, salta automáticamente al siguiente par de puertos libres, sin conflictos entre varias instancias.
- **Icono de aplicación personalizado + logo en la barra lateral**, con la app renombrada a Rurutia.

### 🌐 Idiomas de la interfaz (7)

- La interfaz de la app ahora está disponible en **7 idiomas**: 简体中文 / 繁體中文 / English / 日本語 / 한국어 / Français / Español. Un nuevo selector «Idioma» en la barra lateral lista cada idioma por su nombre nativo: elige uno para cambiar. El contenido del usuario (vista previa / editor / terminal) nunca se traduce.

---

## Instalación

**macOS (Apple Silicon / arm64)**

1. Ve a [**Releases**](../../releases) y descarga el `Rurutia-*.dmg` más reciente.
2. Abre el dmg y arrastra **Rurutia** a «Aplicaciones».
3. Haz doble clic para abrir y empezar a usarlo.

> ✅ Esta versión está **firmada con un certificado Apple Developer ID + notarización de Apple (notarization) + hardened runtime** —— tras descargarla desde Releases, **haz doble clic para instalar y usar directamente**, sin el aviso «no se puede verificar el desarrollador» ni ninguna operación adicional.

---

## Compilar desde el código fuente

```bash
npm install
npm run rebuild        # 把 node-pty 重编到 Electron 的 ABI

# 未签名本地构建（最简单，自己用）：
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --dir -c.mac.identity=null
# 产物：dist/mac-arm64/Rurutia.app
```

---

## Cómo se organizan los cambios (estilo parche)

Para poder seguir las actualizaciones continuas de FanBox upstream, los cambios se hacen, en la medida de lo posible, de forma **aditiva**, para poder reaplicarlos con `git rebase` cada vez que sale una versión nueva:

- **Archivos nuevos** (sin conflictos): `public/ui-patch.css` + `public/soft-patch.css` (toda la UI/tipografía), `public/themes-patch.js` (los 18 skins), `public/prompt-patch.js` (el selector de prompt de terminal), `public/vendor/fonts/maple/*`, `public/vendor/icons/`, `vendor/starship/*`, `public/logo.png`, `public/favicon.png`.
- **Archivos upstream editados** (pocos, requieren atención): `public/index.html`, `public/app.js`, `server.js`, `electron/main.js`, `package.json` + `build/icon*`.

La lista completa de cambios + los pasos de «cómo reaplicarlos cuando upstream saca una versión nueva» están en [`RURUTIA-PATCH.md`](RURUTIA-PATCH.md).

---

## Privacidad y seguridad

> Igual que FanBox upstream, Rurutia no altera su modelo de seguridad.

- El backend solo escucha en la dirección loopback local + valida el encabezado Host (bloquea el DNS rebinding), **los datos no salen de tu máquina**.
- Todos los recursos del frontend (incluidos el renderizador, las tipografías y el binario de starship) vienen integrados localmente, **totalmente utilizable sin conexión**. Las únicas peticiones que salen a la red: la API de uso de Claude / Codex (opcional) y la comprobación de actualizaciones de GitHub.
- La previsualización de HTML se renderiza en un iframe en sandbox con origin aislado, sin acceso a las capacidades de la terminal.
- El prompt de terminal se inyecta vía ZDOTDIR, **no escribe ni modifica ninguno de tus dotfiles**, y no deja residuos al desinstalar.
- La configuración usa escritura atómica (temp + fsync + rename), sin pérdida de datos; las eliminaciones van a la papelera del sistema (recuperables).

---

## Arquitectura técnica

| Capa | Qué se usa |
|---|---|
| Backend | Node.js `server.js` sin dependencias (API de archivos + servidor estático + miniaturas) |
| Carcasa de escritorio | Electron 33 + node-pty (módulos nativos asarUnpack) |
| Terminal | xterm.js + WebGL + unicode11 |
| Prompt | starship integrado (firmado y notarizado) + Nerd Font, inyección en tiempo de ejecución vía ZDOTDIR |
| Editor | Monaco (código) + Milkdown Crepe (Markdown) |
| Tipografía | Maple Mono CN (woff2 incrustado) |
| Empaquetado | electron-builder → `.dmg` arm64 firmado + notarizado |

---

## Agradecimientos y licencia

- La aplicación central **FanBox** fue desarrollada por **[Huashu](https://github.com/alchaincyf)** ([alchaincyf/fanbox](https://github.com/alchaincyf/fanbox)) con licencia MIT. Rurutia es su fork personal mejorado y se rige por la misma [licencia MIT](LICENSE). Las capacidades de FanBox, a su vez, se apoyan en un conjunto de excelentes proyectos de código abierto como Electron / node-pty / xterm.js / Monaco / Milkdown (la lista completa está en [`README.fanbox.md`](README.fanbox.md)).
- La tipografía **Maple Mono** proviene de [subframe7536/maple-font](https://github.com/subframe7536/maple-font) (OFL).
- El prompt de terminal **Starship** proviene de [starship/starship](https://github.com/starship/starship) (ISC).
- La inspiración de las paletas proviene de la colección de colores con aire sofisticado de la cuenta de WeChat «**色所**».

<div align="center">
<br>

**Finder** te ayuda a gestionar archivos. El **IDE** te ayuda a escribir código. **Rurutia / FanBox** te ayuda a ver con claridad qué hizo la IA en tu máquina.

MIT License © Rurutia · basado en el [FanBox de Huashu](https://github.com/alchaincyf/fanbox)

</div>
