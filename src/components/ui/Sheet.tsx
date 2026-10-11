"use client";
import type { ReactNode } from "react";
import { Drawer } from "vaul";

/** Bottom sheet (vaul): radio 32, agarradera, arrastrable para cerrar. */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  bare = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  /** sin fondo: para action sheets */
  bare?: boolean;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="vaul-overlay" />
        <Drawer.Content className={["vaul-sheet", bare ? "vaul-sheet--bare" : ""].join(" ")} aria-describedby={undefined}>
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          {!bare && <div className="sheet__grabber" aria-hidden="true" />}
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
