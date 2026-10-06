import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { db, isReorder, useAccessories, useDeliveryAccessories } from "@/lib/accessories";

/** Tick the accessories handed over with the tractor; ticked items reduce accessory stock by 1. */
export function DeliveryAccessories({ bookingId }: { bookingId: string }) {
  const { data: list } = useAccessories();
  const { data: saved } = useDeliveryAccessories(bookingId);
  const qc = useQueryClient();
  const [given, setGiven] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (saved && saved.length) setGiven(Object.fromEntries(saved.map((s) => [s.accessory_id, s.given])));
    else if (list) setGiven(Object.fromEntries(list.map((a) => [a.id, true])));
  }, [saved, list]);

  async function save() {
    setBusy(true);
    const ids = Object.entries(given).filter(([, v]) => v).map(([k]) => k);
    const { error } = await db.rpc("record_delivery_accessories", { _booking_id: bookingId, _given: ids });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Accessories saved and stock updated");
    qc.invalidateQueries({ queryKey: ["accessories"] });
    qc.invalidateQueries({ queryKey: ["delivery-accessories", bookingId] });
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" /> Accessories given</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(list ?? []).map((a) => (
          <label key={a.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
            <Checkbox checked={!!given[a.id]} onCheckedChange={(v) => setGiven((g) => ({ ...g, [a.id]: !!v }))} />
            <span className="flex-1">{a.name}</span>
            <span className={`text-xs ${isReorder(a) ? "font-medium text-destructive" : "text-muted-foreground"}`}>
              {a.qty_on_hand} in stock{isReorder(a) ? " · reorder" : ""}
            </span>
          </label>
        ))}
        <Button size="sm" className="w-full" disabled={busy} onClick={save}>
          {busy ? "Saving…" : saved?.length ? "Update accessories" : "Save accessories"}
        </Button>
        {!saved?.length && <p className="text-xs text-muted-foreground">Save this before printing the delivery challan.</p>}
      </CardContent>
    </Card>
  );
}
