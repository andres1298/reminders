import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/app/PageTransition";
import { TaskDetail } from "@/components/tasks/TaskDetail";

export const metadata: Metadata = { title: "Tarea" };

// El id se lee en el cliente (useParams): la página es un cascarón estático.
export default function TaskPage() {
  return (
    <PageTransition>
      <Suspense fallback={<div className="hero" style={{ minHeight: 360 }} aria-busy="true" />}>
        <TaskDetail />
      </Suspense>
    </PageTransition>
  );
}
