"use client";
/**
 * Notificaciones push en este dispositivo: activar, probar y desactivar.
 * iOS solo entrega push a la app instalada en la pantalla de inicio (16.4+).
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { pushAvailable, sendTestPush } from "@/app/actions/push";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { useStandalone } from "./pwa";

type Status = "checking" | "unsupported" | "needs-install" | "dev" | "denied" | "off" | "on";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const noop = () => () => {};

export function PushCard() {
  const toast = useToast();
  const standalone = useStandalone();
  const supportedHere = useSyncExternalStore(noop, supported, () => true);
  const ios = useSyncExternalStore(noop, isIOS, () => false);
  const [sub, setSub] = useState<PushSubscription | null | undefined>(undefined);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [serverReady, setServerReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    pushAvailable().then((v) => alive && setServerReady(v));
    if (supported() && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((s) => {
          if (!alive) return;
          setSub(s);
          setPermission(Notification.permission);
        });
    }
    return () => {
      alive = false;
    };
  }, []);

  let status: Status;
  if (ios && (!supportedHere || !standalone)) status = "needs-install";
  else if (!supportedHere) status = "unsupported";
  else if (process.env.NODE_ENV !== "production") status = "dev";
  else if (sub === undefined) status = "checking";
  else if (permission === "denied") status = "denied";
  else status = sub ? "on" : "off";

  async function enable() {
    if (!VAPID) return toast("Falta la llave pública VAPID en la configuración.");
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) });
      setSub(s);
      toast("Notificaciones activadas en este dispositivo.", { paw: true });
    } catch {
      toast("No se pudieron activar. Revisa los permisos del navegador.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    if (!sub) return;
    setBusy(true);
    const r = await sendTestPush(sub.toJSON());
    setBusy(false);
    toast(r.message, r.ok ? { paw: true } : {});
  }

  async function disable() {
    if (!sub) return;
    await sub.unsubscribe();
    setSub(null);
    toast("Notificaciones desactivadas en este dispositivo.");
  }

  return (
    <div className="list list--inset">
      <div className="row row--lead" style={{ alignItems: "flex-start", paddingTop: 14, paddingBottom: 14 }}>
        <span className="row__lead"><Icon name="bell" size="md" /></span>
        <span className="row__main" style={{ gap: 10 }}>
          <span className="row__title">Notificaciones</span>
          <span className="row__sub">{COPY[status]}</span>
          {status === "off" && (
            <button className="btn btn--filled btn--sm" style={{ justifySelf: "start", alignSelf: "flex-start" }} disabled={busy} onClick={enable}>
              Activar notificaciones
            </button>
          )}
          {status === "on" && (
            <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn--bordered btn--sm" disabled={busy || serverReady === false} onClick={test}>
                Enviar una de prueba
              </button>
              <button className="btn btn--plain btn--sm" onClick={disable}>Desactivar</button>
            </span>
          )}
          {status === "on" && serverReady === false && <span className="row__sub">El servidor todavía no tiene las llaves VAPID.</span>}
        </span>
      </div>
    </div>
  );
}

const COPY: Record<Status, string> = {
  checking: "Revisando este dispositivo…",
  unsupported: "Este navegador no permite notificaciones push.",
  "needs-install": "En iPhone llegan solo con Lukas instalada: Compartir → Agregar a inicio, y ábrela desde el ícono (iOS 16.4 o más).",
  dev: "Disponibles en la versión publicada (el service worker no corre en desarrollo).",
  denied: "Están bloqueadas. Actívalas en Ajustes del teléfono → Notificaciones → Lukas.",
  off: "Te aviso a la hora de cada tarea que te toca, aunque la app esté cerrada.",
  on: "Activadas en este dispositivo.",
};
