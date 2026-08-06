import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { AdminTabs } from "@/components/admin/AdminTabs";
import type { Cliente, Bono, Perfil } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user!.id)
    .single();

  if (perfil?.rol !== "admin") redirect("/panel");

  const [{ data: clientes }, { data: bonos }, { data: usuarios }] = await Promise.all([
    supabase.from("clientes").select("*").order("nombre"),
    supabase
      .from("bonos")
      .select("*, clientes(nombre)")
      .eq("eliminado", false)
      .order("fecha_creacion", { ascending: false }),
    supabase.from("profiles").select("id, nombre, rol, activo").order("nombre"),
  ]);

  return (
    <AdminTabs
      clientes={(clientes ?? []) as Cliente[]}
      bonos={(bonos ?? []) as Bono[]}
      usuarios={(usuarios ?? []) as Perfil[]}
    />
  );
}
