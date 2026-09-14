import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HAUSWERK — Internal ops",
  description: "Internal operations tool for the Hauswerk residential portfolio",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
