import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Row that holds the search box and the dropdown filters of a list page. */
export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-3 flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-56 flex-1", className)}>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input className="pl-8" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export type FilterOption = { value: string; label: string };

export function FilterSelect({
  value,
  onChange,
  options,
  className = "w-48",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  className?: string;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue {...(placeholder ? { placeholder } : {})} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Small "Clear" button, shown only when at least one filter is active. */
export function ClearFilters({ show, onClear }: { show: boolean; onClear: () => void }) {
  if (!show) return null;
  return (
    <Button variant="ghost" size="sm" onClick={onClear}>
      <X className="mr-1 h-3.5 w-3.5" /> Clear
    </Button>
  );
}

/** Build dropdown options from the values present in the rows. */
export function optionsFrom(values: (string | null | undefined)[], allLabel: string): FilterOption[] {
  const uniq = Array.from(new Set(values.filter((v): v is string => !!v && v.trim().length > 0))).sort((a, b) =>
    a.localeCompare(b),
  );
  return [{ value: "all", label: allLabel }, ...uniq.map((v) => ({ value: v, label: v }))];
}
