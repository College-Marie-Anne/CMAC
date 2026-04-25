import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { Toaster } from "sonner";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nonce généré par le proxy (src/proxy.ts) via crypto.randomUUID() à chaque
  // requête. Next.js l'injecte automatiquement sur ses propres scripts runtime
  // (hydratation, chunks) en lisant la CSP sur les request headers. Pour nos
  // <Script> manuels (anti-FOUC ci-dessous), on le passe explicitement.
  // null-safe : en dev sans proxy ou pendant build static, la prop `nonce`
  // undefined est ignorée par next/script.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="fr"
      className={cn("h-full antialiased font-sans", inter.variable)}
      // Style inline sur <html> : peinture bordeaux immédiate par le
      // navigateur avant même que le CSS global ne soit parsé. Évite le
      // flash blanc (Tailwind @apply bg-background défaut = blanc) qui était
      // la pire des deux gênes visuelles rapportées.
      // Le script anti-FOUC ci-dessous override en noir si dark mode AVANT
      // hydratation React. `suppressHydrationWarning` indispensable sur
      // <html> pour que React n'échoue pas en voyant la modification DOM
      // pré-hydratation (Next.js 16 transforme ces mismatches en erreurs
      // fatales, ex : issue "Application error: client-side exception").
      // Le body n'a PAS de style inline → aucun risque de mismatch côté
      // body, le CSS global (avec !important) cascade depuis <html>.
      style={{ backgroundColor: "#3a000f" }}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Anti-FOUC dark mode — appliqué AVANT toute hydratation.
            Rendu comme <script> natif dans ce Server Component : pas de
            re-exécution côté client, le navigateur l'a déjà évalué au parse.
            `suppressHydrationWarning` : les navigateurs strippent l'attribut
            nonce après parse HTML (anti-vol via CSS attribute selectors),
            ce qui crée un mismatch SSR/client sur cet attribut uniquement.
            Le script exécute correctement côté serveur (CSP valide le
            nonce), seul le warning React est neutralisé. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cmac-theme');var dark=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(dark){document.documentElement.classList.add('dark');document.documentElement.style.backgroundColor='#0D0D0D'}}catch(e){}})()`,
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

            <PwaUpdateReloader /> : check update au visibilitychange (throttlé
            1x/6h via localStorage) + reload auto quand un nouveau SW prend
            le contrôle. Sans ça, l'utilisatrice devait désinstaller/
            réinstaller la PWA pour voir les updates.

            `reloadOnOnline` volontairement OMIS : il forçait un reload complet
            à chaque toggle offline→online, coûteux sur mobile avec réseau
            instable, sans bénéfice — le SW sert déjà depuis cache en offline,
            et le `onControlling` du PwaUpdateReloader couvre déjà les cas où
            un update est pending et attend la reconnexion. */}
        <SerwistProvider
          swUrl="/serwist/sw.js"
          options={{ scope: "/" }}
        >
          <PwaUpdateReloader />
          {children}
        </SerwistProvider>
        <OfflineBanner />
        {/* Toaster sonner — feedback unifié pour toutes les actions serveur.
            Usage côté client : `toast.success("...")`, `toast.error("...")`.
            Voir `@/lib/toast` pour le helper `toastActionResult()`. */}
        <Toaster
          position="top-center"
          richColors
          closeButton
          theme="system"
          toastOptions={{
            classNames: {
              toast: "font-sans",
            },
          }}
        />
      </body>
    </html>
  );
}
