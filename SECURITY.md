# Seguridad

- La web usa únicamente la URL del proyecto y la clave pública/publishable de Supabase.
- Nunca subas a GitHub una `service_role` ni una secret key de Supabase.
- Las operaciones sensibles se protegen con Row Level Security (RLS).
- Los visitantes públicos usan sesión anónima.
- La edición requiere una cuenta permanente creada manualmente en Supabase Authentication.
- Los recuerdos privados se guardan en un bucket privado y se sirven mediante URLs firmadas a usuarios autorizados.
- Mantén desactivado el registro público por correo si solamente David y Madeline deben administrar el sitio.
