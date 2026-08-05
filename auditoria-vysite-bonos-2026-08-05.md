# Auditoría de solo lectura — Vysite Bonos

Fecha: 5 de agosto de 2026
Alcance: código local (Next.js) + proyecto Supabase `xmbolgxnljbugmyvuxzm` (ACTIVE_HEALTHY)
Método: lectura de archivos, `SELECT` sobre `pg_catalog`/`information_schema`/tablas, `list_tables`, `get_advisors`, inspección de Edge Functions vía API de Supabase. **No se ha modificado código ni aplicado migraciones durante esta auditoría.**

> **Nota de transparencia sobre el punto de partida.** Antes de que pidieras esta auditoría, en esta misma sesión ya había empezado a corregir el problema 1 de tu lista: apliqué la migración `12_anular_servicio` (columnas `anulado*` en `servicios`, función `anular_servicio`, helper `_devolver_horas_a_bono`, y una reescritura de `desasignar_servicio_de_bono` para reutilizar ese helper), redesplegué `portal-cliente` para excluir partes anulados, y reescribí `app/panel/historial/page.tsx` y `lib/types.ts` (paginación + badge de anulado). Todo eso ya está en producción/en el proyecto Supabase. El resto de tu lista (firmas en Storage, `lib/horas.ts`, token de portal) **no** se ha tocado. Esta auditoría evalúa el estado real tal cual está ahora mismo, incluyendo esos cambios ya aplicados — y encontré un problema en ellos (ver C4).

---

## Resumen ejecutivo

1. **Hay una vulnerabilidad activa, explotable hoy, más grave que cualquiera de tus 5 problemas**: las dos versiones de `registrar_servicio` no comprueban autenticación ni rol internamente, y el rol `anon` (la clave pública que va embebida en el JS de cualquier visitante) tiene permiso de ejecución. Cualquiera puede crear partes falsos y descontar horas de bonos reales sin iniciar sesión.
2. **Confirmado y agravado**: el formulario de producción llama a la versión de `registrar_servicio` que NO aplica `calcular_horas_facturables`. Hoy, todo servicio se factura por tiempo exacto, no por la regla validada (mínimo 1h, bloques de 30 min, cortesía). Tu problema 4 (tests de una duplicación) parte de una premisa que no existe todavía: `lib/horas.ts` no existe en el repo.
3. **El token del portal de cliente no es solo un problema de caducidad**: hoy viaja al navegador de *cualquier técnico autenticado* (no solo administradores) porque varias pantallas hacen `select("*")` sobre `clientes` y la política RLS de lectura no distingue rol. Regenerar el token (tu problema 5) no cierra esto por sí solo.
4. **La función `anular_servicio` que ya apliqué esta sesión tiene un hueco**: ni `asignar_servicio_a_bono` ni `desasignar_servicio_de_bono` comprueban el nuevo flag `anulado`, lo que permite doble devolución de horas o reasignar un parte ya anulado.
5. **Los borrados de cliente/bono en Administración fallan en silencio** cuando hay servicios asociados (las FK son `RESTRICT`), porque el frontend no comprueba el `error` de Supabase: la fila desaparece de la pantalla aunque el borrado real no se haya producido.

---

## 1. Mapa del proyecto

### Estructura

```
app/
  layout.tsx              — Root layout, fuentes, metadata
  page.tsx                — redirect("/panel")
  login/page.tsx          — Client Component, signInWithPassword
  auth/salir/route.ts     — Route Handler POST, signOut
  panel/layout.tsx        — Server Component: valida sesión + perfil activo, monta PanelNav
  panel/page.tsx          — Server Component: dashboard, medidor agregado de horas
  panel/nuevo-servicio/page.tsx — Server Component: carga clientes/bonos/técnicos, monta FormNuevoServicio
  panel/historial/page.tsx      — Client Component: lista paginada de servicios (reescrita esta sesión)
  panel/admin/page.tsx    — Server Component: guarda de rol admin + AdminTabs
  portal/page.tsx         — Client Component público: llama a Edge Function portal-cliente por token
components/
  FormNuevoServicio.tsx   — Client, RPC registrar_servicio
  FirmaPad.tsx            — wrapper de signature_pad
  PanelNav.tsx            — navegación superior
  admin/AdminTabs|AdminClientes|AdminBonos|AdminUsuarios.tsx
lib/
  supabase-browser.ts / supabase-server.ts — factories de cliente Supabase (browser vs SSR cookies)
  pdf.ts                  — generación del PDF con jsPDF
  types.ts                — tipos manuales (no generados)
middleware.ts             — redirige /panel sin sesión → /login, y /login con sesión → /panel
```

