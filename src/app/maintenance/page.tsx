import Image from "next/image";
import { Wrench } from "lucide-react";

export const metadata = {
  title: "Maintenance — CMA Connect",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center px-5 py-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #800020 0%, #5c0018 40%, #3a000f 80%, #1a0008 100%)",
      }}
    >
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm mx-auto">
        {/* Logo */}
        <div
          className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center mb-8"
          style={{
            border: "2px solid rgba(212,160,23,0.3)",
            boxShadow: "0 0 30px rgba(212,160,23,0.15)",
          }}
        >
          <Image
            src="/CMAC.jpeg"
            alt="CMA Connect"
            width={100}
            height={100}
            className="object-cover scale-125"
            style={{ width: "auto", height: "auto" }}
          />
        </div>

        <div
          className="mb-6 flex items-center justify-center w-16 h-16 rounded-full"
          style={{
            background: "rgba(212,160,23,0.1)",
            border: "1px solid rgba(212,160,23,0.2)",
          }}
        >
          <Wrench size={28} style={{ color: "#D4A017" }} />
        </div>

        <h1 className="text-xl font-semibold text-white mb-3">
          CMA Connect est en maintenance
        </h1>

        <p
          className="text-sm leading-relaxed mb-4 max-w-[320px]"
          style={{ color: "rgba(245,222,179,0.7)" }}
        >
          Nous effectuons une mise à jour pour améliorer votre expérience.
          La plateforme sera de nouveau disponible très prochainement.
        </p>

        <p
          className="text-xs"
          style={{ color: "rgba(245,222,179,0.45)" }}
        >
          Merci de votre patience.
        </p>

        <p
          className="mt-10 text-[11px] tracking-widest uppercase"
          style={{ color: "rgba(245,222,179,0.25)" }}
        >
          CMA &middot; Connexion &middot; Mentorat
        </p>
      </div>
    </div>
  );
}
