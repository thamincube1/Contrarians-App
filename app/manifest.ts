import type { MetadataRoute } from "next";

// Served by Next at /manifest.webmanifest and auto-linked in <head>. The
// caretaker shell is the installable surface — see the PWA/offline notes
// in components/caretaker/DesignNotes.tsx and README.md.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HAUSWERK — Internal Ops",
    short_name: "HAUSWERK",
    description: "Internal operations app for the Hauswerk residential portfolio",
    start_url: "/caretaker",
    scope: "/",
    display: "standalone",
    background_color: "#f3f2f2",
    theme_color: "#201e1d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
