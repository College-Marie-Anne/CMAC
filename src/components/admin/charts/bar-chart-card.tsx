"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartContainer } from "./chart-container";

interface BarChartCardProps {
  title: string;
  data: Array<Record<string, string | number>>;
  bars: Array<{ dataKey: string; color: string; name: string }>;
  xDataKey: string;
  layout?: "horizontal" | "vertical";
}

export function BarChartCard({
  title,
  data,
  bars,
  xDataKey,
  layout = "horizontal",
}: BarChartCardProps) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer>
          <BarChart
            data={data}
            layout={layout === "vertical" ? "vertical" : "horizontal"}
            margin={{ top: 5, right: 10, left: layout === "vertical" ? 60 : -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            {layout === "vertical" ? (
              <>
                <XAxis type="number" tick={{ fontSize: 11, fill: "#999" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey={xDataKey} tick={{ fontSize: 11, fill: "#999" }} tickLine={false} axisLine={false} width={55} />
              </>
            ) : (
              <>
                <XAxis dataKey={xDataKey} tick={{ fontSize: 11, fill: "#999" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#999" }} tickLine={false} axisLine={false} />
              </>
            )}
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "none",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                fontSize: 12,
              }}
            />
            {bars.map((bar) => (
              <Bar key={bar.dataKey} dataKey={bar.dataKey} fill={bar.color} radius={[4, 4, 0, 0]} name={bar.name} />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
