import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lukas",
    short_name: "Lukas",
    description: "Tareas del hogar que se repiten.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF6DC",
    theme_color: "#FBF6DC",
    lang: "es",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
