# Activar la IA romántica

La página funciona sin OpenAI. Si la IA no está configurada, todas las funciones normales de Supabase siguen funcionando.

Para activar generación de cartas, razones, capítulos, dedicatorias y Wrapped con IA:

## Opción A — Dashboard de Supabase

1. Abre **Edge Functions**.
2. Crea una función llamada exactamente `romantic-ai`.
3. Copia dentro todo `supabase/functions/romantic-ai/index.ts`.
4. Déjala con verificación JWT habilitada.
5. Despliega la función.
6. Abre **Edge Function Secrets**.
7. Crea:

`OPENAI_API_KEY = tu_clave_de_OpenAI`

Opcional:

`OPENAI_MODEL = gpt-5-mini`

## Opción B — Supabase CLI

Desde la raíz del proyecto:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase secrets set OPENAI_API_KEY=TU_CLAVE
supabase secrets set OPENAI_MODEL=gpt-5-mini
supabase functions deploy romantic-ai
```

El archivo `supabase/config.toml` deja `verify_jwt = true`.

## Seguridad

La API key de OpenAI vive únicamente en Supabase Secrets. Nunca la agregues a `js/config.js`, GitHub, HTML o JavaScript público.

Además, la Edge Function rechaza sesiones anónimas: solamente las cuentas permanentes que tú creaste pueden consumir OpenAI.

## “Memoria” de la relación

Antes de llamar a la Edge Function, `js/ai.js` recopila contexto permitido desde Supabase:

- capítulos;
- recuerdos recientes;
- lugares y fechas;
- planes;
- eventos importantes.

Ese contexto acompaña la petición para que la IA pueda escribir textos relacionados con la historia real. El prompt le indica explícitamente que no invente acontecimientos no presentes en los datos.

## Si no funciona

Abre:

**Supabase → Edge Functions → romantic-ai → Logs**

y revisa la petición. Desde Chrome también puedes usar **F12 → Network → romantic-ai**.

Códigos esperados:

- 200: correcto.
- 401/403: no estás usando una cuenta permanente.
- 503: falta `OPENAI_API_KEY`.
- 502: OpenAI rechazó la petición (clave, saldo, modelo, límite, etc.).
