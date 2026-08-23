# Configuración de Supabase desde cero

## 1. Crea el proyecto

Crea un proyecto nuevo en Supabase y espera a que termine de inicializarse.

## 2. Ejecuta el SQL completo

Abre **SQL Editor → New query**, copia todo el archivo:

`supabase/setup.sql`

y pulsa **Run**.

El script crea automáticamente:

- `site_content`: textos editables de la web.
- `proposal_global_state`: guarda el “Sí” global y su primera fecha/hora.
- `proposal_acceptance`: registro por sesión/usuario que pulsó Sí.
- `memories`: fotos, videos, audios y metadatos.
- `chapters`: capítulos ilimitados.
- `memory_comments` y `memory_reactions`.
- `plans`, `events`, `capsules`, `achievements`.
- `profiles`.
- `playlist` y `couple_notes`.
- preguntas y respuestas privadas de pareja.
- `change_log`: historial de modificaciones.
- buckets `couple-public` y `couple-private`.
- políticas RLS de lectura/escritura.
- contenido romántico inicial y fechas de David/Madeline.

## 3. Activa Anonymous Sign-Ins

La página usa una sesión anónima para poder registrar la propuesta sin obligar a Madeline a crear una cuenta.

En Supabase Authentication busca la opción **Anonymous Sign-Ins** y actívala.

Los visitantes anónimos usan un JWT con `is_anonymous=true`. Las políticas del proyecto comprueban ese campo para impedirles acceder al panel, modificar recuerdos o ver contenido privado.

## 4. Crea las cuentas privadas

En **Authentication → Users**, crea manualmente las cuentas que podrán administrar la página.

Puedes crear una para David y otra para Madeline.

Recomendación: no incluyas un formulario de registro público y, si no lo necesitas, desactiva el registro libre por email. De esta manera las únicas cuentas permanentes serán las que tú hayas creado.

## 5. Copia URL y clave pública

En Supabase abre **Connect** o **Settings → API Keys** y copia:

- Project URL
- Publishable key (`sb_publishable_...`) o la anon key legacy

Edita `js/config.js`:

```js
supabase: {
  url: 'https://TU-PROYECTO.supabase.co',
  key: 'sb_publishable_XXXXXXXXXXXXXXXX'
}
```

No cambies los nombres de los buckets ni la Edge Function salvo que también cambies el código correspondiente.

## 6. Qué claves NO debes usar

Nunca pongas en el navegador:

- Secret key (`sb_secret_...`)
- `service_role`
- `OPENAI_API_KEY`

El navegador solo necesita la publishable/anon key; la seguridad real está en RLS.

## 7. La aceptación permanente

Cuando alguien pulsa **Sí, quiero ❤️**:

1. la página crea/usa una sesión anónima;
2. llama al RPC `accept_proposal_forever()`;
3. se guarda un registro en `proposal_acceptance`;
4. `proposal_global_state.accepted` pasa a `true`;
5. `accepted_at` se escribe solo la primera vez;
6. la carta se abre inmediatamente;
7. en futuras visitas la web consulta el estado global y muestra que ya dijo que sí.

“Para siempre” significa mientras conserves ese proyecto/base de datos de Supabase. Un reset o eliminación manual de la fila/basedatos naturalmente borraría el registro.

## 8. Privacidad de archivos

- `couple-public`: fotos que quieres mostrar en el álbum público.
- `couple-private`: archivos privados; se sirven mediante URL firmada solamente a cuentas permanentes.

La página no usa una contraseña hardcodeada para proteger el álbum privado.
