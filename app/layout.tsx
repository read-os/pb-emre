import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Photobooth · AcampaDentro EMRE",
  description: "O photobooth oficial do AcampaDentro EMRE",
  icons: { icon: "/logos/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="animated-bg min-h-screen">{children}</body>
    </html>
  );
}
