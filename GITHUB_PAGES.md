# Publicar en GitHub Pages

## Desde la web de GitHub

1. Crea un repositorio nuevo, por ejemplo `david-y-madeline`.
2. Sube **el contenido de esta carpeta**, no la carpeta contenedora dentro de otra carpeta.
3. Confirma que `index.html` esté en la raíz del repositorio.
4. Haz commit.
5. Ve a **Settings → Pages**.
6. En Source selecciona **Deploy from a branch**.
7. Branch: `main`.
8. Folder: `/ (root)`.
9. Guarda.

Tras unos minutos GitHub mostrará la URL de la página.

## Actualizaciones futuras

Los textos, fotos, capítulos, cápsulas y planes se guardan en Supabase, así que normalmente NO necesitas hacer un commit para cambiar contenido.

Solo tendrás que actualizar GitHub cuando modifiques código, estilos o agregues nuevas funciones técnicas.

## Archivos que sí se publican

`js/config.js` contiene la URL y publishable/anon key de Supabase. Es normal que una clave pública aparezca en el frontend; por eso el SQL configura RLS.

Nunca subas una secret key de Supabase, `service_role` ni `OPENAI_API_KEY`.
