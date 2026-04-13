export function TagBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: `${color}20`, color }}
    >
      {name}
    </span>
  );
}
