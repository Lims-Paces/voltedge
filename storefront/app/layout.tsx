import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoltEdge Electronics",
  description: "Consumer electronics and gadgets, delivered across Nigeria.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/" className="brand">
            <span className="bolt">⚡</span> VoltEdge <span className="brand-sub">Electronics</span>
          </a>
        </header>
        <main>{children}</main>
        <footer className="site-footer">© {new Date().getFullYear()} VoltEdge Electronics · Lagos, Nigeria</footer>
      </body>
    </html>
  );
}
