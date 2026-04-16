import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { SerwistProvider } from "./serwist-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "CMA Connect",
  description: "Plateforme de réseautage et mentorat du Collège Marie-Anne",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CMA Connect",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
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
    <html lang="fr" className={cn("h-full antialiased font-sans", inter.variable)} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/* Anti-FOUC dark mode — appliqué AVANT toute hydratation.
            Next.js 16 refuse les <script> inline dans les composants React ;
            next/script + strategy=beforeInteractive est le pattern officiel. */}
        <Script
          id="cmac-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cmac-theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "linear-gradient(160deg, #3a000f 0%, #5c0018 30%, #800020 60%, #5c0018 100%)",
            zIndex: -1,
          }}
        />
        <SerwistProvider swUrl="/serwist/sw.js">
          {children}
        </SerwistProvider>
        <OfflineBanner />
      </body>
    </html>
  );
}
