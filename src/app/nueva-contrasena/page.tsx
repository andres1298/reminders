import type { Metadata } from "next";
import { AuthScreen, NewPasswordForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Contraseña nueva" };

export default function Page() {
  return (
    <AuthScreen title="Elige tu contraseña nueva">
      <NewPasswordForm />
    </AuthScreen>
  );
}
