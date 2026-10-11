import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Lukas",
    short_name: "Lukas",
    description: "Tareas del hogar que se repiten, con anillos que se llenan y Lukas cuidando la casa.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF6DC",
    theme_color: "#FBF6DC",
    lang: "es",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Pendientes de casa", short_name: "Pendientes", url: "/pendientes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
