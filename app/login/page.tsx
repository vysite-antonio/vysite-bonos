"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError("Email o contraseña incorrectos");
      setCargando(false);
      return;
    }

    router.push("/panel");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(59,130,246,0.10), transparent 60%), var(--bg)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img
            src="/logo-vysite.png"
            alt="Vysite"
            style={{ height: 40, width: "auto", margin: "0 auto" }}
          />
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: 12 }}>
            Gestión de bonos de horas
          </p>
        </div>

        <form className="card card-pad-lg card-accent" onSubmit={entrar}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <div className="input-group">
              <Mail size={18} strokeWidth={2} />
              <input
                id="email"
                type="email"
                className="input"
                placeholder="tu@vysite.es"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="pw">Contraseña</label>
            <div className="input-group">
              <Lock size={18} strokeWidth={2} />
              <input
                id="pw"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="error-box" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={cargando}
          >
            {cargando ? <span className="spinner" /> : (
              <>
                <LogIn size={17} strokeWidth={2.25} />
                Entrar
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
