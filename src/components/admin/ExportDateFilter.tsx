import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function dispatch(from: string, to: string) {
  document.dispatchEvent(
    new CustomEvent("export-date-change", { detail: { from, to } })
  );
}

interface DatePickerProps {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  disabled?: { after?: Date; before?: Date };
}

function DatePicker({ label, value, onChange, disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-border/60 bg-secondary/20 px-3 text-xs text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground data-[state=open]:bg-secondary/40"
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            {value ? format(value, "d MMM yyyy", { locale: es }) : "Seleccionar…"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => { onChange(d); setOpen(false); }}
            disabled={disabled}
            locale={es}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function ExportDateFilter() {
  const [from, setFrom] = React.useState<Date | undefined>(undefined);
  const [to, setTo]     = React.useState<Date | undefined>(undefined);

  const handleFrom = (d: Date | undefined) => {
    setFrom(d);
    if (to && d && d > to) { setTo(undefined); dispatch(fmt(d), ""); }
    else dispatch(fmt(d), fmt(to));
  };

  const handleTo = (d: Date | undefined) => {
    setTo(d);
    dispatch(fmt(from), fmt(d));
  };

  const clear = () => {
    setFrom(undefined);
    setTo(undefined);
    dispatch("", "");
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <DatePicker
        label="Desde"
        value={from}
        onChange={handleFrom}
        disabled={to ? { after: to } : undefined}
      />
      <DatePicker
        label="Hasta"
        value={to}
        onChange={handleTo}
        disabled={from ? { before: from } : undefined}
      />
      {(from || to) && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex h-8 items-center gap-1.5 self-end rounded-lg border border-border/60 bg-secondary/20 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <X className="h-3 w-3" /> Limpiar
        </button>
      )}
    </div>
  );
}

function fmt(d: Date | undefined) {
  return d ? format(d, "yyyy-MM-dd") : "";
}
