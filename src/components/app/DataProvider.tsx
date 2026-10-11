"use client";
/**
 * Conecta el almacén con Supabase: abre la sesión, carga la foto del hogar,
 * la refresca (al volver a la app, cada minuto y tras guardar) y manda cada
 * cambio optimista por la cola en serie.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { savePushSubscription } from "@/app/actions/push";
import { isBareScreen, isPublicPath } from "@/lib/auth/paths";
import { applyServer, getState, revertToServer, setState, startSession } from "@/lib/store";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { loadSnapshot } from "@/lib/supabase/snapshot";
import { classifyError, createRefreshGate, createSyncQueue, errorMessage, type SyncError } from "@/lib/sync";
import type { AppState } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

const REFRESH_MS = 60_000;

// Una sola cola para toda la app; DataProvider le pone los manejadores.
const handlers: { onError: (e: SyncError) => void; onIdle: () => void } = { onError: () => {}, onIdle: () => {} };
const queue = createSyncQueue({ onError: (e) => handlers.onError(e), onIdle: () => handlers.onIdle() });
const gate = createRefreshGate();

/** Si este dispositivo ya tenía push, lo asocia a la cuenta que acaba de entrar. */
function reclaimPush() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready
    .then((r) => r.pushManager.getSubscription())
    .then((sub) => sub && savePushSubscription(sub.toJSON(), navigator.userAgent))
    .catch(() => {});
}

interface Sync {
  db: SupabaseClient;
  /** Aplica `apply` al instante y encola `remote` con el estado resultante. `apply` puede lanzar. */
  run(apply: (s: AppState) => AppState, remote: (db: SupabaseClient, s: AppState) => Promise<void>): void;
  refresh(): Promise<void>;
}

const Ctx = createContext<Sync | null>(null);
export const useSync = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSync fuera de DataProvider");
  return v;
};

export function DataProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const router = useRouter();
  const userId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const id = userId.current;
    if (!id) return;
    const ticket = gate.start();
    try {
      const db = supabaseBrowser();
      const snap = await loadSnapshot(db, id);
      if (snap === "no-household") {
        // sin sesión las RLS devuelven vacío sin error: eso no es "no tengo hogar"
        const { data } = await db.auth.getSession();
        if (!data.session) return location.replace("/entrar");
        if (!isBareScreen(location.pathname)) router.replace("/bienvenida");
        return;
      }
      // una foto que empezó antes de un cambio, o que ya tiene otra más nueva detrás, viene vieja
      if (!queue.busy() && gate.canApply(ticket)) applyServer(snap);
    } catch (e) {
      if (classifyError(e) === "auth") location.replace("/entrar");
      // sin conexión: se queda la caché
    }
  }, [router]);

  useEffect(() => {
    handlers.onError = (e) => {
      if (e === "auth") return location.replace("/entrar");
      revertToServer();
      toast(errorMessage(e));
    };
    handlers.onIdle = () => void refresh();
  }, [refresh, toast]);

  useEffect(() => {
    let alive = true;
    const db = supabaseBrowser();
    const open = (id: string) => {
      if (userId.current === id) return;
      userId.current = id;
      startSession(id);
    };
    // la sesión local abre la caché aunque no haya red; getUser la confirma con el servidor
    db.auth.getSession().then(({ data: { session } }) => {
      if (alive && session) open(session.user.id);
    });
    db.auth.getUser().then(({ data: { user } }) => {
      if (!alive || !user) return;
      open(user.id);
      reclaimPush();
      void refresh();
    });
    // la sesión se cerró (en este u otro dispositivo, o venció): a entrar
    const { data: auth } = db.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !isPublicPath(location.pathname)) location.replace("/entrar");
    });
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => document.visibilityState === "visible" && void refresh(), REFRESH_MS);
    return () => {
      alive = false;
      auth.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [refresh]);

  const api = useMemo<Sync>(
    () => ({
      // el cliente se crea en el navegador, nunca al prerenderizar
      get db() {
        return supabaseBrowser();
      },
      refresh,
      run(apply, remote) {
        const current = getState();
        if (!current) return;
        const next = apply(current);
        gate.mutated();
        setState(next);
        queue.push(() => remote(supabaseBrowser(), next));
      },
    }),
    [refresh],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

