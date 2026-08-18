import { createClient } from "@/lib/supabase-server";
import { FormParteRapido } from "@/components/FormParteRapido";
import type { Cliente, Perfil } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ParteRapido() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: clientes }, { data: trabajadores }, { data: perfil }] = await Promise.all([
    // Igual que en Nuevo servicio: sin token_portal, aquí solo hace falta
    // nombre y email (para el envío automático del PDF).
    supabase.from("clientes").select("id, nombre, email").order("nombre"),
    supabase.from("profiles").select("id, nombre, rol, activo").eq("activo", true).order("nombre"),
    supabase.from("profiles").select("nombre").eq("id", user!.id).single(),
  ]);

  return (
    <FormParteRapido
      clientesIniciales={(clientes ?? []) as Cliente[]}
      trabajadores={(trabajadores ?? []) as Perfil[]}
      usuarioActual={{
        id: user!.id,
        nombre: perfil?.nombre ?? "Técnico",
        email: user!.email ?? "",
      }}
    />
  );
}
