# Corrección V4.1

Esta versión corrige un problema de la V4 en el que un error 422 al crear la sesión anónima podía detener la inicialización antes de conectar los botones. Ahora la interfaz sigue siendo interactiva aunque Auth o una consulta de Supabase falle.

**Para que el botón “Sí” se guarde para siempre, sigue siendo necesario activar Anonymous Sign-Ins en Supabase Authentication.**

# David & Madeline ❤️ — V4 sin IA

Proyecto romántico completo listo para GitHub Pages + Supabase, enfocado en recuerdos, edición, privacidad y experiencias de pareja.

## Qué incluye

- Propuesta interactiva con botón “Sí” y botón “No” juguetón.
- El primer “Sí” se guarda permanentemente en Supabase con fecha y hora.
- Carta romántica que se desbloquea al aceptar y puede volver a abrirse después.
- Álbum completo de recuerdos con fotos, videos y audios.
- Recuerdos públicos y privados.
- Edición, reemplazo, papelera, restauración, favoritos y destacados.
- Título, dedicatoria, fecha, lugar, etiquetas y capítulo asociado para cada recuerdo.
- Reacciones y comentarios.
- Capítulos ilimitados y editables.
- Cápsulas del tiempo.
- Calendario, fechas importantes y cuentas regresivas.
- Mapa de recuerdos con coordenadas.
- Planes / bucket list.
- Logros de pareja.
- Frasquito de mensajes.
- Sección “Abrir cuando…”.
- Preguntas de pareja y respuestas privadas.
- Notas privadas.
- Playlist.
- Ruleta de citas y mini juego de preguntas.
- “Cómo empezó / cómo va”.
- Wrapped anual automático basado en los recuerdos.
- Generación de libro PDF.
- Backup JSON.
- Historial de cambios.
- PWA instalable.
- Panel privado de administración.
- Página de diagnóstico de Supabase.

## Instalación rápida desde cero

1. Crea un proyecto nuevo en Supabase.
2. Abre `supabase/setup.sql` y ejecútalo completo en **SQL Editor**.
3. En Supabase Authentication habilita **Anonymous Sign-Ins**.
4. En `js/config.js` coloca únicamente tu URL y tu clave pública/publishable (o anon legacy).
5. Crea manualmente las cuentas permanentes de David y Madeline en **Authentication → Users** para usar el panel privado.
6. Sube todo el proyecto a un repositorio de GitHub.
7. Activa GitHub Pages desde `main` / raíz del repositorio.

## Configuración

Edita `js/config.js`:

```js
export const APP_CONFIG = {
  supabase: {
    url: 'TU_SUPABASE_URL',
    key: 'TU_PUBLISHABLE_O_ANON_KEY',
    publicBucket: 'couple-public',
    privateBucket: 'couple-private'
  },
  couple: {
    names: 'David & Madeline',
    david: 'David',
    madeline: 'Madeline',
    startedTalking: '2026-07-12',
    firstMeeting: '2026-08-16'
  }
};
```

No pongas una `service_role` ni una secret key de Supabase en GitHub.

## Páginas

- `index.html`: historia principal y propuesta.
- `album.html`: álbum completo.
- `together.html`: rincón de pareja, Wrapped, playlist, preguntas y notas.
- `admin.html`: panel privado.
- `diagnostics.html`: comprobación de conexión.

Lee también `START_HERE.txt`, `SUPABASE_SETUP.md`, `GITHUB_PAGES.md` y `SECURITY.md`.
