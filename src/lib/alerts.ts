export const ALERT_OPTIONS = [
  { minutes: 15, label: "15 minutos" }, { minutes: 30, label: "30 minutos" },
  { minutes: 60, label: "1 hora" }, { minutes: 120, label: "2 horas" },
  { minutes: 1440, label: "1 día" }, { minutes: 2880, label: "2 días" },
  { minutes: 4320, label: "3 días" },
] as const;
export const MAX_ALERT_MS = 4320 * 60_000;
export function availableAlerts(due: string | Date | null, now: Date) {
  const remaining = due ? +new Date(due) - +now : 0;
  return ALERT_OPTIONS.filter((o) => o.minutes * 60_000 < remaining);
}
export function validAlert(minutes: number | null | undefined, due: string | Date | null, now: Date) {
  return minutes == null || availableAlerts(due, now).some((o) => o.minutes === minutes);
}
