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
      <div
        className="panel-content"
        style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1.1rem 2.5rem" }}
      >
        {children}
      </div>
      <style>{`
        /* En móvil/tablet hay que dejar hueco debajo para que la barra de
           navegación inferior (fija) no tape lo último del contenido. */
        .panel-content { padding-bottom: calc(1.5rem + var(--tabbar-h) + env(safe-area-inset-bottom)); }
        @media (min-width: 860px) {
          .panel-content { padding: 2rem 1.5rem 4rem !important; }
        }
      `}</style>
    </>
  );
}
