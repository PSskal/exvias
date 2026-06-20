import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EXVIASS S.A.",
    short_name: "EXVIASS",
    description: "Reservas de transporte fijo entre Cusco y Colquepata.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F7FA",
    theme_color: "#1E5BFF",
    categories: ["travel", "transportation"],
    lang: "es-PE",
    icons: [
      {
        src: "/brand/exviass-pwa-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/exviass-pwa-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/brand/exviass-pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Reservar viaje",
        short_name: "Reservar",
        description: "Ver turnos disponibles",
        url: "/trips",
        icons: [{ src: "/brand/exviass-pwa-192.png", sizes: "192x192" }],
      },
      {
        name: "Mis viajes",
        short_name: "Viajes",
        description: "Ver reservas y seguimiento",
        url: "/my-trips",
        icons: [{ src: "/brand/exviass-pwa-192.png", sizes: "192x192" }],
      },
    ],
  };
}
