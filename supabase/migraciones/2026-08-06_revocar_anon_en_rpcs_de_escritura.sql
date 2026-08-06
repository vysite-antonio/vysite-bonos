-- Aplicada el 2026-08-06. Ya está ejecutada en producción.
--
-- El linter de Supabase avisa de que varias funciones SECURITY DEFINER que
-- escriben datos son invocables por el rol anon (sin sesión) vía /rest/v1/rpc.
-- Hoy no son explotables porque todas comprueban es_admin() o auth.uid() por
-- dentro y fallan, pero no hay ninguna razón para que anon pueda ni llamarlas:
-- ninguna se usa desde el portal público (ese va por edge function).
--
-- es_admin() se deja como está a propósito: lo invocan las políticas RLS de
-- bonos y servicios, y quitarle el permiso a anon haría que esas políticas
-- fallaran con error en vez de devolver simplemente false.
revoke execute on function public.anular_servicio(uuid, text) from anon;
revoke execute on function public.asignar_servicio_a_bono(uuid, uuid, boolean) from anon;
revoke execute on function public.desasignar_servicio_de_bono(uuid) from anon;
revoke execute on function public.registrar_servicio_historico(
  uuid, uuid, text, text, text, date, numeric, text, text, text, text
) from anon;

-- Fija el search_path de la función de cálculo de horas (también del linter):
-- es IMMUTABLE y no toca tablas, pero con el search_path fijado no hay forma
-- de alterar a qué resuelven sus operadores desde la sesión que la llama.
alter function public.calcular_horas_facturables(numeric, text) set search_path = 'public', 'pg_temp';
