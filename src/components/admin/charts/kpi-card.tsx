import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import Link from "next/link";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color: string;
  href?: string;
}

export function KpiCard({ title, value, icon: Icon, trend, color, href }: KpiCardProps) {
  const content = (
    <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <p
                className="text-xs mt-1 font-medium"
                style={{ color: trend.value >= 0 ? "#006B3F" : "#dc2626" }}
              >
                {trend.value >= 0 ? "+" : ""}
                {trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color}15`, color }}
          >
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
