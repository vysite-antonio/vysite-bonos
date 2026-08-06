-- Aplicada el 2026-08-06. Ya está ejecutada en producción.
--
-- Papelera con recuperación de 1 mes para bonos eliminados y partes anulados.
--
-- Bonos: eliminar_bono ya no borra la fila (deja de fallar por el FK RESTRICT
-- de servicios.bono_id cuando el bono tiene partes asociados); marca
-- eliminado=true y desaparece de las vistas normales. purgar_papelera() borra
-- de verdad los que llevan más de 30 días, saltándose (sin fallar) los que
-- todavía tengan algún parte enganchado, porque esos no se pueden borrar sin
-- romper el historial.
--
-- Partes: anular_servicio ya existía y no tocamos su lógica; añadimos
-- reactivar_servicio como su inverso, permitido solo dentro de los primeros
-- 30 días desde la anulación. Los partes anulados nunca se purgan: pasado el
-- mes simplemente dejan de poder recuperarse desde aquí, el registro se
-- queda para siempre (igual que hoy).

alter table public.bonos
  add column if not exists eliminado    boolean not null default false,
  add column if not exists eliminado_en timestamptz,
  add column if not exists eliminado_por text;

comment on column public.bonos.eliminado is
  'true si el bono está en la papelera. No se borra la fila: se filtra en las vistas normales y se recupera con restaurar_bono, o se purga de verdad pasados 30 días con purgar_papelera.';

create index if not exists bonos_eliminado_idx on public.bonos (eliminado) where eliminado;

-- Manda un bono a la papelera. A diferencia del delete() directo que había
-- antes, esto nunca falla por partes asociados: el bono sigue existiendo
-- (solo oculto) así que la relación con sus servicios no se rompe.
create or replace function public.eliminar_bono(p_bono_id uuid)
returns public.bonos
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_bono         public.bonos;
    v_admin_nombre text;
begin
    if not public.es_admin() then
        raise exception 'Solo un administrador puede eliminar bonos';
    end if;

    select nombre into v_admin_nombre from public.profiles where id = auth.uid();

    update public.bonos
       set eliminado = true,
           eliminado_en = now(),
           eliminado_por = coalesce(v_admin_nombre, auth.uid()::text)
     where id = p_bono_id
       and eliminado = false
     returning * into v_bono;

    if not found then
        raise exception 'Bono no encontrado o ya estaba en la papelera';
    end if;

    return v_bono;
end;
$function$;

create or replace function public.restaurar_bono(p_bono_id uuid)
returns public.bonos
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_bono public.bonos;
begin
    if not public.es_admin() then
        raise exception 'Solo un administrador puede restaurar bonos';
    end if;

    update public.bonos
       set eliminado = false,
           eliminado_en = null,
           eliminado_por = null
     where id = p_bono_id
       and eliminado = true
     returning * into v_bono;

    if not found then
        raise exception 'Bono no encontrado en la papelera';
    end if;

    return v_bono;
end;
$function$;

-- Inverso de anular_servicio: reactiva un parte y vuelve a descontar sus
-- horas del bono (anular_servicio se las había devuelto). Solo dentro de los
-- primeros 30 días desde la anulación, a propósito: pasado ese plazo el
-- parte se queda anulado para siempre, no se puede deshacer desde aquí.
create or replace function public.reactivar_servicio(p_servicio_id uuid)
returns public.servicios
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_serv public.servicios;
    v_bono public.bonos;
begin
    if not public.es_admin() then
        raise exception 'Solo un administrador puede recuperar partes de trabajo';
    end if;

    select * into v_serv from public.servicios where id = p_servicio_id for update;
    if not found then
        raise exception 'Parte no encontrado';
    end if;

    if not v_serv.anulado then
        raise exception 'Este parte no está anulado';
    end if;

    if v_serv.anulado_en is null or v_serv.anulado_en < now() - interval '30 days' then
        raise exception 'Han pasado más de 30 días desde la anulación; ya no se puede recuperar';
    end if;

    if v_serv.bono_id is not null then
        select * into v_bono from public.bonos where id = v_serv.bono_id for update;
        if found then
            update public.bonos
               set horas_usadas = horas_usadas + v_serv.horas,
                   activo = case
                              when horas_usadas + v_serv.horas >= horas_totales then false
                              else true
                            end
             where id = v_bono.id;
        end if;
        -- Si el bono ya no existe (no debería pasar: purgar_papelera lo
        -- protege mientras tenga partes), reactivamos igualmente el parte
        -- sin tocar ningún saldo, para no dejarlo bloqueado sin salida.
    end if;

    update public.servicios
       set anulado = false,
           anulado_motivo = null,
           anulado_por = null,
           anulado_en = null
     where id = p_servicio_id
     returning * into v_serv;

    return v_serv;
end;
$function$;

-- Borrado real de los bonos que llevan más de 30 días en la papelera. Se
-- salta (no falla) los que todavía tengan algún parte apuntando a ellos: se
-- quedan eliminado=true indefinidamente, visibles en la papelera como "no se
-- pudo purgar", restaurables en cualquier momento si fue un error.
create or replace function public.purgar_papelera()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_bono record;
    v_purgados integer := 0;
begin
    if not public.es_admin() then
        raise exception 'Solo un administrador puede purgar la papelera';
    end if;

    for v_bono in
        select id from public.bonos
         where eliminado = true
           and eliminado_en < now() - interval '30 days'
    loop
        begin
            delete from public.bonos where id = v_bono.id;
            v_purgados := v_purgados + 1;
        exception when foreign_key_violation then
            -- Tiene partes asociados: se queda en la papelera sin fecha límite.
            null;
        end;
    end loop;

    return v_purgados;
end;
$function$;

revoke all on function public.eliminar_bono(uuid) from public;
revoke all on function public.eliminar_bono(uuid) from anon;
grant execute on function public.eliminar_bono(uuid) to authenticated;
grant execute on function public.eliminar_bono(uuid) to service_role;

revoke all on function public.restaurar_bono(uuid) from public;
revoke all on function public.restaurar_bono(uuid) from anon;
grant execute on function public.restaurar_bono(uuid) to authenticated;
grant execute on function public.restaurar_bono(uuid) to service_role;

revoke all on function public.reactivar_servicio(uuid) from public;
revoke all on function public.reactivar_servicio(uuid) from anon;
grant execute on function public.reactivar_servicio(uuid) to authenticated;
grant execute on function public.reactivar_servicio(uuid) to service_role;

revoke all on function public.purgar_papelera() from public;
revoke all on function public.purgar_papelera() from anon;
grant execute on function public.purgar_papelera() to authenticated;
grant execute on function public.purgar_papelera() to service_role;
