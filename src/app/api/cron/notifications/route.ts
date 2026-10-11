/**
 * Avisos por tarea vía push. Lo llama pg_cron cada minuto (ver docs/DEPLOY.md)
 * con `Authorization: Bearer $CRON_SECRET`.
 */
import { timingSafeEqual } from "node:crypto";
import { CATCH_UP_MS, planDueNotifications, type PrefsRow } from "@/lib/push/plan";
import { pushConfigured, sendPush } from "@/lib/push/webpush";
import { supabaseAdmin } from "@/lib/supabase/admin";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const got = request.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return !!secret && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db || !pushConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  const now = new Date();
  const from = new Date(+now - CATCH_UP_MS).toISOString();
  const { data: tasks, error } = await db
    .from("tasks")
    .select("id, household_id, emoji, title, next_due_at, assignment_mode, current_assignee_id")
    .is("deleted_at", null)
    .is("paused_at", null)
    .is("completed_at", null)
    .gte("next_due_at", from)
    .lte("next_due_at", now.toISOString());
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!tasks?.length) return Response.json({ sent: 0 });

  const householdIds = [...new Set(tasks.map((t) => t.household_id))];
  const [households, members] = await Promise.all([
    db.from("households").select("id, timezone, vacation_from, vacation_until").in("id", householdIds).is("deleted_at", null).is("disabled_at", null),
    db.from("household_members").select("household_id, user_id, profiles!inner(display_name, disabled_at)").in("household_id", householdIds),
  ]);
  const memberRows = (members.data ?? [])
    .map((m) => {
      const p = m.profiles as unknown as { display_name: string; disabled_at: string | null };
      return { household_id: m.household_id as string, user_id: m.user_id as string, display_name: p.display_name, disabled: !!p.disabled_at };
    })
    .filter((m) => !m.disabled);
  const userIds = [...new Set(memberRows.map((m) => m.user_id))];
  const [subs, prefs, log] = await Promise.all([
    db.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds),
    db.from("notification_prefs").select("user_id, push, per_task").in("user_id", userIds),
    db.from("notification_log").select("user_id, occurrence_key").eq("kind", "due").eq("channel", "push").in("user_id", userIds).gte("sent_at", from),
  ]);

  const deliveries = planDueNotifications({
    tasks,
    households: households.data ?? [],
    members: memberRows,
    subscriptions: subs.data ?? [],
    prefs: (prefs.data ?? []) as PrefsRow[],
    alreadySent: new Set((log.data ?? []).map((l) => `${l.user_id}|${l.occurrence_key}`)),
    now,
  });

  const results = await Promise.all(
    deliveries.map(async (d) => ({
      d,
      result: await sendPush({ endpoint: d.subscription.endpoint, keys: { p256dh: d.subscription.p256dh, auth: d.subscription.auth } }, d.payload),
    })),
  );
  const gone = results.filter((r) => r.result === "gone").map((r) => r.d.subscription.id);
  if (gone.length) await db.from("push_subscriptions").delete().in("id", gone);
  const delivered = results.filter((r) => r.result === "ok");
  if (delivered.length) {
    const rows = [...new Map(delivered.map((r) => [`${r.d.userId}|${r.d.occurrenceKey}`, r.d])).values()].map((d) => ({
      user_id: d.userId,
      task_id: d.payload.url.split("/").pop(),
      kind: "due",
      channel: "push",
      occurrence_key: d.occurrenceKey,
    }));
    await db.from("notification_log").upsert(rows, { onConflict: "user_id,kind,occurrence_key,channel", ignoreDuplicates: true });
    await db.from("push_subscriptions").update({ last_used_at: now.toISOString() }).in("id", delivered.map((r) => r.d.subscription.id));
  }
  return Response.json({ sent: delivered.length, gone: gone.length, failed: results.length - delivered.length - gone.length });
}
