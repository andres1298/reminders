import type { Metadata } from "next";
import { PageTransition } from "@/components/app/PageTransition";
import { SettingsScreen } from "@/components/app/SettingsScreen";

export const metadata: Metadata = { title: "Ajustes" };

export default function Page() {
  return (
    <PageTransition>
      <SettingsScreen />
    </PageTransition>
  );
}
