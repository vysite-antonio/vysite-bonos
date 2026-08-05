import { createClient } from "@/lib/supabase-server";
import { FormNuevoServicio } from "@/components/FormNuevoServicio";
import type { Cliente, Bono, Perfil } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NuevoServicio() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: clientes }, { data: bonos }, { data: trabajadores }, { data: perfil }] =
    await Promise.all([
      supabase.from("clientes").select("*").order("nombre"),
      supabase.from("bonos").select("*, clientes(nombre)").eq("activo", true),
      supabase.from("profiles").select("id, nombre, rol, activo").eq("activo", true).order("nombre"),
      supabase.from("profiles").select("nombre").eq("id", user!.id).single(),
    ]);

  return (
    <FormNuevoServicio
      clientes={(clientes ?? []) as Cliente[]}
      bonos={(bonos ?? []) as Bono[]}
      trabajadores={(trabajadores ?? []) as Perfil[]}
      usuarioActual={{
        id: user!.id,
        nombre: perfil?.nombre ?? "Técnico",
        email: user!.email ?? "",
      }}
    />
  );
}
