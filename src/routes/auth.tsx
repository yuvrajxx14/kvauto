import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Tractor } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Sign In — KrushiVidhya Automobiles" },
      { name: "description", content: "Sign in to the KrushiVidhya Automobiles dealership ERP." },
      { property: "og:title", content: "Staff Sign In — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Dealership ERP staff access." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function requestOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalized = phone.replace(/[\s()-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      toast.error("Enter your mobile number with country code, for example +919876543210.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized, options: { shouldCreateUser: false } });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setPhone(normalized);
      setOtpSent(true);
      toast.success("Verification code sent to your mobile.");
    }
  }

  async function verifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = otp.trim();
    if (!/^\d{6,8}$/.test(token)) {
      toast.error("Enter the verification code from your SMS.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Signed in successfully.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Tractor className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-2xl font-bold">KrushiVidhya Automobiles</h1>
          <p className="text-sm text-muted-foreground">Dealership ERP — Sales Module</p>
        </div>

        <Card className="shadow-raised">
          <CardHeader>
            <CardTitle>Staff access</CardTitle>
            <CardDescription>Sign in with your dealership mobile number.</CardDescription>
          </CardHeader>
          <CardContent>
            {!otpSent ? (
              <form onSubmit={requestOtp} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="login-phone">Mobile number</Label>
                  <Input id="login-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Sending code…" : "Send verification code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">Enter the code sent to {phone}.</p>
                <div className="space-y-1.5">
                  <Label htmlFor="login-otp">Verification code</Label>
                  <Input id="login-otp" value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={8} required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Verifying…" : "Verify and sign in"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => { setOtpSent(false); setOtp(""); }} disabled={busy}>
                  Change mobile number
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
