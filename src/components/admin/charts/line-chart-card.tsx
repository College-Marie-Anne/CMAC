"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartContainer } from "./chart-container";

interface LineChartCardProps {
  title: string;
  data: Array<Record<string, string | number>>;
  lines: Array<{ dataKey: string; color: string; name: string }>;
  xDataKey: string;
}

export function LineChartCard({ title, data, lines, xDataKey }: LineChartCardProps) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xDataKey} tick={{ fontSize: 11, fill: "#999" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#999" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "none",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                fontSize: 12,
              }}
            />
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                strokeWidth={2}
                dot={false}
                name={line.name}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
