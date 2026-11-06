import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "./globals.css";
import SupportChat from "./components/SupportChat";

export const metadata: Metadata = {
  title: "VoltEdge Electronics",
  description: "Laptops, phones, consoles and audio from Lagos. 5% store credit on orders of ₦500,000 or more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SupportChat />
      </body>
    </html>
  );
}
