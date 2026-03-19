import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
