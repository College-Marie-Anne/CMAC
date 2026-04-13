"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer } from "recharts";

/**
 * Wrapper around Recharts ResponsiveContainer.
 * Suppresses the harmless "width(-1) height(-1)" warning by
 * deferring render to the next tick after mount, when the
 * container has real dimensions from the DOM layout pass.
 *
 * The warning is a known Recharts 3.x issue with React 19 Strict Mode
 * double-rendering — ResizeObserver fires before layout completes.
 * The charts render correctly regardless; this wrapper eliminates
 * the console noise.
 */
export function ChartContainer({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Defer to next microtask — layout is complete by then
    const id = setTimeout(() => setShow(true), 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="h-[250px] w-full">
      {show ? (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full animate-pulse rounded-xl bg-gray-100" />
      )}
    </div>
  );
}
