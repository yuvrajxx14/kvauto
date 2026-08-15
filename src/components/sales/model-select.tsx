import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/lib/erp";

/** Model dropdown backed by the Product Master. */
export function ModelSelect({
  name = "model",
  defaultValue,
  onValueChange,
  placeholder = "Select model",
}: {
  name?: string;
  defaultValue?: string | undefined;
  onValueChange?: (v: string) => void;
  placeholder?: string;
}) {
  const { data: products } = useProducts(true);
  const list = products ?? [];
  const initial = defaultValue && defaultValue.length > 0 ? defaultValue : list[0]?.model;

  return (
    <Select name={name} defaultValue={initial} onValueChange={onValueChange} key={initial ?? "empty"}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {list.length === 0 && <SelectItem value="__none" disabled>No products yet</SelectItem>}
        {list.map((p) => (
          <SelectItem key={p.id} value={p.model}>
            {p.model}
            {p.hp ? ` · ${p.hp}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
