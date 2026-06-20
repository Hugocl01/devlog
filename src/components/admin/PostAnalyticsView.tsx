import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Loader2, Eye, MessageSquare, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

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

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const formatted = (() => {
    try { return new Date(label + "T00:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "long" }); }
    catch { return label; }
  })();
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-lg text-xs min-w-28">
      <p className="font-semibold text-foreground mb-1.5">{formatted}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold tabular-nums" style={{ color: p.color }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
}

interface DailyView { date: string; views: number }

interface AnalyticsData {
  title: string;
  totalViews: number;
  comments: number;
  reactions: number;
  dailyViews: DailyView[];
}

interface Props {
  slug: string;
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
      <div className={cn("rounded-lg p-2.5", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value.toLocaleString("es-ES")}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function PostAnalyticsView({ slug }: Props) {
  const isDark = useIsDark();
  const gridStroke  = isDark ? "#1e293b" : "#f1f5f9";
  const axisStroke  = isDark ? "#475569" : "#cbd5e1";
  const tickFill    = isDark ? "#94a3b8" : "#64748b";
  const colorViews  = "#3b82f6"; // blue-500 (posts)

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/posts/${slug}/analytics`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Error al cargar las analíticas"));
  }, [slug]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxViews = Math.max(...data.dailyViews.map((d) => d.views), 1);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Eye}           label="Visitas totales" value={data.totalViews} color="bg-blue-500/10 text-blue-600 dark:text-blue-400"    />
        <StatCard icon={MessageSquare} label="Comentarios"    value={data.comments}   color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={Heart}         label="Reacciones"     value={data.reactions}  color="bg-rose-500/10 text-rose-600 dark:text-rose-400"          />
      </div>

      {/* Daily views chart */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Visitas — últimos 30 días</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.dailyViews} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={colorViews} stopOpacity={0.25} />
                <stop offset="95%" stopColor={colorViews} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: tickFill }}
              tickLine={false}
              axisLine={{ stroke: axisStroke }}
              tickFormatter={(v: string) => {
                const d = new Date(v + "T00:00:00");
                return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
              }}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 11, fill: tickFill }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, maxViews + 1]}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: axisStroke, strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="views"
              name="Visitas"
              stroke={colorViews}
              strokeWidth={2}
              fill="url(#viewsGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
