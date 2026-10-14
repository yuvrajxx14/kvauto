import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { VillageSelect } from "@/components/sales/location-select";

type Adv = {
  remarks: string | null;
  advance_delivered: boolean;
  adv_customer_name: string | null;
  adv_mobile: string | null;
  adv_village: string | null;
  adv_date: string | null;
};
const db = supabase as unknown as { from: (t: string) => any };

/** Remarks + "advance delivered in company DMS" details for one tractor in stock. */
export function AdvanceDeliveryCard({ stockId }: { stockId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["stock-adv", stockId],
    queryFn: async (): Promise<Adv> => {
      const { data, error } = await db
        .from("tractor_stock")
        .select("remarks, advance_delivered, adv_customer_name, adv_mobile, adv_village, adv_date")
        .eq("id", stockId)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const [f, setF] = useState<Adv | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF(data); }, [data]);
  if (!f) return null;
  const set = (p: Partial<Adv>) => setF((x) => ({ ...(x as Adv), ...p }));

  async function save() {
    if (!f) return;
    if (f.advance_delivered && (!f.adv_customer_name?.trim() || !f.adv_mobile?.trim())) {
      toast.error("Enter customer name and mobile for the advance delivery");
      return;
    }
    setBusy(true);
    const { error } = await db.from("tractor_stock").update({
      remarks: f.remarks?.trim() || null,
      advance_delivered: f.advance_delivered,
      adv_customer_name: f.advance_delivered ? f.adv_customer_name?.trim() || null : null,
      adv_mobile: f.advance_delivered ? f.adv_mobile?.trim() || null : null,
      adv_village: f.advance_delivered ? f.adv_village || null : null,
      adv_date: f.advance_delivered ? f.adv_date || null : null,
    }).eq("id", stockId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    qc.invalidateQueries();
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2"><CardTitle className="text-base">Remarks & advance delivery</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Remarks</Label><Textarea rows={2} value={f.remarks ?? ""} onChange={(e) => set({ remarks: e.target.value })} /></div>
        <label className="flex items-center justify-between rounded-md border p-2 text-sm">
          <span>
            <span className="font-medium">Advance delivered in company DMS</span>
            <span className="block text-xs text-muted-foreground">Shown as delivered to the company but still in our stock</span>
          </span>
          <Switch checked={f.advance_delivered} onCheckedChange={(v) => set({ advance_delivered: v, adv_date: v && !f.adv_date ? new Date().toISOString().slice(0, 10) : f.adv_date })} />
        </label>
        {f.advance_delivered && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div><Label>Customer name (in DMS)</Label><Input value={f.adv_customer_name ?? ""} onChange={(e) => set({ adv_customer_name: e.target.value })} /></div>
            <div><Label>Mobile</Label><Input value={f.adv_mobile ?? ""} onChange={(e) => set({ adv_mobile: e.target.value })} /></div>
            <div><Label>Village</Label><VillageSelect value={f.adv_village ?? ""} onChange={(v) => set({ adv_village: v })} /></div>
            <div><Label>DMS delivery date</Label><Input type="date" value={f.adv_date ?? ""} onChange={(e) => set({ adv_date: e.target.value })} /></div>
          </div>
        )}
        <Button size="sm" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
      </CardContent>
    </Card>
  );
}