Edge Functions (viven solo en Supabase, no hay carpeta `supabase/functions` en el repo local — si el proyecto se pierde, su código solo existe en la nube):
`portal-cliente` (pública), `admin-usuarios` (JWT), `enviar-parte` (JWT), `enviar-resumen` (pública con validación propia por token).

### Flujo típico (registrar un servicio)

`FormNuevoServicio.tsx` (Client) → `supabase.rpc("registrar_servicio", {...})` con la **clave anon** → Postgres ejecuta la función `SECURITY DEFINER` (bypassa RLS) → inserta en `servicios` (trigger `asignar_num_parte` calcula el número) → actualiza `bonos.horas_usadas` → el resultado vuelve al cliente → se genera el PDF en el navegador con `jsPDF` → se descarga. **En ningún punto de este flujo hay una llamada a un endpoint que verifique el rol del que llama** — ver hallazgo crítico C1.

### Convenciones inconsistentes

- Mezcla deliberada y correcta de Server Components (páginas que cargan datos: `panel/page.tsx`, `panel/admin/page.tsx`, `panel/nuevo-servicio/page.tsx`, `panel/layout.tsx`) y Client Components (todo lo interactivo). No es un problema, es el patrón normal de App Router, pero `historial/page.tsx` es 100% Client y hace sus propias comprobaciones de sesión/rol por su cuenta (líneas 66-76 del archivo reescrito) en vez de recibir el rol como prop desde un Server Component padre, que es como se hace en `panel/layout.tsx` y `panel/admin/page.tsx`. Inconsistencia menor de patrón, no de seguridad (RLS respalda igualmente).
- Nombres: todo en español (`clientes`, `bonos`, `guardar`, `borrar`) salvo los tipos TypeScript, correcto y consistente.
- Los tres componentes de listado (`AdminBonos`, `panel/page.tsx`, `portal/page.tsx`) reimplementan el mismo cálculo de "nivel" del medidor (65%/85%) de forma independiente — ver M1.
- `lib/types.ts` es mantenido a mano; ya estaba desincronizado del esquema real antes de mi edición de esta sesión (le faltaban `modalidad`, `firmante_nombre`, y `bono_id` no reflejaba que es nullable desde la migración 09). Sin tipos generados, esto puede volver a desincronizarse en cualquier migración futura — ver sección 5.

### Dependencias (`package.json`)

Todas las dependencias declaradas están en uso real (verificado por `grep` de imports): `@supabase/ssr`, `@supabase/supabase-js`, `jspdf`, `next`, `react`, `react-dom`, `signature_pad`. No hay paquetes muertos. Versiones (`next@^16.2.7`, `react@19.0.0`) son recientes; no hay forma de saber desde aquí si hay CVEs pendientes sin acceso a un feed de vulnerabilidades — no lo he comprobado. No hay `devDependencies` de testing (ni `jest`, ni `vitest`, ni `@testing-library/*`), lo cual es coherente con que no exista ni un solo test en el repo.

---

## 2. Dónde vive cada regla de negocio (duplicaciones)

