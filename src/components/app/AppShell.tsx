"use client";
import { Suspense, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { ToastProvider } from "@/components/ui/Toast";
import { TaskUIProvider } from "./TaskUI";
import { TabBar } from "./TabBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <TaskUIProvider>
          <div className="app-col">{children}</div>
          <Suspense fallback={null}>
            <TabBar />
          </Suspense>
          <div className="fx" id="lukas-fx" aria-hidden="true" />
        </TaskUIProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
