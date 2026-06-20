import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, UserX, FileText, Zap, Tag,
  MessageSquare, MessageSquareOff, Smile, Image,
  CalendarDays, ClipboardList, Settings, Download, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: string;
}

interface Props {
  links: NavLink[];
  currentPath: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  UserX,
  FileText,
  Zap,
  Tag,
  MessageSquare,
  MessageSquareOff,
  Smile,
  Image,
  CalendarDays,
  ClipboardList,
  Settings,
  Download,
};

const STORAGE_KEY = "admin-sidebar-collapsed";

export default function AdminSidebar({ links, currentPath }: Props) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const isActive = (href: string) =>
    href === "/admin"
      ? currentPath === "/admin"
      : currentPath.startsWith(href);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col sticky top-16 self-start h-[calc(100vh-4rem)] border-r border-border/50 shrink-0 transition-[width] duration-200 overflow-hidden",
        collapsed ? "w-14" : "w-52"
      )}
    >
      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-0.5 p-2 overflow-y-auto overflow-x-hidden">
        {links.map(({ href, label, icon }) => {
          const Icon = ICON_MAP[icon] ?? LayoutDashboard;
          const active = isActive(href);
          return (
            <a
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 h-9 text-sm font-medium transition-colors min-w-0",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="truncate">{label}</span>
              )}
            </a>
          );
        })}
      </nav>

      {/* Toggle button at bottom */}
      <div className="p-2 border-t border-border/50">
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 h-9 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
        >
          {collapsed
            ? <PanelLeftOpen className="h-4 w-4 shrink-0" />
            : <><PanelLeftClose className="h-4 w-4 shrink-0" /><span className="truncate">Colapsar</span></>
          }
        </button>
      </div>
    </aside>
  );
}
