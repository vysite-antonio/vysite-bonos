-- Aplicada el 2026-08-06. Ya está ejecutada en producción.
--
-- La migración 2026-08-06_revocar_anon_en_rpcs_de_escritura revocó EXECUTE
-- solo del rol "anon", pero no de PUBLIC. Postgres concede EXECUTE a PUBLIC
-- por defecto al crear una función, y ese grant a PUBLIC se hereda por
-- cualquier rol (incluido anon) salvo que se revoque explícitamente. Así que,
-- pese a la migración anterior, anon podía seguir invocando estas cuatro
-- funciones vía /rest/v1/rpc/... (verificado con has_function_privilege).
--
-- No era explotable para escalar privilegios porque las cuatro comprueban
-- es_admin() internamente y anon no tiene auth.uid(), así que la llamada
-- fallaba con "Solo un administrador puede...". Pero es higiene de acceso
-- pendiente de cerrar, y el patrón correcto (revocar de public Y de anon)
-- es el que ya se usa en las funciones de la papelera.
revoke execute on function public.anular_servicio(uuid, text) from public;
revoke execute on function public.asignar_servicio_a_bono(uuid, uuid, boolean) from public;
revoke execute on function public.desasignar_servicio_de_bono(uuid) from public;
revoke execute on function public.registrar_servicio_historico(
  uuid, uuid, text, text, text, date, numeric, text, text, text, text
) from public;

-- Vuelve a conceder a los roles legítimos, ya sin el paso por PUBLIC.
grant execute on function public.anular_servicio(uuid, text) to authenticated, service_role;
grant execute on function public.asignar_servicio_a_bono(uuid, uuid, boolean) to authenticated, service_role;
grant execute on function public.desasignar_servicio_de_bono(uuid) to authenticated, service_role;
grant execute on function public.registrar_servicio_historico(
  uuid, uuid, text, text, text, date, numeric, text, text, text, text
) to authenticated, service_role;
