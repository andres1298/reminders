/**
 * Filas tal como las devuelve Supabase (columnas de supabase/migrations).
 * Solo las columnas que la app lee o escribe.
 */
import type { Anchor } from "../schedule";

export interface HouseholdRow {
  id: string;
  name: string;
  emoji: string;
  timezone: string;
}

export interface MemberRow {
  user_id: string;
  role: "admin" | "member";
  profiles: { display_name: string; avatar_emoji: string };
}

export interface ListRow {
  id: string;
  name: string;
  emoji: string;
  position: number;
}

export interface TaskRow {
  id: string;
  household_id: string;
  list_id: string | null;
  emoji: string;
  title: string;
  description: string | null;
  schedule_type: "interval" | "weekly" | "monthly" | "once";
  schedule: Record<string, unknown>;
  anchor: Anchor;
  /** "HH:mm:ss" */
  due_time: string;
  starts_on: string;
  ends_on: string | null;
  color: string | null;
  assignment_mode: "anyone" | "fixed" | "rotation";
  current_assignee_id: string | null;
  cycle_started_at: string;
  next_due_at: string | null;
  completed_at: string | null;
  paused_at: string | null;
  deleted_at: string | null;
  created_by: string;
}

export interface RotationRow {
  task_id: string;
  user_id: string;
  position: number;
}

export interface EventRow {
  id: string;
  task_id: string;
  kind: "done" | "skipped" | "snoozed" | "missed" | "undone";
  assignee_at_time: string | null;
  credited_to: string | null;
  due_at_snapshot: string | null;
  snoozed_until: string | null;
  prev_next_due_at: string | null;
  prev_cycle_started_at: string | null;
  prev_assignee_id: string | null;
  undone_at: string | null;
  created_at: string;
}

export interface TodoRow {
  id: string;
  household_id: string;
  text: string;
  emoji: string;
  assignee_id: string | null;
  soon: boolean;
  done_at: string | null;
  deleted_at: string | null;
  created_by: string;
  created_at: string;
}
