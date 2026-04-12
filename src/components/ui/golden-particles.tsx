"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";

const allParticles = [
  { id: 0, x: 12, y: 8, s: "w-[3px] h-[3px]", dur: 4, del: 0 },
  { id: 1, x: 85, y: 15, s: "w-[5px] h-[5px]", dur: 5, del: 0.3 },
  { id: 2, x: 45, y: 75, s: "w-[2px] h-[2px]", dur: 3.5, del: 0.8 },
  { id: 3, x: 70, y: 40, s: "w-[4px] h-[4px]", dur: 6, del: 1.2 },
  { id: 4, x: 25, y: 60, s: "w-[3px] h-[3px]", dur: 4.5, del: 0.5 },
  { id: 5, x: 90, y: 85, s: "w-[2px] h-[2px]", dur: 5.5, del: 1.5 },
  { id: 6, x: 8, y: 45, s: "w-[5px] h-[5px]", dur: 3, del: 0.2 },
  { id: 7, x: 55, y: 20, s: "w-[3px] h-[3px]", dur: 4, del: 1.0 },
  { id: 8, x: 35, y: 90, s: "w-[4px] h-[4px]", dur: 5, del: 0.7 },
  { id: 9, x: 78, y: 65, s: "w-[2px] h-[2px]", dur: 6, del: 1.8 },
  { id: 10, x: 18, y: 30, s: "w-[3px] h-[3px]", dur: 3.5, del: 0.4 },
  { id: 11, x: 62, y: 55, s: "w-[5px] h-[5px]", dur: 4.5, del: 1.1 },
  { id: 12, x: 42, y: 10, s: "w-[2px] h-[2px]", dur: 5, del: 0.6 },
  { id: 13, x: 95, y: 50, s: "w-[4px] h-[4px]", dur: 3, del: 1.4 },
  { id: 14, x: 5, y: 70, s: "w-[3px] h-[3px]", dur: 6, del: 0.9 },
];

function subscribe(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getSnapshot() {
  return window.innerWidth < 640;
}

function getServerSnapshot() {
  return false;
}

function GoldenParticlesInner() {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const particles = isMobile ? allParticles.slice(0, 8) : allParticles;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full bg-cma-or ${p.s}`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.del,
          }}
        />
      ))}
    </div>
  );
}

export { GoldenParticlesInner };
