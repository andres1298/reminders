"use client";
/**
 * Conecta el almacén con Supabase: abre la sesión, carga la foto del hogar,
 * la refresca (al volver a la app, cada minuto y tras guardar) y manda cada
 * cambio optimista por la cola en serie.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isBareScreen } from "@/lib/auth/paths";
import { applyServer, getState, revertToServer, setState, startSession } from "@/lib/store";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { loadSnapshot } from "@/lib/supabase/snapshot";
import { classifyError, createSyncQueue, errorMessage, type SyncError } from "@/lib/sync";
import type { AppState } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

const REFRESH_MS = 60_000;

// Una sola cola para toda la app; DataProvider le pone los manejadores.
const handlers: { onError: (e: SyncError) => void; onIdle: () => void } = { onError: () => {}, onIdle: () => {} };
const queue = createSyncQueue({ onError: (e) => handlers.onError(e), onIdle: () => handlers.onIdle() });

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
    try {
      const snap = await loadSnapshot(supabaseBrowser(), id);
      if (snap === "no-household") {
        if (!isBareScreen(location.pathname)) router.replace("/bienvenida");
        return;
      }
      // con cambios en camino, la foto ya viene vieja: se espera la siguiente
      if (!queue.busy()) applyServer(snap);
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
    supabaseBrowser().auth.getUser().then(({ data: { user } }) => {
      if (!alive || !user) return;
      userId.current = user.id;
      startSession(user.id);
      void refresh();
    });
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => document.visibilityState === "visible" && void refresh(), REFRESH_MS);
    return () => {
      alive = false;
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
        setState(next);
        queue.push(() => remote(supabaseBrowser(), next));
      },
    }),
    [refresh],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

