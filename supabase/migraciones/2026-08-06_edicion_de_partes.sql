-- Aplicada el 2026-08-06. Ya está ejecutada en producción.
--
-- Edición de partes de trabajo ya guardados.
--
-- Un parte lleva la firma del cliente, así que editarlo después de firmado no
-- es una operación inocente: queda traza visible (editado / editado_en /
-- editado_por) que el PDF muestra, para que si algún día hay discusión se vea
-- que el documento se tocó después de la firma.

alter table public.servicios
  add column if not exists editado    boolean not null default false,
  add column if not exists editado_en timestamptz,
  add column if not exists editado_por text;

comment on column public.servicios.editado is
  'true si el parte se modificó después de haberse guardado (y firmado). El PDF lo indica.';

-- Edita un parte recalculando las horas facturables y ajustando el saldo del
-- bono en la misma transacción. Es el único camino sancionado para cambiar
-- horas: tocar servicios.horas a pelo dejaría el bono descuadrado.
--
-- No se pueden cambiar cliente ni bono (eso es reasignar, y para eso existen
-- asignar_servicio_a_bono / desasignar_servicio_de_bono), ni las firmas.
create or replace function public.editar_servicio(
    p_servicio_id  uuid,
    p_fecha        date,
    p_hora_inicio  time,
    p_hora_fin     time,
    p_modalidad    text,
    p_descripcion  text,
    p_material     text
) returns public.servicios
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_serv         public.servicios;
    v_bono         public.bonos;
    v_minutos      numeric;
    v_horas        numeric(6,2);
    v_delta        numeric;
    v_admin_nombre text;
begin
    if not public.es_admin() then
        raise exception 'Solo un administrador puede editar partes de trabajo';
    end if;

    if p_descripcion is null or btrim(p_descripcion) = '' then
        raise exception 'La actuación realizada no puede quedar vacía';
    end if;

    if p_modalidad not in ('presencial', 'remota') then
        raise exception 'Modalidad no válida: %', p_modalidad;
    end if;

    -- Bloqueamos el parte antes de nada, para que dos ediciones simultáneas
    -- no apliquen cada una su delta sobre el mismo saldo de partida.
    select * into v_serv from public.servicios where id = p_servicio_id for update;
    if not found then
        raise exception 'Parte no encontrado';
    end if;

    if v_serv.anulado then
        raise exception 'Este parte está anulado; no se puede editar';
    end if;

    v_minutos := extract(epoch from (p_hora_fin - p_hora_inicio)) / 60.0;
    if v_minutos <= 0 then
        raise exception 'El horario es inválido (la salida debe ser posterior a la entrada)';
    end if;

    -- Misma regla de facturación que al registrar el parte.
    v_horas := public.calcular_horas_facturables(v_minutos, p_modalidad);
    v_delta := v_horas - v_serv.horas;

    -- El bono solo se toca si el parte cuelga de uno y las horas cambian de
    -- verdad. Un parte suelto (bono_id null) no consume saldo de nadie.
    if v_serv.bono_id is not null and v_delta <> 0 then
        select * into v_bono from public.bonos where id = v_serv.bono_id for update;
        if not found then
            raise exception 'El bono asociado a este parte ya no existe';
        end if;

        update public.bonos
           set horas_usadas = greatest(horas_usadas + v_delta, 0),
               activo = case
                          when greatest(horas_usadas + v_delta, 0) >= horas_totales then false
                          else true
                        end
         where id = v_bono.id;
    end if;

    select nombre into v_admin_nombre from public.profiles where id = auth.uid();

    update public.servicios
       set fecha       = p_fecha,
           hora_inicio = p_hora_inicio,
           hora_fin    = p_hora_fin,
           modalidad   = p_modalidad,
           horas       = v_horas,
           descripcion = btrim(p_descripcion),
           material    = nullif(btrim(coalesce(p_material, '')), ''),
           editado     = true,
           editado_en  = now(),
           editado_por = coalesce(v_admin_nombre, auth.uid()::text)
     where id = p_servicio_id
     returning * into v_serv;

    return v_serv;
end;
$function$;

-- Solo usuarios con sesión. La comprobación real de admin la hace es_admin()
-- dentro; esto evita además que anon pueda ni siquiera invocarla.
revoke all on function public.editar_servicio(uuid, date, time, time, text, text, text) from public;
revoke all on function public.editar_servicio(uuid, date, time, time, text, text, text) from anon;
grant execute on function public.editar_servicio(uuid, date, time, time, text, text, text) to authenticated;
grant execute on function public.editar_servicio(uuid, date, time, time, text, text, text) to service_role;