| Regla | Dónde vive hoy | Problema |
|---|---|---|
| Horas facturables (mínimo 1h, bloques 30 min, cortesía) | Solo en SQL: `calcular_horas_facturables`. **No existe `lib/horas.ts`** todavía en el repo. | No es una duplicación real todavía — es una regla que existe en un solo sitio (bien) pero que **el frontend no usa** (mal, ver C2). Tu problema 4 debe ampliarse: primero conectar la regla, luego evitar que se duplique. |
| Duración mostrada en el formulario | `FormNuevoServicio.tsx` líneas 47-51: `(fin - inicio) / 3600000`, un cálculo de milisegundos que **no replica** `calcular_horas_facturables` (no aplica mínimo ni bloques). | Hoy "coincide por casualidad" con lo que factura el backend, porque el backend tampoco aplica la regla (ambos hacen el cálculo bruto). En cuanto conectes `modalidad` y la función nueva, este preview divergirá del importe real si no se sustituye por una implementación fiel a `calcular_horas_facturables`. |
| Consumir horas de un bono + desactivarlo si se agota (`horas_usadas + h >= horas_totales`) | Duplicado en **4 sitios** de SQL: `registrar_servicio` (versión vieja), `registrar_servicio` (versión nueva), `asignar_servicio_a_bono`, `registrar_servicio_historico`. | A diferencia de la devolución de horas (que sí centralicé en `_devolver_horas_a_bono` esta sesión), la dirección de "consumir" no tiene helper común. Si cambia el umbral de agotamiento, hay que tocar 4 funciones y es fácil olvidar una. |
| Rol de administrador | Canónico en `es_admin()`, reutilizado correctamente por casi todas las funciones SECURITY DEFINER y por las políticas RLS. | Bien hecho — la única inconsistencia es que `registrar_servicio` (ambas versiones) **no llama a `es_admin()` ni a nada equivalente** (ver C1), rompiendo el patrón que sí siguen sus hermanas (`asignar_servicio_a_bono`, `desasignar_servicio_de_bono`, `anular_servicio`, `registrar_servicio_historico`). |
| Formato de fecha `dd/mm/aaaa` | `s.fecha.split("-").reverse().join("/")` repetido en `historial/page.tsx`, `portal/page.tsx` y `lib/pdf.ts`. | Menor — una función `formatFechaEs()` en `lib/` lo centralizaría. |
| Umbrales de color del medidor (65% / 85%) | Repetido en `AdminBonos.tsx`, `app/panel/page.tsx`, `app/portal/page.tsx`. | Menor — mismo patrón, mismo arreglo. |

**Conclusión de esta sección**: la duplicación que ya conocías (horas facturables) en realidad todavía no existe como *duplicación* — existe como *regla no conectada*. La duplicación real y más peligrosa que no habías detectado es la del "consumir horas" repetida 4 veces en SQL.

---

## 3. Estado real de la base de datos

### `registrar_servicio`: qué versión usa el frontend

`FormNuevoServicio.tsx` (líneas 87-101) llama a `supabase.rpc("registrar_servicio", {...})` con estos parámetros: `p_bono_id, p_cliente_id, p_trabajador_id, p_trabajador_nombre, p_tipo, p_fecha, p_hora_inicio, p_hora_fin, p_descripcion, p_material, p_firma_cliente, p_firma_tecnico, p_creado_por` — **13 argumentos, sin `p_modalidad` ni `p_firmante_nombre`**. Esa es la firma de la versión **antigua**, la que calcula `v_horas := round(extract(epoch from (p_hora_fin - p_hora_inicio)) / 3600.0, 2)` en vez de usar `calcular_horas_facturables`.

La versión nueva (15 parámetros, con `p_modalidad` y `p_firmante_nombre`, que sí llama a `calcular_horas_facturables`) **no la invoca nadie en el frontend**. No es residuo seguro de retirar sin más: es la que deberías empezar a usar. Retirar la vieja sin antes migrar el formulario rompería el registro de servicios de inmediato.

### Ciclo de vida de un parte (`servicios`)

```
                registrar_servicio(bono_id, ...)
                        │
                        ▼
   ┌─────────────────────────────────┐
   │  servicios.bono_id = <bono>     │◄──────────────┐
   │  (horas ya descontadas)         │                │
   └───────────┬─────────────────────┘                │
               │ desasignar_servicio_de_bono           │ asignar_servicio_a_bono
               ▼ (devuelve horas, bono_id = NULL)       │ (descuenta horas, bono_id = <bono>)
   ┌─────────────────────────────────┐                │
   │  servicios.bono_id = NULL       │────────────────┘
   │  ("suelto", vía registrar_      │
   │   servicio_suelto o desasignado)│
   └───────────┬─────────────────────┘
               │
               ▼ anular_servicio (cualquier estado)
   ┌─────────────────────────────────┐
   │  servicios.anulado = true       │  ← devuelve horas SOLO si bono_id no era NULL
   │  bono_id se CONSERVA tal cual   │     en el momento de anular (decisión de diseño
   │  estaba (no se toca)            │     de esta sesión, para no perder el histórico
   └─────────────────────────────────┘     de a qué bono perteneció)
```

