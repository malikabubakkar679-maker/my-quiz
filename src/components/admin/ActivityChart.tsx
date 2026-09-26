"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ActivityChart({ data }: { data: { day: string; attempts: number; new_users: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c5cff" stopOpacity={0.5} /><stop offset="1" stopColor="#7c5cff" stopOpacity={0} /></linearGradient>
          <linearGradient id="a2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b82f6" stopOpacity={0.4} /><stop offset="1" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: "#9497c2", fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: "#9497c2", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: "#0f1030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
        <Area type="monotone" dataKey="attempts" name="Quiz attempts" stroke="#7c5cff" fill="url(#a1)" strokeWidth={2} />
        <Area type="monotone" dataKey="new_users" name="New users" stroke="#3b82f6" fill="url(#a2)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
