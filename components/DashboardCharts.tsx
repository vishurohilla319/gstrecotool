"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

export function MonthlyComparisonChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        No monthly ITC data available. Upload data or click &quot;Load Demo Dataset&quot;.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]}
            contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
          />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
          <Bar dataKey="booksItc" name="Books ITC" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gstr2aItc" name="2A ITC" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gstr2bItc" name="2B ITC (Eligible)" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gstr3bItc" name="3B Claimed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusDonutChart({ data }: { data: any[] }) {
  if (!data || data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        No reconciliation status data available. Run reconciliation to view.
      </div>
    );
  }

  return (
    <div className="h-72 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, name: any) => [`${value} Invoices`, name]}
            contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
