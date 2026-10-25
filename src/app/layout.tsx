import type { Metadata } from "next";
import { Inter, Special_Elite } from "next/font/google";
import "./globals.css";

// Self-hosted fonts: downloaded at build time, served from this site
// (no runtime request to Google). Exposed as CSS variables used in globals.css.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const specialElite = Special_Elite({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-special-elite",
});

export const metadata: Metadata = {
  title: "BM2Q",
  description: "Blanc Manger Coco — Le jeu de cartes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${specialElite.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
