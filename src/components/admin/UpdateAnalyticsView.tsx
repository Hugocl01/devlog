import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Loader2, Eye } from "lucide-react";

interface DailyView { date: string; views: number }

interface AnalyticsData {
  title: string;
  totalViews: number;
  dailyViews: DailyView[];
}

interface Props {
  slug: string;
}

export default function UpdateAnalyticsView({ slug }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/updates/${slug}/analytics`)
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
      {/* Total stat */}
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 max-w-xs">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Eye className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{data.totalViews.toLocaleString("es-ES")}</p>
          <p className="text-xs text-muted-foreground">Visitas totales</p>
        </div>
      </div>

      {/* Daily views chart */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Visitas — últimos 30 días</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.dailyViews} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="updateViewsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: string) => {
                const d = new Date(v + "T00:00:00");
                return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
              }}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, maxViews + 1]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelFormatter={(v: string) =>
                new Date(v + "T00:00:00").toLocaleDateString("es-ES", {
                  weekday: "short", day: "numeric", month: "long",
                })
              }
              formatter={(v: number) => [v, "Visitas"]}
            />
            <Area
              type="monotone"
              dataKey="views"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#updateViewsGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