Puntos que **no** están cerrados en este ciclo (ver C4 más abajo): ni `asignar_servicio_a_bono` ni `desasignar_servicio_de_bono` comprueban `anulado`, así que un parte anulado puede seguir moviéndose entre "suelto" y "asignado" como si no hubiera pasado nada, con las consecuencias que detallo en C4.

### Políticas RLS — ¿protegen lo que dicen proteger?

| Tabla | Políticas | Observación |
|---|---|---|
| `profiles` | `ver perfiles`: `id = auth.uid() OR es_admin()`. `admin gestiona perfiles`: `es_admin()` para todo. | Correcto: cada uno ve su perfil, admin ve todos. |
| `clientes` | `ver clientes`: `auth.uid() IS NOT NULL` (SELECT). `admin gestiona clientes`: `es_admin()` (ALL). | La policy de SELECT da acceso a **todas las columnas**, incluida `token_portal`, a **cualquier** usuario autenticado, no solo admin. Ver C3. |
| `bonos` | Igual patrón que `clientes`. | Mismo comentario: cualquier técnico ve todos los bonos de todos los clientes. Puede ser intencional (equipo pequeño) pero no está documentado como decisión explícita en ningún sitio. |
| `servicios` | `ver servicios`: `auth.uid() IS NOT NULL`. `admin edita servicios` (UPDATE): `es_admin()`. `admin borra servicios` (DELETE): `es_admin()`. **No hay policy de INSERT** — pero no hace falta, porque la escritura real pasa por funciones `SECURITY DEFINER` que bypassan RLS. | Coherente con el diseño (escritura solo vía RPC), pero significa que la única barrera real para insertar servicios es la lógica *dentro* de esas funciones — y `registrar_servicio` no tiene ninguna (C1). |
| `config` | `solo admin config`: `es_admin()` para todo. | Correcto. |
| `contador_partes` | `nadie toca contador`: `false` para todo. | Correcto — solo se toca vía el trigger `SECURITY DEFINER`, que bypassa RLS. |

Ninguna tabla está sin RLS (las 6 tienen `rls_enabled = true`). No encontré ninguna tabla "accesible de más" en el sentido de faltarle RLS — el problema no es la ausencia de políticas, es que las políticas de lectura son deliberadamente amplias (`auth.uid() IS NOT NULL`) y no hay forma de acotar por columna dentro de una policy de tabla, lo que empuja el problema hacia "qué columnas selecciona cada pantalla" (C3).

### Funciones, columnas y Edge Functions sin usar

Confirmado por `grep` sobre `app/` y `components/` — ninguna referencia en el frontend a:

- Funciones: `crear_cliente_rapido`, `registrar_servicio_historico`, `asignar_servicio_a_bono`, `desasignar_servicio_de_bono` (esta última solo se invoca desde dentro de `anular_servicio`, nunca desde la UI).
- Columnas: `clientes.direccion`, `bonos.notas`, `servicios.fecha_asignacion_bono`.
- Edge Functions: `enviar-parte` y `enviar-resumen` no los invoca ningún componente. Además, ambas dependen de `config.email.resend_api_key`, y esa clave **no existe** hoy en la tabla `config` (solo están `asunto`, `plantilla_html`, `remitente_email`, `remitente_nombre`) — aunque alguien las invocara, fallarían con "Falta la API key de Resend".

No es necesariamente un problema — puede ser funcionalidad a medio construir (importación de histórico, asignación manual de partes sueltos, envío de resumen por email) que simplemente no se ha conectado a la UI todavía. Lo señalo como inventario, no como bug.

### Datos actuales

Volumen real en producción ahora mismo: 1 cliente, 1 bono, 1 perfil (admin), 0 servicios (los 5 que había de pruebas se limpiaron en esta sesión). Es decir, **el proyecto está prácticamente sin usar en producción todavía** — buen momento para corregir estas cosas antes de que haya datos reales en riesgo.

---

## 4. Riesgos que no estaban en tu lista

### 🔴 Crítico — C1: `registrar_servicio` es invocable de forma completamente anónima

Verificado por dos vías independientes:

