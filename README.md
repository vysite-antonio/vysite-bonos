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
- `lib/` — clientes Supabase, generación de PDF, tipos, regla de horas
- Edge Functions (ya desplegadas en Supabase): `portal-cliente`, `admin-usuarios`

## ⚠️ Regla de facturación — vive en DOS sitios, tócalos juntos

Las horas facturables de un servicio (mínimo 1h presencial, bloques de 30 min,
10 min de cortesía; bloques de 30 min desde el primer minuto en remota) se
calculan en dos implementaciones independientes que **deben dar siempre el
mismo resultado**:

1. **`calcular_horas_facturables`** (función SQL en Supabase) — es la fuente
   de verdad. Es la que de verdad descuenta horas de los bonos, invocada
   desde `registrar_servicio` y `registrar_servicio_suelto`.
2. **`calcularHorasFacturables`** en `lib/horas.ts` — usada solo para
   mostrarle al técnico, en `components/FormNuevoServicio.tsx`, una
   previsualización de las horas que se le van a descontar antes de guardar.

**Si cambias la regla, cambia las dos.** Después de tocar cualquiera de las
dos, ejecuta:

```bash
npm test
```

`lib/horas.test.ts` cubre los casos límite de ambas modalidades. Los valores
esperados de ese archivo se verificaron ejecutando `calcular_horas_facturables`
directamente en Supabase — si cambias la regla SQL, vuelve a verificar los
números ahí antes de actualizar el test, no al revés.
