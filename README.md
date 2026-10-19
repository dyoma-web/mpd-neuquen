# MPD Neuquén · Prototipo del asistente de orientación

Prototipo navegable del **asistente de orientación de la Defensa Pública de Neuquén** (Ministerio Público de la Defensa), con su panel interno. Sirve para una primera validación con la Defensa y PNUD: **qué les gusta, qué no y qué falta**.

> ⚠️ **Prototipo.** Es una propuesta de diseño, no un servicio oficial. Los datos marcados `[así]` están pendientes de validación con el MPD y las cifras del panel son ficticias. No usa inteligencia artificial: el texto libre se resuelve con reglas que simulan la capa 2. El sitio se publica con `noindex`.

## Qué incluye

| Página | Qué hace |
|---|---|
| **Guía de la sesión** (`index.html`) | Portada para quienes participan: cómo comentar, tipos de comentario y qué revisar en cada pantalla |
| **Página del asistente** | Página ciudadana con el chat, defensorías por circunscripción y preguntas frecuentes |
| **Ventana flotante** | El asistente sobre una maqueta del sitio actual del MPD, más la línea de instalación real (`ventana.js`) |
| **Pantalla completa** (`chat.html`) | El chat solo, como en un celular. Es lo que carga el iframe de `ventana.js` |
| **Estados de la conversación** | Nueve momentos clave, cada uno con un chat que funciona desde ese punto |
| **Cómo funciona** | Qué hace y qué no, registro de la herramienta de IA, datos, urgencias, accesibilidad y términos |
| **Mapa de temas** | Árboles guiados, orden de las señales de urgencia en texto libre, localidades y circunscripciones |
| **Panel: Resumen** | Métricas anónimas, conversaciones para revisar (con filtros) e instalación |
| **Panel: Fichas** | Editor de fichas conectado a la base de conocimiento, con búsqueda, vista previa por localidad, directorio de derivación y mensajes de urgencia |
| **Panel: Banco de pruebas** | Ejecuta las preguntas de prueba contra el clasificador real del chat y bloquea la publicación si falla una crítica o alta |

## Cómo funciona el chat

- **Una sola base de conocimiento:** `assets/js/data.js` tiene fichas, localidades, circunscripciones, derivaciones, mensajes de urgencia, preguntas de prueba y conversaciones del panel. La usan el chat, el panel y el banco de pruebas.
- **Capa 1, menús guiados:** cada elección lleva siempre a la misma ficha, derivación o mensaje de urgencia.
- **Capa 2, texto libre (simulada):** `MPDChat.classify()` revisa primero los datos personales y las urgencias, en este orden: menor de 18 en riesgo, violencia sin poder hablar, violencia en curso y salud mental. Después busca los temas de la Defensa y los otros organismos. Si no hay coincidencia, responde «no lo sé».
- **Salida rápida:** reemplaza la página con `location.replace` (no abre otra pestaña ni queda en el historial). Dentro del iframe sale la página completa.
- **Accesibilidad:** los mensajes se agregan a un registro `role="log"` sin volver a dibujar la conversación, los mensajes de urgencia usan `role="alert"` y el foco pasa a la respuesta nueva. Incluye A+, objetivos táctiles de 44 px y `prefers-reduced-motion`.
- **Privacidad:** si el texto tiene un DNI, un CUIL, un correo o «me llamo…», el mensaje se borra antes de procesarse y nunca se muestra.

## Modo revisión (comentarios en vivo)

Igual que en el prototipo del MPF San Juan. Se activa abriendo cualquier página con `?revision=CÓDIGO` (o `?revision` para escribirlo).

| Herramienta | Atajo | Qué hace |
|---|---|---|
| Comentar | `C` | Clic en cualquier elemento: post-it anclado (Me gusta, No me gusta, Falta algo, Corregir, Pregunta, Idea, Eliminar) |
| General | `G` | Opinión sobre la página completa |
| Redacción | `S` | Seleccionar un texto y proponer cómo debería decir |
| Ocultar | `H` | Ocultar un bloque solo en tu pantalla, con opción de proponer su eliminación |
| Panel | `P` | Lista con filtros, búsqueda, votos, respuestas, estados e «ir al elemento» |

Además: presencia en vivo, avisos cuando otra persona comenta, versión del sitio en cada comentario, **acta de la sesión** en Markdown y exportación CSV conectada a Google Sheets (`IMPORTDATA`).

**Arquitectura:** Supabase (proyecto compartido con el prototipo del MPF, con tablas y funciones propias `mpd_review_*` y su propio código de sesión). Las tablas tienen RLS sin políticas y todo pasa por funciones `SECURITY DEFINER` que validan el código (`supabase/schema.sql`). La función `mpd-review-csv` exporta los comentarios. La configuración pública está en `review.config.json`.

**Cambiar el código de sesión:** `update public.mpd_review_config set value = 'NUEVO' where key = 'session_code';`

## Estructura

```
src/
  layout.html            plantilla base
  partials/panel-side    menú lateral del panel
  pages/*.html           cada pantalla (con front-matter)
assets/
  css/proto.css          estilos originales de cada pantalla (de Claude Design)
  css/site.css           chat, ajustes adaptables, impresión
  css/review.css         modo revisión
  js/data.js             base de conocimiento
  js/chat.js             motor del chat y clasificador
  js/app.js              navegación del prototipo y bloques generados
  js/panel.js · fichas.js · pruebas.js · ventana-demo.js
  js/ventana.js          script de instalación en el sitio del MPD
  js/review.js           modo revisión
  fonts/                 Lexend y Atkinson Hyperlegible (sin dependencias externas)
supabase/                esquema y función de exportación CSV
test/chat.test.mjs       banco de pruebas en la línea de comandos (corre en cada publicación)
```

## Uso

Requiere Node.js 18 o superior. No hay dependencias que instalar.

```bash
npm test           # banco de pruebas del chat
npm run build      # genera dist/
npm run preview    # genera y sirve dist/ en http://localhost:3000
```

## Publicación

Cada push a `main` ejecuta `.github/workflows/pages.yml`: corre el banco de pruebas, compila y publica en GitHub Pages. Si falla una prueba crítica o alta, no se publica.

## Pendiente para avanzar

- Completar con la Defensa todo lo que figura entre corchetes: teléfonos, horarios, sedes, criterios de admisión, organismos de derivación, responsable, plazo de conservación y casilla.
- Definir a qué sede se derivan Aluminé y las demás localidades que no están en la lista (es la única prueba que falla, a propósito).
- Aprobar los textos de urgencia con la Defensa y PNUD.
- Decidir el proveedor del modelo de lenguaje y reemplazar el clasificador por reglas con recuperación sobre las fichas, manteniendo las reglas de urgencia como primera barrera.
