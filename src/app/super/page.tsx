import type { Metadata } from "next";
import { PageTransition } from "@/components/app/PageTransition";
import { GroceryScreen } from "@/components/groceries/GroceryScreen";

export const metadata: Metadata = { title: "Súper" };

export default function Page() {
  return (
    <PageTransition>
      <GroceryScreen />
    </PageTransition>
  );
}
