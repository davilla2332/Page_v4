# Configurar Supabase desde cero

## 1. Crear proyecto
Crea un proyecto en Supabase y espera a que termine la inicialización.

## 2. Ejecutar el esquema
Abre **SQL Editor**, crea una consulta nueva y ejecuta completo `supabase/setup.sql`.

El script crea las tablas, funciones, políticas RLS y buckets requeridos por la aplicación.

## 3. Habilitar visitantes anónimos
En Authentication habilita **Anonymous Sign-Ins**. La propuesta pública usa una sesión anónima para registrar de forma segura el primer “Sí”.

## 4. Crear cuentas permanentes
En **Authentication → Users** crea manualmente las cuentas que podrán editar el sitio. No incluyas un formulario de registro público.

## 5. Obtener credenciales públicas
Copia la **Project URL** y la **Publishable key** (o anon key legacy) y colócalas en `js/config.js`.

Nunca uses `service_role` ni una secret key dentro de una web pública.

## 6. Storage
El SQL crea:
- `couple-public`: contenido público del álbum.
- `couple-private`: contenido privado visible únicamente para cuentas permanentes autorizadas.

## 7. Prueba
Publica la web y abre `diagnostics.html`. Comprueba que Auth, tablas y Storage respondan correctamente.
