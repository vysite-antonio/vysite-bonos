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
      <div className="panel-content">{children}</div>
      <style>{`
        /* La navegación está toda arriba, así que abajo no hay nada fijo que
           pueda tapar el contenido: basta el margen de seguridad del área
           segura del móvil (barra de gestos del iPhone). */
        .panel-content {
          max-width: 1100px;
          margin: 0 auto;
          padding: 1.5rem 1.1rem calc(2.5rem + env(safe-area-inset-bottom));
        }
        @media (min-width: 860px) {
          .panel-content { padding: 2rem 1.5rem 4rem; }
        }
      `}</style>
    </>
  );
}
