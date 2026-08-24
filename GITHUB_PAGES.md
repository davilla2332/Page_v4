# Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Sube todos los archivos de esta carpeta manteniendo la estructura.
3. En **Settings → Pages**, selecciona **Deploy from a branch**.
4. Elige `main` y `/ (root)`.
5. Guarda y espera a que GitHub publique la URL.

Antes de subir, configura `js/config.js` con tu Supabase URL y tu Publishable/anon key.

La clave pública de Supabase puede vivir en el frontend cuando tus tablas y Storage están protegidos correctamente con RLS. Nunca subas `service_role` ni una secret key.
