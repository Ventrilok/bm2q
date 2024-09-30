import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";
import ClientThemeWrapper from "../context/ClientThemeWrapper";

export const metadata = {
  title: "BM2Q",
  description: ";)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <ClientThemeWrapper>
            <div className="mx-auto h-screen max-w-5xl pt-4 text-2xl">
              <div className="join join-vertical">
                <input
                  type="radio"
                  name="theme-buttons"
                  className="theme-controller btn join-item"
                  aria-label="Retro"
                  value="retro"
                />

                <input
                  type="radio"
                  name="theme-buttons"
                  className="theme-controller btn join-item"
                  aria-label="Aqua"
                  value="aqua"
                />
              </div>
              {children}
            </div>
          </ClientThemeWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
