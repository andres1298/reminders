"use client";
import { Suspense, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { ToastProvider } from "@/components/ui/Toast";
import { DataProvider } from "./DataProvider";
import { TaskUIProvider } from "./TaskUI";
import { TabBar } from "./TabBar";
import { OfflineBanner, ServiceWorkerRegister } from "./pwa";
import { installViewTransitionGate } from "@/lib/view-transitions";

installViewTransitionGate();

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <DataProvider>
        <TaskUIProvider>
          <div className="app-col">{children}</div>
          <Suspense fallback={null}>
            <TabBar />
          </Suspense>
          <div className="fx" id="lukas-fx" aria-hidden="true" />
          <OfflineBanner />
          <ServiceWorkerRegister />
        </TaskUIProvider>
        </DataProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
