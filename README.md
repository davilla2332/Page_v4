# David & Madeline ❤️ — V4 completa

Una aplicación web romántica, responsive y administrable para GitHub Pages + Supabase.

**Datos iniciales incluidos:**

- David & Madeline.
- Empezaron a hablar: 12 de julio de 2026.
- Se conocieron: 16 de agosto de 2026.

## Qué incluye

### Propuesta y carta

- Botones Sí / No con interacción romántica.
- El “No” intenta escaparse.
- Al pulsar **Sí**, se ejecuta `accept_proposal_forever()` en Supabase.
- Se conserva la primera fecha/hora del Sí en `proposal_global_state`.
- La carta se abre inmediatamente.
- En visitas futuras la web recuerda que ya dijo que sí y permite abrir la carta de nuevo.
- Animación de corazones y modo especial en fechas importantes.

### Página principal

- Portada scrapbook/polaroid.
- Fotos destacadas del álbum alimentan el collage.
- Contador desde el primer hola.
- Estadísticas en tiempo real.
- Recuerdo aleatorio / “un día como hoy”.
- Capítulos ilimitados.
- Razones románticas.
- Frasquito de mensajes.
- “Abrir cuando…”.
- Ruleta de citas.
- Pregunta de pareja.
- Planes / bucket list con progreso.
- Cuentas regresivas.
- Cápsulas del tiempo que se desbloquean por fecha.
- Calendario de recuerdos y eventos.
- Mapa de la historia con OpenStreetMap/Leaflet, sin API key adicional.
- Perfiles de David y Madeline.
- Logros de pareja.
- Música instrumental original incluida.
- Easter egg oculto tocando varias veces el logo D ♥ M.

### Álbum completo

`album.html`

- Fotos, videos y notas de voz/audio.
- Buscador.
- Filtro por año, etiquetas y favoritos.
- Visor grande.
- Favoritos.
- Fotos destacadas para la portada.
- Lugar, fecha, coordenadas y etiquetas.
- Recuerdos públicos y privados.
- Reacciones ❤️ 😍 🥹 😂.
- Comentarios privados de las cuentas permanentes.
- Slideshow / modo presentación.
- Enlace directo a cada recuerdo mediante `#UUID`.
- Botón Compartir cuando el navegador soporta Web Share.
- QR generado en el navegador.

### Nuestro rincón

`together.html`

- “Cómo empezó / cómo va” usando la primera y última foto.
- Wrapped automático por año.
- Mes con más recuerdos y lugar más mencionado.
- Resumen Wrapped generado con IA.
- Playlist editable.
- Ruleta de citas.
- Mini ronda de preguntas.
- Pregunta privada con respuestas ocultas hasta que dos usuarios permanentes respondan.
- Notas privadas tipo pequeño chat entre la pareja.

### Panel privado

`admin.html`

- Login con Supabase Auth.
- No existe registro público desde la web.
- Editar portada, propuesta, carta, razones, mensajes, preguntas e ideas.
- Editor JSON avanzado para `site_content`.
- Agregar/editar fotos, videos y audio.
- Cambiar foto por otra.
- Publicar o hacer privado un recuerdo.
- Favorito / destacado.
- Asociar recuerdo a un capítulo.
- Dedicatoria de foto con IA.
- Agregar/editar capítulos.
- Escribir capítulos con IA.
- Planes, cápsulas, eventos, logros, perfiles, playlist y preguntas.
- Papelera y restauración.
- Historial de cambios (`change_log`).
- Backup JSON.
- Generar un libro PDF con carta, capítulos y recuerdos.

### IA

La IA es opcional y funciona mediante:

`GitHub Pages → Supabase Edge Function → OpenAI Responses API`

La Edge Function:

- requiere JWT válido;
- rechaza usuarios anónimos;
- usa `OPENAI_API_KEY` desde Supabase Secrets;
- nunca expone la clave en GitHub;
- recibe “memoria” contextual de capítulos, recuerdos, fechas y planes.

Puede ayudar a generar:

- razones;
- cartas;
- capítulos;
- dedicatorias;
- ideas;
- preguntas;
- Wrapped/resúmenes.

### Seguridad

- RLS en base de datos.
- Visitantes anónimos separados de cuentas permanentes mediante `is_anonymous`.
- Bucket público y bucket privado independientes.
- URLs firmadas para archivos privados.
- Papelera lógica.
- Historial de cambios.
- Backup manual.

### Diagnóstico integrado

`diagnostics.html` comprueba configuración, Auth, tablas, Storage, permisos y la Edge Function sin mostrar credenciales.

### PWA

- `manifest.webmanifest`.
- Service Worker.
- Instalable como app cuando el navegador lo permite.
- El shell principal queda en caché para una experiencia básica offline.
- Los datos nuevos de Supabase requieren conexión.

---

# Instalación rápida

## 1. Supabase

Crea un proyecto nuevo.

## 2. Base de datos

Ejecuta entero:

`supabase/setup.sql`

## 3. Anonymous Sign-Ins

Actívalo en Supabase Authentication. Es necesario para guardar la propuesta sin pedir login.

## 4. Cuentas de administración

Crea manualmente una cuenta para David y, si quieres, otra para Madeline en **Authentication → Users**.

## 5. Credenciales del frontend

Edita solamente:

`js/config.js`

```js
export const APP_CONFIG = {
  supabase: {
    url: 'https://TU-PROYECTO.supabase.co',
    key: 'sb_publishable_XXXXXXXXXXXX',
    publicBucket: 'couple-public',
    privateBucket: 'couple-private',
    aiFunction: 'romantic-ai'
  },
  // ...
};
```

Para el núcleo de la página no necesitas ninguna otra credencial.

## 6. IA opcional

Consulta `OPENAI_SETUP.md`.

Sí necesitas una API key de OpenAI para usar OpenAI. Esa clave se guarda una sola vez en **Supabase Secrets**, no en el proyecto público.

## 7. GitHub Pages

Consulta `GITHUB_PAGES.md`.

---

# Estructura

```text
.
├── index.html
├── album.html
├── together.html
├── admin.html
├── diagnostics.html
├── 404.html
├── manifest.webmanifest
├── sw.js
├── .nojekyll
│
├── css/
│   └── styles.css
│
├── js/
│   ├── config.js             ← SOLO URL + publishable/anon key
│   ├── supabase.js
│   ├── shared.js
│   ├── home.js
│   ├── album.js
│   ├── together.js
│   ├── admin.js
│   ├── diagnostics.js
│   ├── ai.js
│   ├── export.js
│   └── pwa.js
│
├── assets/
│   ├── audio/our-theme.wav
│   └── icons/heart.svg
│
└── supabase/
    ├── setup.sql
    ├── config.toml
    └── functions/
        └── romantic-ai/
            └── index.ts
```

# Importante

La publishable/anon key de Supabase está diseñada para usarse en clientes públicos cuando RLS está correctamente configurado. No confundas esa clave con una Supabase Secret Key o `service_role`.

La API key de OpenAI es secreta y jamás debe entrar en este repositorio.

Lee también:

- `START_HERE.txt`
- `SUPABASE_SETUP.md`
- `OPENAI_SETUP.md`
- `GITHUB_PAGES.md`
- `SECURITY.md`
