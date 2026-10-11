import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthScreen, SignInForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Entrar" };

export default function Page() {
  return (
    <AuthScreen title="Hola de nuevo" sub="Entra con tu correo y contraseña.">
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </AuthScreen>
  );
}
