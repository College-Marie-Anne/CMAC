import dynamic from "next/dynamic";

export const GoldenParticles = dynamic(
  () =>
    import("@/components/ui/golden-particles").then(
      (mod) => mod.GoldenParticlesInner
    ),
  { ssr: false }
);
