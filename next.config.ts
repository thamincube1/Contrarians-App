import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server accept cross-origin requests (HMR, RSC fetches)
  // from a phone on the same LAN — otherwise Next blocks them and hot
  // reload silently fails when testing on a real device. Update this if
  // your laptop's LAN IP changes (DHCP renewal, different network).
  allowedDevOrigins: ["192.168.1.158"],
};

export default nextConfig;
