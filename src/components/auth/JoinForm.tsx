"use client";
/** Unirse a un hogar desde un enlace de invitación (con o sin cuenta). */
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { acceptInvitation, joinWithInvitation } from "@/app/actions/join";
import { MIN_PASSWORD } from "./AuthForms";

export function JoinForm({ token, household, signedIn }: { token: string; household: string; signedIn: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);
  const next = `/entrar?next=${encodeURIComponent(`/invitacion/${token}`)}`;

  async function join() {
    setBusy(true);
    setError("");
    const r = await acceptInvitation(token);
    if (r.ok) return location.replace("/");
    setError(r.message ?? "");
    setBusy(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`La contraseña necesita al menos ${MIN_PASSWORD} caracteres`);
    setBusy(true);
    setError("");
    const r = await joinWithInvitation({ token, name, email, password });
    if (r.ok) return location.replace("/");
    setError(r.message);
    setExists(!!r.exists);
    setBusy(false);
  }

  if (signedIn) {
    return (
      <div className="auth-form">
        <button className="btn btn--filled btn--lg btn--block" disabled={busy} onClick={join}>
          Unirme a {household}
        </button>
        {error && <p className="field__help is-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="field">
        <span className="field__label">Tu nombre</span>
        <input className="input" autoComplete="given-name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Correo</span>
        <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Contraseña</span>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className="field__help">Mínimo {MIN_PASSWORD} caracteres. La usarás para entrar desde la app instalada.</span>
      </label>
      {error && (
        <p className="field__help is-error" role="alert">
          {error}
          {exists && (
            <>
              {" · "}
              <Link href={next}>Entrar</Link>
            </>
          )}
        </p>
      )}
      <button className="btn btn--filled btn--lg btn--block" disabled={busy}>
        {busy ? "Uniéndote…" : `Unirme a ${household}`}
      </button>
      <Link className="btn btn--plain btn--sm" href={next}>Ya tengo cuenta</Link>
    </form>
  );
}
