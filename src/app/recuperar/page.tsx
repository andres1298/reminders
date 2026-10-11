import type { Metadata } from "next";
import { AuthScreen, RecoverForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function Page() {
  return (
    <AuthScreen title="¿Olvidaste tu contraseña?" sub="Te mandamos un enlace para elegir una nueva.">
      <RecoverForm />
    </AuthScreen>
  );
}
