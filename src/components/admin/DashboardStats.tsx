import { useEffect, useState, useCallback, useRef } from "react";
import { FileText, Zap, Users, MessageSquare, Heart, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Trend { value: number; label: string }
interface StatItem { key: string; label: string; value: number; trend: Trend | null }

interface Props {
  initialStats: StatItem[];
  refreshInterval?: number;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  posts:     FileText,
  updates:   Zap,
  users:     Users,
  comments:  MessageSquare,
  reactions: Heart,
};
const PALETTE: Record<string, { icon: string; bg: string; ring: string }> = {
  posts:     { icon: "text-blue-500",    bg: "bg-blue-500/10",    ring: "ring-blue-500/20"    },
  updates:   { icon: "text-cyan-500",    bg: "bg-cyan-500/10",    ring: "ring-cyan-500/20"    },
  users:     { icon: "text-violet-500",  bg: "bg-violet-500/10",  ring: "ring-violet-500/20"  },
  comments:  { icon: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
  reactions: { icon: "text-rose-500",    bg: "bg-rose-500/10",    ring: "ring-rose-500/20"    },
};

function formatTime(seconds: number) {
  if (seconds < 60)  return "Ahora mismo";
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  return `Hace ${Math.floor(seconds / 3600)} h`;
}

export default function DashboardStats({ initialStats, refreshInterval = 60_000 }: Props) {
  const [stats, setStats]           = useState<StatItem[]>(initialStats);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing]  = useState(false);
  const [secondsAgo, setSecondsAgo]  = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/dashboard/stats");
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats);
      setLastRefresh(new Date());
      setSecondsAgo(0);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(fetchStats, refreshInterval);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchStats, refreshInterval]);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefresh.getTime()) / 1000));
    }, 15_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [lastRefresh]);

  return (
    <div className="mb-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Resumen general
          </h2>
          {/* Live indicator */}
          <span className="flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/30 px-2 py-0.5 text-[10px] text-muted-foreground">
            <span className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              refreshing ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
            )} />
            {refreshing ? "Actualizando..." : formatTime(secondsAgo)}
          </span>
        </div>

        <button
          onClick={fetchStats}
          disabled={refreshing}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
            "border-border/60 bg-secondary/30 text-muted-foreground",
            "hover:bg-secondary/60 hover:text-foreground hover:border-border",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "active:scale-95"
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Actualizar
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat) => {
          const Icon = ICONS[stat.key] ?? FileText;
          const { icon, bg, ring } = PALETTE[stat.key] ?? { icon: "text-muted-foreground", bg: "bg-secondary/30", ring: "" };
          const trendUp   = stat.trend && stat.trend.value > 0;
          const trendDown = stat.trend && stat.trend.value < 0;

          return (
            <div
              key={stat.key}
              className={cn(
                "relative overflow-hidden rounded-xl border border-border/60 bg-card p-4",
                "transition-shadow hover:shadow-sm"
              )}
            >
              {/* Colored accent line at top */}
              <div className={cn("absolute inset-x-0 top-0 h-0.5 rounded-t-xl", bg.replace("/10", "/60"))} />

              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-full ring-1", bg, ring)}>
                  <Icon className={cn("h-4.5 w-4.5", icon)} />
                </div>
                {stat.trend ? (
                  <span className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    trendUp   && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    trendDown && "bg-red-500/10 text-red-600 dark:text-red-400",
                    !trendUp && !trendDown && "bg-secondary/50 text-muted-foreground/60"
                  )}>
                    {trendUp   && <TrendingUp   className="h-3 w-3" />}
                    {trendDown && <TrendingDown  className="h-3 w-3" />}
                    {stat.trend.label}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground/40">—</span>
                )}
              </div>

              <p className="text-2xl font-bold tabular-nums leading-none mb-1">
                {stat.value.toLocaleString("es-ES")}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground/40 text-right">
        Tendencia vs los últimos 7 días · actualización automática cada minuto
      </p>
    </div>
  );
}
