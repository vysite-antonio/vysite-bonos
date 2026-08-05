import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { PanelNav } from "@/components/PanelNav";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre, rol, activo")
    .eq("id", user.id)
    .single();

  if (!perfil || !perfil.activo) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <>
      <PanelNav nombre={perfil.nombre} esAdmin={perfil.rol === "admin"} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.75rem 1.5rem 4rem" }}>
        {children}
      </div>
    </>
  );
}
