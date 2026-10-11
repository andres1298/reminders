"use client";
import { useSyncExternalStore } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { InstallCard } from "./pwa";
import { PushCard } from "./PushCard";
import { applyTheme, readThemePreference, subscribeTheme } from "@/lib/theme";

export function SettingsScreen() {
  const theme = useSyncExternalStore(subscribeTheme, readThemePreference, () => "light" as const);
  return (
    <main aria-label="Ajustes">
      <header className="simple-head">
        <h1>Ajustes</h1>
      </header>
      <div className="section-header">App</div>
      <InstallCard />
      <div style={{ height: 12 }} />
      <PushCard />
      <div className="section-header">Apariencia</div>
      <div className="list list--inset">
        <div className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 10, padding: "14px 16px" }}>
          <span className="row__title">Tema</span>
          <Segmented
            label="Tema"
            value={theme}
            onChange={(v) => {
              applyTheme(v, document.activeElement);
            }}
            options={[
              { value: "light", label: "Claro" },
              { value: "dark", label: "Oscuro" },
              { value: "system", label: "Sistema" },
            ]}
          />
        </div>
      </div>
      <div className="pad-tab" />
    </main>
  );
}
