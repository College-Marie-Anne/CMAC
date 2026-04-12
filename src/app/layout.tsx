import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "CMA Connect",
  description: "Plateforme de réseautage et mentorat du Collège Marie-Anne",
};

export const viewport: Viewport = {
  themeColor: "#3a000f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("h-full antialiased font-sans", inter.variable)}>
      <body className="min-h-full flex flex-col">
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "linear-gradient(160deg, #3a000f 0%, #5c0018 30%, #800020 60%, #5c0018 100%)",
            zIndex: -1,
          }}
        />
        {children}
      </body>
    </html>
  );
}
