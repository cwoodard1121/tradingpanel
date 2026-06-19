import type { MetadataRoute } from "next";

// PWA Web App Manifest. Next serves this at /manifest.webmanifest and
// auto-injects the <link rel="manifest"> tag for us.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BTC Risk & Journal",
    short_name: "BTC Risk",
    description:
      "Bitcoin trading risk / position-size calculator and trade journal.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0e14",
    theme_color: "#0a0e14",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