1. **Grants de PostgreSQL** (`aclexplode(proacl)`): ambas versiones de `registrar_servicio`, más `registrar_servicio_suelto`, `asignar_num_parte`, `crear_cliente_rapido`, `handle_new_user`, tienen `EXECUTE` concedido a los roles `anon`, `authenticated`, `service_role` y `postgres`. El rol `anon` es el que usa **cualquier visitante sin sesión** con la clave pública `NEXT_PUBLIC_SUPABASE_ANON_KEY` (que está en el bundle JS de la app, visible por diseño).
2. **Cuerpo de la función**: ninguna de las dos versiones de `registrar_servicio` contiene `if not es_admin()`, `if auth.uid() is null`, ni ninguna comprobación equivalente. Solo valida que el bono exista y esté activo.

Comparado con sus funciones hermanas (`asignar_servicio_a_bono`, `desasignar_servicio_de_bono`, `anular_servicio`, `registrar_servicio_historico`, que sí llaman a `es_admin()`; `registrar_servicio_suelto`, `crear_cliente_rapido`, que sí comprueban `auth.uid() is null`), `registrar_servicio` es la única que rompe el patrón.

**Consecuencia real**: cualquiera que sepa la URL de tu Supabase y la clave anon (ambas públicas por diseño, están en el README y en el bundle) puede hacer un `POST` directo a `/rest/v1/rpc/registrar_servicio` sin haber iniciado sesión nunca, y crear partes de trabajo falsos que descuentan horas reales de bonos de clientes reales. No hace falta ni una cuenta de técnico.

*Lo que no he hecho*: no he ejecutado la llamada anónima real para "demostrarlo" en vivo, porque habría escrito datos falsos en tu base de datos de producción y esta auditoría es de solo lectura. La conclusión se basa en evidencia de grants + código, que considero suficiente para actuar, pero no es una prueba de explotación end-to-end.

### 🔴 Crítico — C2: ninguna llamada real aplica la regla de facturación (confirmación de tu sospecha, agravada)

Ya lo sabías en parte; lo confirmo con evidencia de código: la única función que el frontend invoca calcula `v_horas` como tiempo exacto (línea `v_horas := round(extract(epoch from (p_hora_fin - p_hora_inicio)) / 3600.0, 2)`), sin pasar por `calcular_horas_facturables`. Esto significa que **desde que existe la app, ningún bono se ha descontado según la regla de mínimo 1h/bloques de 30 min/cortesía** — se descuenta el tiempo literal marcado en el formulario. Con 0 servicios reales en producción ahora mismo, el impacto económico hasta hoy es nulo, pero es el momento exacto de arreglarlo antes de que empiece a usarse de verdad.

### 🔴 Crítico — C3: el token del portal de cliente se expone a cualquier técnico, no solo a admin

`app/panel/historial/page.tsx` y `app/panel/nuevo-servicio/page.tsx` hacen `supabase.from("clientes").select("*")`. La política RLS de lectura de `clientes` es `auth.uid() IS NOT NULL` — es decir, cualquier técnico autenticado, no solo un admin. RLS no filtra columnas, así que ese `select("*")` trae `token_portal` (el "bearer token" del portal de autoservicio del cliente) al navegador de cualquier técnico, visible en la respuesta de red y en el estado de React, aunque la UI no lo muestre en pantalla.

**Consecuencia**: cualquier técnico (no necesariamente con malas intenciones, pero es una superficie de exposición innecesaria) puede reconstruir el enlace del portal de cualquier cliente sin pedírselo a un admin. Tu problema 5 (botón para regenerar el token) es necesario pero no soluciona esto: si el token sigue siendo legible por cualquier sesión de técnico, regenerarlo solo reinicia el reloj, no cierra la exposición.

**Recomendación**: seleccionar columnas explícitas (sin `token_portal`) en toda pantalla que no sea la de Administración → Clientes, y considerar mover `token_portal` a una tabla/función separada solo accesible vía `es_admin()` o vía la Edge Function con service role.

### 🔴 Crítico — C4: hueco en `anular_servicio` (aplicado esta sesión) — posible doble devolución de horas

Diseñé `anular_servicio` para **conservar** `bono_id` al anular (a diferencia de `desasignar_servicio_de_bono`, que sí lo pone a `NULL`), para no perder de qué bono venía un parte anulado a efectos de auditoría. Pero eso deja una secuencia peligrosa:

