"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { updateThemeAction } from "@/actions/profile";

const OPTIONS = [
  { value: "light" as const, icon: Sun, label: "Clair" },
  { value: "dark" as const, icon: Moon, label: "Sombre" },
  { value: "system" as const, icon: Monitor, label: "Système" },
];

function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // System
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }
  localStorage.setItem("cmac-theme", theme);
}

export function ThemeToggle({ initialTheme = "system" }: { initialTheme?: string }) {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    (initialTheme as "light" | "dark" | "system") || "system"
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const handleChange = (value: "light" | "dark" | "system") => {
    setTheme(value);
    applyTheme(value);
    // Persist to server (fire-and-forget)
    updateThemeAction(value);
  };

  return (
    <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => handleChange(value)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            theme === value
              ? "bg-cma-bordeaux text-white"
              : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
          aria-label={label}
          aria-pressed={theme === value}
        >
          <Icon size={14} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
