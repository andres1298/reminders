"use client";
import { useSyncExternalStore } from "react";
import { resetDemo } from "@/lib/store";
import { Segmented } from "@/components/ui/Segmented";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { applyTheme, readThemePreference, subscribeTheme } from "@/lib/theme";

export function SettingsScreen() {
  const toast = useToast();
  const theme = useSyncExternalStore(subscribeTheme, readThemePreference, () => "light" as const);
  return (
    <main aria-label="Ajustes">
      <header className="simple-head">
        <h1>Ajustes</h1>
      </header>
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
      <div className="section-header">Datos de prueba</div>
      <div className="list list--inset">
        <button
          className="row"
          onClick={() => {
            resetDemo();
            toast("Datos de prueba restablecidos.");
          }}
        >
          <span className="row__main">
            <span className="row__title">Restablecer datos de prueba</span>
            <span className="row__sub">Mientras no se conecte Supabase, todo se guarda solo en este navegador.</span>
          </span>
          <Icon name="restore" className="row__chev" />
        </button>
      </div>
      <div className="section-footer">Cuenta, Telegram, widgets e invitaciones llegan con la conexión a Supabase.</div>
      <div className="pad-tab" />
    </main>
  );
}
