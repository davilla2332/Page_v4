# Seguridad del proyecto

- El frontend usa solamente Project URL + Publishable/anon key.
- RLS está habilitado en todas las tablas relevantes.
- Anonymous Sign-Ins permite registrar el “Sí”, pero `is_anonymous=true` impide escritura administrativa.
- El panel requiere una cuenta permanente creada por ti en Supabase Authentication.
- El bucket privado solo permite lectura/escritura a cuentas permanentes.
- OpenAI vive en una Edge Function y su API key solo existe en Supabase Secrets.
- Existe papelera lógica (`deleted_at`) para evitar borrados accidentales.
- `change_log` conserva un historial de modificaciones importantes.
- El panel puede exportar un backup JSON.

## Advertencia sobre el enlace público

El botón de propuesta está diseñado para una página que compartes con la persona correcta. Cualquier visitante que tenga el enlace antes de la respuesta puede pulsar “Sí” y fijar el estado global. Si necesitas protección adicional por invitación/PIN, añade una capa de acceso antes de compartir públicamente.
