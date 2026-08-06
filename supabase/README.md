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

## Recordatorio sobre la regla de facturación

Las horas facturables se calculan en dos sitios que tienen que decir siempre lo
mismo:

- `public.calcular_horas_facturables` en SQL — es la que manda, la que descuenta
  horas de los bonos de verdad.
- `lib/horas.ts` en el frontend — solo para enseñarle al técnico una vista
  previa mientras rellena el formulario.

Si cambias la regla, cambia las dos y actualiza `lib/horas.test.ts`.
