"use client";
import Link from "next/link";
import { useAppState } from "@/lib/store";
import { Icon } from "@/components/ui/Icon";
import { useSyncExternalStore } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { InstallCard } from "./pwa";
import { PushCard } from "./PushCard";
import { AccountCard } from "./AccountCard";
import { HouseholdCard } from "./HouseholdCard";
import { applyTheme, readThemePreference, subscribeTheme } from "@/lib/theme";

export function SettingsScreen() {
  const state = useAppState();
  const theme = useSyncExternalStore(subscribeTheme, readThemePreference, () => "light" as const);
  return (
    <main aria-label="Ajustes">
      <header className="simple-head">
        <h1>Ajustes</h1>
      </header>
      <div className="section-header">Cuenta</div>
      <AccountCard />
      <div className="section-header">Hogar</div>
      <HouseholdCard />
      {state?.isSuperAdmin && (
        <>
          <div style={{ height: 12 }} />
          <div className="list list--inset">
            <Link className="row row--lead" href="/admin">
              <span className="row__lead"><Icon name="lock" size="md" /></span>
              <span className="row__main">
                <span className="row__title">Panel de administración</span>
                <span className="row__sub">Crear hogares y administrar personas</span>
              </span>
              <Icon name="chevron-right" className="row__chev" />
            </Link>
          </div>
        </>
      )}
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
