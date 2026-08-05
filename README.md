# Vysite Bonos · v4 (Next.js + Supabase)

Aplicación de gestión de bonos de horas. Frontend en Next.js, base de datos y
autenticación en Supabase.

## Variables de entorno (obligatorias)

En Vercel, en **Settings → Environment Variables**, añade estas dos:

```
NEXT_PUBLIC_SUPABASE_URL = https://xmbolgxnljbugmyvuxzm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_mFXiFXKvR9qQGAXZMuG2KQ_rWG8K6dA
```

Son claves públicas (seguras de exponer): el acceso a los datos está protegido
por las políticas RLS de Supabase.

## Desplegar en Vercel — Opción A: panel web (sin terminal)

1. Sube esta carpeta a un repositorio nuevo en GitHub.
2. En vercel.com → **Add New → Project → Import** ese repositorio.
3. Vercel detecta Next.js solo. No cambies nada del build.
4. Antes de pulsar Deploy, abre **Environment Variables** y pega las dos de arriba.
5. **Deploy**. En ~1 min tendrás una URL `*.vercel.app`.

## Desplegar en Vercel — Opción B: terminal

```bash
npm i -g vercel
cd vysite-bonos
vercel            # primera vez: login y crear proyecto
# añade las env vars cuando lo pida, o luego en el panel
vercel --prod
```

## Subdominio bonos.vysite.es

Una vez desplegado, en Vercel → **Settings → Domains** añade `bonos.vysite.es`.
Vercel te dará un registro CNAME que hay que crear en el panel DNS de Hostsuar.
(Te guío en ese paso cuando llegues.)

## Login

- Admin: comercial@vysite.es
- La contraseña es la que configuraste. Cámbiala desde Administración cuando puedas.

## Estructura

- `app/` — páginas (login, panel, portal)
- `components/` — UI reutilizable (firmas, navegación, admin)
- `lib/` — clientes Supabase, generación de PDF, tipos
- Edge Functions (ya desplegadas en Supabase): `portal-cliente`, `admin-usuarios`
