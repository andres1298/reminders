import type { Metadata } from "next";
import { PageTransition } from "@/components/app/PageTransition";
import { StatsScreen } from "@/components/app/StatsScreen";

export const metadata: Metadata = { title: "Estadísticas" };

export default function Page() {
  return (
    <PageTransition>
      <StatsScreen />
    </PageTransition>
  );
}