1. Un parte con bono se anula → `anular_servicio` devuelve las horas al bono, pero dispara `bono_id` **se mantiene**.
2. Un admin, sin saber que ya está anulado, llama a `desasignar_servicio_de_bono` sobre ese mismo parte → como esa función solo comprueba `v_serv.bono_id is null` (y aquí no lo es), **vuelve a ejecutar la devolución de horas** — doble devolución — y además pone `bono_id = NULL`, borrando el rastro de a qué bono pertenecía.
3. Simétricamente, un parte **suelto** que se anula (`bono_id` ya era `NULL`) puede pasar por `asignar_servicio_a_bono` sin que nadie lo impida — esa función no comprueba `anulado` en absoluto — y se le descontarían horas de un bono real por un trabajo que ya fue invalidado.

**Recomendación**: añadir `if v_serv.anulado then raise exception 'Parte anulado, no se puede ...'` al principio de `asignar_servicio_a_bono` y de `desasignar_servicio_de_bono`. Es un cambio de una línea en cada una.

### 🟠 Importante — C5: los borrados en Administración fallan en silencio

`AdminClientes.tsx` (línea 40) y `AdminBonos.tsx` (línea 59) hacen `await supabase.from(...).delete().eq("id", id)` **sin comprobar `error`**, y en la línea siguiente actualizan el estado local quitando la fila optimistamente, pase lo que pase.

Las claves foráneas reales son:
- `bonos.cliente_id → clientes.id`: `ON DELETE CASCADE` (borrar un cliente sí borra sus bonos, coherente con el aviso del `confirm()`).
- `servicios.cliente_id → clientes.id` y `servicios.bono_id → bonos.id`: **`ON DELETE RESTRICT`**.

Consecuencia: si un cliente o un bono tiene aunque sea un solo servicio asociado, el `DELETE` falla en la base de datos (correctamente, para no perder historial) — pero como el error no se comprueba, la fila desaparece de la pantalla igualmente. Al recargar la página, la fila "borrada" reaparece, porque nunca se borró de verdad. Es un bug de confianza en los datos, no de pérdida de datos (la RESTRICT protege bien), pero genera una experiencia confusa y contradictoria para el admin.

### 🟠 Importante — I1: no hay firma obligatoria a nivel de base de datos

`firma_cliente` y `firma_tecnico` son columnas `nullable` sin ninguna restricción `NOT NULL` ni de longitud mínima. La validación de "firma no vacía" existe **solo en el cliente** (`FormNuevoServicio.tsx`, `estaVacia()`). Combinado con C1 (acceso anónimo), esto significa que hoy es posible crear un "parte de trabajo firmado" sin ninguna firma real, lo cual debilita el valor legal/probatorio de todo el sistema de partes.

### 🟠 Importante — I2: validaciones de negocio que solo existen en el frontend

- El aviso de "vas a superar las horas disponibles" (`FormNuevoServicio.tsx`) es un `confirm()` de JavaScript, no una restricción en `registrar_servicio`. No hay ningún tope duro que impida que un solo servicio dañe un bono muy por encima de `horas_totales`.
- La restricción de que `tipo` sea `'tecnico'` o `'marketing'` sí está respaldada por un `CHECK` en la tabla — ese caso está bien cerrado.

### 🟡 Menor — otros

- **M1–M2**: duplicación de formato de fecha y de umbrales de color del medidor, detallados en la tabla de la sección 2.
- **M3**: FKs sin índice (`bonos.cliente_id`, `servicios.bono_id/cliente_id/trabajador_id`) — señalado por el advisor de rendimiento de Supabase. Irrelevante con el volumen actual (1 bono, 0 servicios), a vigilar si crece.
- **M4**: las políticas RLS llaman a `auth.uid()`/`es_admin()` sin envolver en `(select ...)`, lo que Postgres reevalúa fila a fila — solo importa a escala.
- **M5**: en `bonos`, `clientes` y `profiles` hay dos políticas permisivas que cubren `SELECT` a la vez (`admin gestiona X` con `ALL` + `ver X` con `SELECT`) — funciona, pero evalúa de más.
- **M6**: Supabase Auth tiene desactivada la protección de contraseñas filtradas (HaveIBeenPwned) — activable en un clic desde el panel de Supabase.

---

## 5. Deuda de mantenimiento

