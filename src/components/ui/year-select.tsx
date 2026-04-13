"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";

const MIN_YEAR = 1980;
const MAX_YEAR_OFFSET = 10;

function generateYears(): number[] {
  const max = new Date().getFullYear() + MAX_YEAR_OFFSET;
  const years: number[] = [];
  for (let y = max; y >= MIN_YEAR; y--) years.push(y);
  return years;
}

interface YearSelectProps {
  value: number | null | undefined;
  onChange: (year: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  variant?: "dark" | "light";
}

export function YearSelect({
  value,
  onChange,
  placeholder = "Sélectionner une année",
  disabled = false,
  className = "",
  variant = "dark",
}: YearSelectProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allYears = useMemo(generateYears, []);

  const filtered = useMemo(
    () =>
      filter
        ? allYears.filter((y) => String(y).includes(filter))
        : allYears,
    [allYears, filter]
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setFilter("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll to selected year when opening
  useEffect(() => {
    if (open && value && listRef.current) {
      const el = listRef.current.querySelector(`[data-year="${value}"]`);
      if (el) el.scrollIntoView({ block: "center" });
    }
  }, [open, value]);

  const handleSelect = (year: number) => {
    onChange(year);
    setOpen(false);
    setFilter("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setFilter("");
    }
    if (e.key === "Enter" && filtered.length === 1) {
      handleSelect(filtered[0]);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen(!open);
          if (!open) setTimeout(() => inputRef.current?.focus(), 0);
        }}
        disabled={disabled}
        className={`w-full h-10 px-3 rounded-xl border text-sm text-left flex items-center justify-between transition-colors ${
          disabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
            : open
              ? "border-cma-bordeaux bg-white text-gray-900"
              : variant === "light"
                ? "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                : "border-white/20 bg-white/[0.08] text-white hover:bg-white/[0.12]"
        }`}
      >
        <span className={value ? "" : "opacity-50"}>
          {value ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={filter}
              onChange={(e) => setFilter(e.target.value.replace(/\D/g, ""))}
              onKeyDown={handleKeyDown}
              placeholder="Taper une année..."
              className="w-full h-8 px-2.5 rounded-lg bg-gray-50 border-0 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-cma-bordeaux"
            />
          </div>

          {/* Year list */}
          <div
            ref={listRef}
            className="max-h-48 overflow-y-auto overscroll-contain"
          >
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-xs text-gray-400">
                Aucune année trouvée
              </p>
            ) : (
              filtered.map((year) => (
                <button
                  key={year}
                  type="button"
                  data-year={year}
                  onClick={() => handleSelect(year)}
                  className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                    value === year
                      ? "bg-cma-bordeaux/10 text-cma-bordeaux font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {year}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
