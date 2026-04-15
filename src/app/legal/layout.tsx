import Link from "next/link";
import Image from "next/image";
import { RetourButton } from "./retour-button";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <RetourButton />
          <div className="flex items-center gap-2 ml-auto">
            <Image
              src="/CMAC.jpeg"
              alt="CMA"
              width={28}
              height={28}
              className="rounded-full object-cover scale-125"
            />
            <span className="text-sm font-semibold text-gray-700">
              CMA Connect
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <p>CMA Connect &mdash; Collège Marie-Anne &amp; LakouSystems</p>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-gray-600 transition-colors">
              CGU
            </Link>
            <Link href="/legal/privacy" className="hover:text-gray-600 transition-colors">
              Confidentialité
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
