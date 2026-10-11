"use client";
/**
 * PWA: registro del service worker, indicaciones para instalar y aviso sin conexión.
 * iOS no tiene botón de "Instalar": se explica Compartir → Agregar a inicio.
 * En Android/Chrome se usa el aviso nativo (beforeinstallprompt) cuando existe.
 */
import { useEffect, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";

// --- entorno -----------------------------------------------------------------
type Platform = "ios" | "android" | "other";

function getPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone() {
  return matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

const noop = () => () => {};
const subscribeDisplayMode = (cb: () => void) => {
  const mq = matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
export const useStandalone = () => useSyncExternalStore(subscribeDisplayMode, isStandalone, () => true);
const usePlatform = () => useSyncExternalStore(noop, getPlatform, () => "other" as Platform);

// --- aviso nativo de instalación (Chrome/Android) -----------------------------
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    promptListeners.forEach((l) => l());
  });
}
const subscribePrompt = (cb: () => void) => {
  promptListeners.add(cb);
  return () => promptListeners.delete(cb);
};
const useInstallPrompt = () => useSyncExternalStore(subscribePrompt, () => deferredPrompt, () => null);

// --- descarte del aviso en Inicio ---------------------------------------------
const DISMISS_KEY = "lukas-install-dismissed";
const dismissListeners = new Set<() => void>();
const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};
const subscribeDismissed = (cb: () => void) => {
  dismissListeners.add(cb);
  return () => dismissListeners.delete(cb);
};
function dismissInstall() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
  dismissListeners.forEach((l) => l());
}

// --- service worker -------------------------------------------------------------
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      /* sin service worker la app sigue funcionando en línea */
    });
  }, []);
  return null;
}

// --- conexión -------------------------------------------------------------------
const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div className="offline-pill" role="status">
      <i aria-hidden="true" />
      Sin conexión · mostrando lo último guardado
    </div>
  );
}

// --- instrucciones ----------------------------------------------------------------
function Steps({ platform }: { platform: Platform }) {
  if (platform === "ios")
    return (
      <ol className="install-steps">
        <li>
          Toca <b>Compartir</b> <Icon name="share" size="sm" /> en la barra de Safari.
        </li>
        <li>
          Elige <b>Agregar a inicio</b> y confirma con <b>Agregar</b>.
        </li>
        <li>Abre Lukas desde el ícono: se ve a pantalla completa.</li>
      </ol>
    );
  return (
    <ol className="install-steps">
      <li>
        Abre el menú del navegador <Icon name="more-h" size="sm" />.
      </li>
      <li>
        Elige <b>Instalar app</b> o <b>Agregar a pantalla principal</b>.
      </li>
    </ol>
  );
}

/** Tarjeta para Ajustes: estado de instalación y cómo instalar. */
export function InstallCard() {
  const standalone = useStandalone();
  const platform = usePlatform();
  const prompt = useInstallPrompt();
  if (standalone)
    return (
      <div className="list list--inset">
        <div className="row row--lead">
          <span className="row__lead"><Icon name="check" size="md" /></span>
          <span className="row__main">
            <span className="row__title">Lukas está instalada</span>
            <span className="row__sub">Se abre desde tu pantalla de inicio, a pantalla completa.</span>
          </span>
        </div>
      </div>
    );
  return (
    <div className="install-card">
      <div className="install-card__head">
        <span className="install-card__icon" aria-hidden="true" />
        <div>
          <b>Instala Lukas en tu celular</b>
          <p>Ábrela como una app, sin la barra del navegador.</p>
        </div>
      </div>
      {prompt ? (
        <button className="btn btn--filled btn--block" onClick={() => prompt.prompt()}>
          Instalar Lukas
        </button>
      ) : (
        <Steps platform={platform} />
      )}
    </div>
  );
}

/** Aviso descartable en Inicio (solo si no está instalada). */
export function InstallBanner() {
  const standalone = useStandalone();
  const platform = usePlatform();
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => true);
  const prompt = useInstallPrompt();
  if (standalone || dismissed || (platform === "other" && !prompt)) return null;
  return (
    <div className="install-banner" role="note">
      <span className="install-card__icon" aria-hidden="true" />
      <p>
        {platform === "ios" ? (
          <>
            Instala Lukas: <b>Compartir</b> → <b>Agregar a inicio</b>.
          </>
        ) : (
          <>Instala Lukas para abrirla como una app.</>
        )}
      </p>
      {prompt && (
        <button className="btn btn--filled btn--sm" onClick={() => prompt.prompt()}>
          Instalar
        </button>
      )}
      <button className="icon-btn icon-btn--ghost" aria-label="Ocultar aviso de instalación" onClick={dismissInstall}>
        <Icon name="close" size="md" />
      </button>
    </div>
  );
}
