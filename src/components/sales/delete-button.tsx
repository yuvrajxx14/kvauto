import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePerms } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type DeletableTable =
  | "inquiries"
  | "customers"
  | "bookings"
  | "tractor_stock"
  | "service_jobs"
  | "service_routes"
  | "spare_requests"
  | "products"
  | "villages"
  | "followups"
  | "demos";

/** Delete button rendered only for CEO / Manager / Sales Manager. */
export function DeleteRecordButton({
  table,
  id,
  label,
  redirectTo,
  onDeleted,
}: {
  table: DeletableTable;
  id: string;
  label: string;
  redirectTo?: string;
  onDeleted?: () => void;
}) {
  const perms = usePerms();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!perms.isManagement) return null;

  async function handleDelete() {
    setBusy(true);
    const { error } = await supabase.from(table).delete().eq("id", id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${label} deleted`);
    qc.invalidateQueries();
    onDeleted?.();
    if (redirectTo) navigate({ to: redirectTo });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Delete ${label}`}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the record. Related history may also be removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
