import type { Metadata } from "next";
import { PageTransition } from "@/components/app/PageTransition";
import { TodoScreen } from "@/components/todos/TodoScreen";

export const metadata: Metadata = { title: "Pendientes de casa" };

export default function Page() {
  return (
    <PageTransition>
      <TodoScreen />
    </PageTransition>
  );
}
