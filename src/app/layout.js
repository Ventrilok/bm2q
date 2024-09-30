import "./globals.css";

export const metadata = {
  title: "BM2Q",
  description: ";)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
