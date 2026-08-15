import { supabase } from "@/integrations/supabase/client";

/** Short-lived signed URL for a private document so it can be shown on a print sheet. */
export async function signedDocUrl(bucket: "customer-documents" | "vehicle-documents", path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

export type PrintSheet = {
  key: string;
  label: string;
  note: string;
  url: string | null;
};
