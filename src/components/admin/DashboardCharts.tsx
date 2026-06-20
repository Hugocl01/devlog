import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export interface ActivityPoint {
  label: string;
  usuarios: number;
  comentarios: number;
  vistas: number;
}

export interface ContentPoint {
  label: string;
  posts: number;
  updates: number;
}

interface Props {
  activityData: ActivityPoint[];
  contentData: ContentPoint[];
}

// ── Theme detection ────────────────────────────────────────────────────────
function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

// ── Custom tooltip ─────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-lg text-xs min-w-28">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold tabular-nums" style={{ color: p.color }}>
            {p.value.toLocaleString("es")}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function DashboardCharts({ activityData, contentData }: Props) {
  const isDark = useIsDark();

  const gridStroke  = isDark ? "#1e293b" : "#f1f5f9";
  const axisStroke  = isDark ? "#475569" : "#cbd5e1";
  const tickFill    = isDark ? "#94a3b8" : "#64748b";
  const legendStyle = { fontSize: 12, color: tickFill };

  const colorUsers    = "#8b5cf6"; // violet-500
  const colorComments = "#10b981"; // emerald-500
  const colorViews    = "#f59e0b"; // amber-500
  const colorPosts    = "#3b82f6"; // blue-500
  const colorUpdates  = "#06b6d4"; // cyan-500

  const hasActivity = activityData.some(d => d.usuarios > 0 || d.comentarios > 0 || d.vistas > 0);
  const hasContent  = contentData.some(d => d.posts > 0 || d.updates > 0);

  return (
    <div className="grid lg:grid-cols-2 gap-4 mb-6">

      {/* ── Area chart: actividad semanal ── */}
      <div className="bg-card border border-border/60 rounded-xl p-5">
        <p className="text-sm font-semibold">Actividad semanal</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-5">Usuarios, comentarios y vistas — últimas 8 semanas</p>

        {!hasActivity ? (
          <div className="flex items-center justify-center h-52 text-sm text-muted-foreground/60">
            Sin actividad en este período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={colorUsers}    stopOpacity={0.25} />
                  <stop offset="95%" stopColor={colorUsers}    stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradComments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={colorComments} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={colorComments} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={colorViews}    stopOpacity={0.20} />
                  <stop offset="95%" stopColor={colorViews}    stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: tickFill }}
                tickLine={false}
                axisLine={{ stroke: axisStroke }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: tickFill }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: axisStroke, strokeWidth: 1 }} />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />

              <Area
                type="monotone"
                dataKey="vistas"
                name="Vistas"
                stroke={colorViews}
                strokeWidth={2}
                fill="url(#gradViews)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="usuarios"
                name="Usuarios"
                stroke={colorUsers}
                strokeWidth={2}
                fill="url(#gradUsers)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="comentarios"
                name="Comentarios"
                stroke={colorComments}
                strokeWidth={2}
                fill="url(#gradComments)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Bar chart: contenido publicado por mes ── */}
      <div className="bg-card border border-border/60 rounded-xl p-5">
        <p className="text-sm font-semibold">Contenido publicado</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-5">Posts y updates por mes — últimos 12 meses</p>

        {!hasContent ? (
          <div className="flex items-center justify-center h-52 text-sm text-muted-foreground/60">
            Sin contenido en este período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={contentData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={10} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: tickFill }}
                tickLine={false}
                axisLine={{ stroke: axisStroke }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: tickFill }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? "#ffffff08" : "#00000006" }} />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />

              <Bar dataKey="posts"   name="Posts"   fill={colorPosts}   radius={[4, 4, 0, 0]} />
              <Bar dataKey="updates" name="Updates" fill={colorUpdates} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
