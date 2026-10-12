"use client";
import { useNow } from "@/lib/store";
import { availableAlerts } from "@/lib/alerts";
export function useAlertNow() {
  return new Date(useNow());
}
export function AlertPicker({ due, value, onChange, now }: {
  due: string | Date | null; value: number | null; onChange: (v: number | null) => void; now: Date;
}) {
  const options = availableAlerts(due, now);
  const valid = options.some((o) => o.minutes === value);
  return <div className="alert-picker">
    <div className="sheet-row">
      <span className="lbl">Agregar alerta</span>
      <label className="switch">
        <input type="checkbox" role="switch" aria-label="Agregar alerta" checked={value !== null}
          disabled={value === null && !options.length} onChange={(e) => onChange(e.target.checked ? options[0].minutes : null)} />
        <span className="switch__track" />
      </label>
    </div>
    {value !== null && <div className="alert-picker__options" role="group" aria-label="Recordar antes">
      {options.map((o) => <button type="button" key={o.minutes} className="chip" aria-pressed={value === o.minutes}
        onClick={() => onChange(o.minutes)}>{o.label} antes</button>)}
    </div>}
    <p className={`field__help${value !== null && !valid ? " is-error" : ""}`} aria-live="polite">
      {!due ? "Elige una fecha y hora para agregar una alerta." : !options.length ? "No hay tiempo para una alerta anticipada. Elige una fecha posterior." : value !== null && !valid ? "El anticipo elegido ya no es válido. Elige otro o apaga la alerta." : "Solo se muestran anticipos que todavía están en el futuro."}
    </p>
  </div>;
}
