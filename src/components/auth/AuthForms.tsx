"use client";
/**
 * Entrar, recuperar la contraseña y elegir una nueva. Registro solo por
 * invitación: aquí no hay "Crear cuenta".
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { LukasArt } from "@/components/lukas/LukasArt";

export const MIN_PASSWORD = 8;

export function AuthScreen({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <main className="auth-screen" aria-label={title}>
      <LukasArt name="face" className="auth-screen__art" />
      <h1 className="auth-screen__title">{title}</h1>
      {sub && <p className="auth-screen__sub">{sub}</p>}
      <div className="card auth-screen__card">{children}</div>
    </main>
  );
}

/** Solo rutas internas: evita que ?next= mande a otro sitio. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function SignInForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.status === 400 || error.status === 401 ? "Correo o contraseña incorrectos" : "No se pudo entrar. Intenta otra vez");
      setBusy(false);
      return;
    }
    // recarga completa: así el proxy ya ve la cookie de sesión
    location.replace(safeNext(params.get("next")));
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="field">
        <span className="field__label">Correo</span>
        <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Contraseña</span>
        <input
          className={`input${error ? " is-error" : ""}`}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <span className="field__help is-error" role="alert">{error}</span>}
      </label>
      <button className="btn btn--filled btn--lg btn--block" disabled={busy}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
      <Link className="btn btn--plain btn--sm" href="/recuperar">¿Olvidaste tu contraseña?</Link>
    </form>
  );
}

export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/nueva-contrasena` });
    // no se dice si el correo existe
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="auth-form">
        <p className="t-body">Si el correo existe, te llegó un enlace.</p>
        <Link className="btn btn--bordered btn--block" href="/entrar">Volver a entrar</Link>
      </div>
    );
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="field">
        <span className="field__label">Correo</span>
        <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button className="btn btn--filled btn--lg btn--block" disabled={busy}>Enviarme el enlace</button>
      <Link className="btn btn--plain btn--sm" href="/entrar">Volver</Link>
    </form>
  );
}

export function NewPasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Usa al menos ${MIN_PASSWORD} caracteres`);
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    if (error) {
      setError("El enlace venció. Pide otro desde «¿Olvidaste tu contraseña?»");
      setBusy(false);
      return;
    }
    location.replace("/");
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="field">
        <span className="field__label">Contraseña nueva</span>
        <input
          className={`input${error ? " is-error" : ""}`}
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className={`field__help${error ? " is-error" : ""}`} role={error ? "alert" : undefined}>
          {error || `Mínimo ${MIN_PASSWORD} caracteres.`}
        </span>
      </label>
      <button className="btn btn--filled btn--lg btn--block" disabled={busy}>Guardar contraseña</button>
    </form>
  );
}
