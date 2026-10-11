"use client";
import { useId } from "react";
import LukasArtSvg from "./lukas-art";

export type ArtName = "face" | "icon" | "sleepingPot" | "peek" | "sprout";

/** Ilustración de Lukas en tinta (SVG a mano). En oscuro va sobre una placa crema. */
export function LukasArt({ name, className }: { name: ArtName; className?: string }) {
  const idPrefix = "lk" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const html = name === "sprout" ? LukasArtSvg.sprout() : LukasArtSvg[name]({ idPrefix });
  return <div className={["art", className ?? ""].join(" ").trim()} dangerouslySetInnerHTML={{ __html: html }} />;
}
