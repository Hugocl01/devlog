import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, FileText, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentItem {
  slug: string;
  title: string;
  date: string;      // ISO date string
  draft: boolean;
  scheduledAt: string | null;
  type: "post" | "update";
  updateType?: string | null;
}

interface Props {
  items: ContentItem[];
}

const STATUS_COLORS = {
  published: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/25",
  scheduled: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25",
  draft:     "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
};

function getStatus(item: ContentItem): "published" | "scheduled" | "draft" {
  if (item.draft) return "draft";
  if (item.scheduledAt && new Date(item.scheduledAt) > new Date()) return "scheduled";
  return "published";
}

export default function ContentCalendar({ items }: Props) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [filter, setFilter] = useState<"all" | "post" | "update">("all");

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const firstDay  = new Date(year, month, 1).getDay();          // 0 = Sunday
  const startDay  = (firstDay + 6) % 7;                         // Monday-first offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = useMemo(() => {
    const map: Record<number, ContentItem[]> = {};
    for (const item of items) {
      if (filter !== "all" && item.type !== filter) continue;
      const d = new Date(item.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(item);
      }
    }
    return map;
  }, [items, year, month, filter]);

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const monthName = new Date(year, month).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const todayDay  = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1;

  const totalInMonth = Object.values(byDay).flat().length;

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-secondary/30 hover:bg-secondary/60 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-sm font-medium capitalize min-w-40 text-center">{monthName}</span>
          <button
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-secondary/30 hover:bg-secondary/60 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/20 p-0.5">
          {(["all", "post", "update"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" && "Todos"}
              {f === "post" && <><FileText className="h-3 w-3" />Posts</>}
              {f === "update" && <><Zap className="h-3 w-3" />Updates</>}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {totalInMonth} ítem{totalInMonth !== 1 ? "s" : ""} este mes
        </span>
      </div>

      {/* Legend */}
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        {(["published", "scheduled", "draft"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("inline-block h-2.5 w-2.5 rounded-sm border", STATUS_COLORS[s])} />
            {s === "published" ? "Publicado" : s === "scheduled" ? "Programado" : "Borrador"}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-border/60 overflow-x-auto">
        <div className="min-w-160">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border/50 bg-secondary/20">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className={cn("grid grid-cols-7 divide-x divide-border/30", wi > 0 && "border-t border-border/30")}>
              {week.map((day, di) => {
                const dayItems = day ? (byDay[day] ?? []) : [];
                const isToday = day === todayDay;
                return (
                  <div
                    key={di}
                    className={cn(
                      "min-h-[80px] p-1.5 sm:p-2",
                      !day && "bg-secondary/10",
                      isToday && "bg-primary/5"
                    )}
                  >
                    {day && (
                      <>
                        <span className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium mb-1",
                          isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        )}>
                          {day}
                        </span>
                        <div className="space-y-0.5">
                          {dayItems.slice(0, 3).map((item) => {
                            const status = getStatus(item);
                            return (
                              <a
                                key={item.slug}
                                href={`/admin/${item.type === "post" ? "posts" : "updates"}/${item.slug}/edit`}
                                className={cn(
                                  "flex items-center gap-1 rounded border px-1 py-0.5 text-[10px] font-medium leading-tight hover:opacity-80 transition-opacity truncate",
                                  STATUS_COLORS[status]
                                )}
                                title={item.title}
                              >
                                {item.type === "post"
                                  ? <FileText className="h-2.5 w-2.5 shrink-0" />
                                  : <Zap className="h-2.5 w-2.5 shrink-0" />}
                                <span className="truncate">{item.title}</span>
                              </a>
                            );
                          })}
                          {dayItems.length > 3 && (
                            <span className="block text-[10px] text-muted-foreground px-1">
                              +{dayItems.length - 3} más
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
