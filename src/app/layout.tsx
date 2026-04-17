import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { SerwistProvider } from "./serwist-provider";
import { PwaUpdateReloader } from "@/components/pwa/pwa-update-reloader";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "CMA Connect",
  description: "Plateforme de réseautage et mentorat du Collège Marie-Anne",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: " ",
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
    <html
      lang="fr"
      className={cn("h-full antialiased font-sans", inter.variable)}
      // Style inline : peinture immédiate par le navigateur avant même que
      // le CSS global ne soit parsé. Sans ça, un flash blanc apparaissait
      // entre le démontage d'une page et le paint du root loading
      // (particulièrement visible sur les navigations inter-pages protégées).
      // Dark mode ajusté via le script anti-FOUC ci-dessous avant hydratation.
      style={{ backgroundColor: "#F5F5F5" }}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col"
        style={{ backgroundColor: "#F5F5F5" }}
      >
        {/* Anti-FOUC dark mode + bg — appliqué AVANT toute hydratation.
            Next.js 16 refuse les <script> inline dans les composants React ;
            next/script + strategy=beforeInteractive est le pattern officiel.
            Si dark mode détecté : ajoute `.dark` sur <html> ET surcharge le
            bg inline de <html>/<body> en noir (#0D0D0D) — sinon l'inline
            `#F5F5F5` ci-dessus créerait un flash clair à l'ouverture dark. */}
        <Script
          id="cmac-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cmac-theme');var dark=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(dark){document.documentElement.classList.add('dark');document.documentElement.style.backgroundColor='#0D0D0D';document.body&&(document.body.style.backgroundColor='#0D0D0D')}}catch(e){}})()`,
          }}
        />
        {/* Le fond bordeaux fixed global a été retiré : il causait un flash
            rouge perceptible entre les transitions de pages protégées (feed,
            directory, admin…) dont le bg est gris clair. Chaque page publique
            (login, register, splash, pending, maintenance, offline,
            not-found) applique désormais son propre gradient bordeaux inline
            en SSR, ce qui suffit pour le branding sans polluer les autres
            routes. */}
        {/* scope: "/" — le SW contrôle tout le site (requis pour que Chrome
            affiche l'install prompt). @serwist/turbopack renvoie l'en-tête
            Service-Worker-Allowed: / côté serveur qui autorise ce scope.

            reloadOnOnline=true : reload auto quand la connexion revient
            (utile pour les PWA Android qui hibernent).

            <PwaUpdateReloader /> : reload auto quand un nouveau SW prend le
            contrôle, + force un update check à chaque visibilitychange.
            Sans ça, l'utilisatrice devait désinstaller/réinstaller la PWA
            pour voir les updates. */}
        <SerwistProvider
          swUrl="/serwist/sw.js"
          options={{ scope: "/" }}
          reloadOnOnline
        >
          <PwaUpdateReloader />
          {children}
        </SerwistProvider>
        <OfflineBanner />
      </body>
    </html>
  );
}
