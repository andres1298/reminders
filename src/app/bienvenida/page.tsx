import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/AuthForms";
import { WelcomeForm } from "@/components/auth/WelcomeForm";

export const metadata: Metadata = { title: "Bienvenida" };

export default function Page() {
  return (
    <AuthScreen title="Tu hogar en Lukas" sub="Ponle nombre a tu casa. Después puedes invitar a quienes viven contigo.">
      <WelcomeForm />
    </AuthScreen>
  );
}
