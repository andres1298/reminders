/** Panel de super admin: lo que devuelve admin_overview() y sus errores. Sin contenido de tareas. */

export interface AdminMember {
  userId: string;
  name: string;
  emoji: string;
  role: "admin" | "member";
  /** cuántas tareas tiene asignadas (fijas o en rotación); nunca cuáles */
  tasks: number;
}

export interface AdminHousehold {
  id: string;
  name: string;
  emoji: string;
  timezone: string;
  disabled: boolean;
  members: AdminMember[];
}

interface RawMember {
  user_id: string;
  name: string;
  emoji: string;
  role: "admin" | "member";
  tasks: number;
}

export function parseOverview(raw: unknown): AdminHousehold[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    timezone: h.timezone,
    disabled: !!h.disabled,
    members: ((h.members ?? []) as RawMember[]).map((m) => ({
      userId: m.user_id,
      name: m.name,
      emoji: m.emoji,
      role: m.role,
      tasks: Number(m.tasks) || 0,
    })),
  }));
}

const MESSAGES: Record<string, string> = {
  forbidden: "No tienes permiso",
  last_admin: "El hogar necesita al menos un admin",
  not_member: "Esa persona ya no es del hogar",
  invalid_target: "Elige a alguien del hogar",
};

export function adminErrorMessage(e: unknown): string {
  const msg = (e as { message?: string } | null)?.message ?? "";
  return MESSAGES[msg] ?? "No se pudo. Intenta otra vez";
}
