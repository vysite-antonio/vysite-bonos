# Código que vive en Supabase

Ojo: **esta carpeta no es el historial completo de la base de datos.**

El esquema y las funciones de `vysite-bonos` se han ido creando directamente
sobre el proyecto de Supabase (`xmbolgxnljbugmyvuxzm`), sin migraciones
versionadas. Lo que hay aquí es el registro de los cambios aplicados **a partir
del 6 de agosto de 2026**, para que al menos de ahí en adelante se pueda ver
qué se tocó y por qué sin tener que abrir el panel de Supabase.

Si alguna vez hace falta reconstruir el proyecto entero desde cero, la fuente
de verdad sigue siendo el propio Supabase, no esta carpeta.

## Contenido

- `migraciones/` — SQL aplicado, con la fecha en el nombre. Ya está ejecutado en
  producción; están aquí como documentación, no para volver a lanzarlos.
- `functions/` — código de las edge functions. **Esta sí conviene mantenerla
  sincronizada**: si editas una función en el panel de Supabase, copia el
  resultado aquí, porque si no el único sitio donde existe es la nube.

## Envío de emails (Brevo)

`enviar-parte` y `enviar-resumen` mandan correos vía Brevo (`api.brevo.com/v3/smtp/email`).
Antes usaban Resend; se migraron el 2026-08-06 sin tocar el esquema, porque la
API key y el remitente ya vivían fuera del código, en la tabla `config`
(fila `clave = 'email'`, columna `valor` jsonb con `brevo_api_key`,
`remitente_nombre`, `remitente_email`, `asunto`, `plantilla_html`).

Esa fila se edita desde Admin > Ajustes (`components/admin/AdminConfig.tsx`),
no hace falta tocar la base de datos a mano. `enviar-parte` se invoca sola al
guardar un parte nuevo (si el cliente tiene email en su ficha); también sirve
para el botón "Enviar prueba" de Ajustes, sin PDF adjunto.

## Papelera (bonos eliminados, partes anulados)

`eliminar_bono` ya no borra la fila: pone `eliminado = true` y el bono
desaparece de las vistas normales (dashboard, admin, selector de "nuevo
servicio", portal del cliente) pero sigue existiendo, así que el historial de
sus partes no se rompe. `restaurar_bono` lo devuelve a la normalidad.
`purgar_papelera()` borra de verdad los que llevan más de 30 días en la
papelera, saltándose (sin fallar) los que todavía tengan algún parte
asociado — esos se quedan indefinidamente, restaurables, marcados en la UI
como "no se pudo purgar".

Los partes de trabajo no tienen un delete real, solo `anular_servicio`
(ya existía). `reactivar_servicio` es su inverso: solo funciona dentro de los
primeros 30 días desde la anulación: pasado ese plazo el parte se queda
anulado para siempre (el registro nunca desaparece del historial, solo deja
de poder recuperarse desde la papelera).

`components/admin/AdminPapelera.tsx` (pestaña Admin > Papelera) llama a
`purgar_papelera()` cada vez que se abre, antes de listar lo que hay.

## Parte rápido (clientes sin bono)

`/panel/parte-rapido` (`components/FormParteRapido.tsx`) es un flujo mínimo
para clientes puntuales o que todavía no tienen un bono de horas contratado.
Usa dos funciones que ya existían en la base de datos desde antes pero no se
llamaban desde ningún sitio del frontend:

- `crear_cliente_rapido(nombre, cif, direccion, telefono, email)` — solo el
  nombre es obligatorio; se puede invocar sin salir del formulario del parte.
- `registrar_servicio_suelto(...)` — igual que `registrar_servicio` pero
  inserta el parte con `bono_id = null`, sin tocar ningún bono. Aplica la
  misma regla de horas facturables (`calcular_horas_facturables`) que el
  flujo normal.

El PDF (`lib/pdf.ts`) detecta `horasTotales <= 0` y omite el bloque "ESTADO
DEL BONO" en vez de dividir por cero. La firma sigue siendo obligatoria,
igual que en un parte con bono.

## Tipos TypeScript del esquema

`lib/database.types.ts` está generado, no se edita a mano. Es el `Database`
que produce el MCP de Supabase (`generate_typescript_types`) a partir del
esquema real de `xmbolgxnljbugmyvuxzm`. `lib/types.ts` construye los tipos que
usa el resto de la app (`Cliente`, `Bono`, `Servicio`, `Perfil`) a partir de
ahí con el helper `Tables<"tabla">`, añadiendo solo lo que la BD no expresa:
las uniones literales (`rol`, `tipo`, `modalidad`) y los campos de join que
llegan al hacer `select("*, clientes(nombre)")` pero no son columnas reales.

Después de cualquier migración que cambie columnas o funciones RPC, hay que
regenerar `lib/database.types.ts`: MCP de Supabase → `generate_typescript_types`
(project_id `xmbolgxnljbugmyvuxzm`) → pegar el resultado tal cual (sin tocar
el comentario de cabecera) → revisar que `lib/types.ts` siga compilando
(`npx tsc --noEmit`).

## Recordatorio sobre la regla de facturación

Las horas facturables se calculan en dos sitios que tienen que decir siempre lo
mismo:

- `public.calcular_horas_facturables` en SQL — es la que manda, la que descuenta
  horas de los bonos de verdad.
- `lib/horas.ts` en el frontend — solo para enseñarle al técnico una vista
  previa mientras rellena el formulario.

Si cambias la regla, cambia las dos y actualiza `lib/horas.test.ts`.
