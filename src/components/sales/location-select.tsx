import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VILLAGES, TEHSILS } from "@/lib/geo";

type BaseProps = {
  /** Optional form field name — renders a hidden input so plain FormData submits work. */
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

export function VillageSelect({
  name,
  value,
  onChange,
  defaultValue = "",
  placeholder = "Select village",
  required,
  disabled,
}: BaseProps) {
  const [internal, setInternal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const selected = value !== undefined ? value : internal;

  function pick(v: string) {
    if (value === undefined) setInternal(v);
    onChange?.(v);
    setOpen(false);
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={selected} required={required} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              !selected && "text-muted-foreground",
            )}
          >
            {selected || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search village…" />
            <CommandList>
              <CommandEmpty>No village found.</CommandEmpty>
              <CommandGroup>
                {VILLAGES.map((v) => (
                  <CommandItem key={v} value={v} onSelect={() => pick(v)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected === v ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {v}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}

export function TehsilSelect({
  name,
  value,
  onChange,
  defaultValue = "",
  placeholder = "Select tehsil",
  disabled,
}: BaseProps) {
  const [internal, setInternal] = useState(defaultValue);
  const selected = value !== undefined ? value : internal;

  return (
    <Select
      value={selected || undefined}
      disabled={disabled ?? false}
      onValueChange={(v) => {
        if (value === undefined) setInternal(v);
        onChange?.(v);
      }}
    >
      {name && <input type="hidden" name={name} value={selected} />}
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {TEHSILS.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
