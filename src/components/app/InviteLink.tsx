"use client";
/**
 * Enlace de invitación listo para compartir. Compartir necesita un toque nuevo:
 * iOS no deja abrir el menú después de esperar al servidor.
 */
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";

export function InviteLink({ url, title, onDone }: { url: string; title: string; onDone: () => void }) {
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast("Enlace copiado. Vence en 7 días.", { paw: true });
    } catch {
      toast("No se pudo copiar: mantén presionado el enlace para copiarlo.");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "Lukas", text: title, url });
    } catch (e) {
      if ((e as Error).name !== "AbortError") void copy();
    }
  }

  return (
    <div className="list list--inset invite-link">
      <div className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 10, padding: "14px 16px" }}>
        <span className="row__title">Enlace listo</span>
        <span className="row__sub invite-link__url">{url}</span>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button className="btn btn--filled btn--sm" onClick={share}>
              <Icon name="share" size="sm" />Compartir
            </button>
          )}
          <button className="btn btn--bordered btn--sm" onClick={copy}>
            <Icon name="copy" size="sm" />Copiar
          </button>
          <button className="btn btn--plain btn--sm" onClick={onDone}>Listo</button>
        </span>
      </div>
    </div>
  );
}