- **Sin repositorio Git**: confirmado (`fatal: not a git repository`). No hay historial de cambios, no hay forma de revisar un diff antes de aplicar algo, no hay forma de revertir si algo sale mal, y no hay backup del código fuera de esta carpeta y de lo desplegado en Vercel/Supabase. Con 5 correcciones no triviales por delante, esto es lo primero que arreglaría, antes de tocar nada más: `git init`, primer commit del estado actual, subirlo a un repo privado en GitHub. Es barato y quita el mayor riesgo operativo de todos.
- **Sin tests**: ni siquiera de `calcular_horas_facturables`, que es la pieza de lógica más sensible económicamente de todo el proyecto. Coincide con tu problema 4, pero el problema es más amplio que "hay una duplicación sin test" — hoy no hay ningún test de nada.
- **Sin tipos generados de Supabase**: `lib/types.ts` se mantiene a mano y ya estaba desactualizado respecto al esquema real antes de esta sesión. `supabase gen types typescript` (vía CLI o el MCP `generate_typescript_types`) eliminaría esta clase de desincronización de raíz.
- **Migraciones**: esto sí está bien — hay 12 migraciones registradas y nombradas de forma consistente (`01_...` a `12_anular_servicio`), no hay SQL suelto aplicado sin registrar. Punto positivo a mantener.
- **Sin CI**: no hay ningún workflow que ejecute `next build`, lint o tests antes de desplegar. Con Vercel desplegando directamente desde el código que subas, un error de TypeScript se descubre en producción, no antes.

---

## Recomendación de orden de ataque

Tu lista de 5 seguía siendo razonable, pero dos de los cinco deberían ampliarse antes de darlos por resueltos, y hay un problema fuera de tu lista que es más urgente que todos:

1. **Nuevo, no estaba en tu lista — C1**: bloquear `registrar_servicio` para que exija sesión y compruebe rol, igual que sus funciones hermanas. Es una vulnerabilidad activa explotable sin sesión; con datos reales de clientes de por medio, va antes que cualquier otra cosa.
2. **Tu problema 4, ampliado**: no basta con testear una duplicación que hoy no existe. Hay que (a) crear `lib/horas.ts` de verdad, (b) conectar `modalidad` al formulario y cambiar la llamada a la versión de `registrar_servicio` que sí aplica la regla, y solo entonces (c) escribir los tests que pediste. Resolver esto sin lo anterior deja la regla de facturación real desconectada de la UI.
3. **Tu problema 1, cerrando el hueco C4**: ya está aplicado en su mayor parte; falta solo añadir la comprobación de `anulado` en `asignar_servicio_a_bono` y `desasignar_servicio_de_bono` (una línea cada una).
4. **Tu problema 5, ampliado con C3**: el botón de regenerar token es necesario, pero de poco sirve si el token sigue siendo legible por cualquier técnico vía `select("*")`. Hazlos juntos: columnas explícitas sin `token_portal` en toda pantalla no-admin, más el botón de regeneración.
5. **Nuevo, no estaba en tu lista — C5**: añadir manejo de `error` en los dos `borrar()` de Administración. Es un cambio de minutos con impacto alto en confianza de datos.
6. **Tu problema 2, tal como lo planteaste, más I1**: al mover las firmas a Storage, aprovecha para añadir una validación (en la función SQL, no solo en el frontend) de que ambas firmas vengan no vacías.
7. **Tu problema 3**: tal cual lo planteaste, sin cambios de enfoque — es el de menor riesgo real de los cinco y puede ir en cualquier momento del orden.
8. **Deuda**: iniciar un repositorio Git *antes* de aplicar los puntos 1-7, no después. Es la red de seguridad que falta para todo lo demás.

---

## Lo que no pude determinar sin ejecutar cambios

- No confirmé la vulnerabilidad C1 con una llamada anónima real (habría escrito datos de prueba); la conclusión se apoya en grants + ausencia de comprobación en el código, que es evidencia sólida pero no una prueba de explotación end-to-end.
- No tengo acceso a las variables de entorno configuradas en Vercel (solo a `.env.local` local, que coincide con lo documentado en el README) ni al historial de despliegues, así que no puedo confirmar qué versión del código está realmente sirviendo `vysite-bonos.vercel.app` en este momento.
- No pude comprobar si hay CVEs conocidas en las versiones exactas de `next@^16.2.7` / `react@19.0.0` sin acceso a un feed de vulnerabilidades — no lo he intentado adivinar.
- No ejecuté `npm run build` durante esta auditoría (me pediste explícitamente no modificar ni ejecutar nada); no puedo garantizar que el código compile sin errores en este momento, aunque no vi señales de tipos rotos al leer los archivos.
