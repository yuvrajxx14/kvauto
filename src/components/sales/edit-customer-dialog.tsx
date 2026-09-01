import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePerms } from "@/lib/permissions";
import { CUSTOMER_TYPES, type CustomerType } from "@/lib/sales";
import { VillageSelect, TehsilSelect } from "@/components/sales/location-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CustomerRow = {
  id: string;
  customer_name: string;
  mobile: string;
  alternate_mobile: string | null;
  village: string;
  taluka: string | null;
  district: string | null;
  address: string | null;
  customer_type: CustomerType;
};

/** Edit customer master details — visible to roles with customer.edit. */
export function EditCustomerDialog({ customer }: { customer: CustomerRow }) {
  const perms = usePerms();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(customer);

  useEffect(() => {
    if (open) setForm(customer);
  }, [open, customer]);

  if (!perms.can("customer.edit")) return null;

  const set = <K extends keyof CustomerRow>(k: K, v: CustomerRow[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.customer_name.trim() || !form.mobile.trim() || !form.village.trim()) {
      toast.error("Name, mobile and village are required");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("customers")
      .update({
        customer_name: form.customer_name.trim(),
        mobile: form.mobile.trim(),
        alternate_mobile: form.alternate_mobile?.trim() || null,
        village: form.village.trim(),
        taluka: form.taluka?.trim() || null,
        district: form.district?.trim() || null,
        address: form.address?.trim() || null,
        customer_type: form.customer_type,
      })
      .eq("id", customer.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Customer updated");
    qc.invalidateQueries();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          Edit customer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit customer</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Customer name</Label>
            <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
          </div>
          <div>
            <Label>Mobile</Label>
            <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
          </div>
          <div>
            <Label>Alternate mobile</Label>
            <Input
              value={form.alternate_mobile ?? ""}
              onChange={(e) => set("alternate_mobile", e.target.value)}
            />
          </div>
          <div>
            <Label>Village</Label>
            <VillageSelect
              value={form.village}
              onChange={(v) => set("village", v)}
              onTehsilChange={(t) => set("taluka", t)}
            />
          </div>
          <div>
            <Label>Taluka</Label>
            <TehsilSelect value={form.taluka ?? ""} onChange={(v) => set("taluka", v)} />
          </div>
          <div>
            <Label>District</Label>
            <Input value={form.district ?? ""} onChange={(e) => set("district", e.target.value)} />
          </div>
          <div>
            <Label>Customer type</Label>
            <Select
              value={form.customer_type}
              onValueChange={(v) => set("customer_type", v as CustomerType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Textarea value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
