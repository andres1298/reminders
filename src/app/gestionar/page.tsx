import type { Metadata } from "next";
import { PageTransition } from "@/components/app/PageTransition";
import { ManageScreen } from "@/components/app/ManageScreen";

export const metadata: Metadata = { title: "Gestionar" };

export default function Page() {
  return (
    <PageTransition>
      <ManageScreen />
    </PageTransition>
  );
}
