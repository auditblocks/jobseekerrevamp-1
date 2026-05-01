/**
 * Referral program: share link/code, view active bonus window and queued rewards.
 */
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Gift } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type ReferralStatus = {
  code: string | null;
  qualified_referrals_count?: number;
  program_enabled?: boolean;
  active_grant: {
    expires_at: string;
    starts_at: string;
    snapshot: {
      email_per_day?: number;
      private_apply_per_day?: number;
      govt_tracker_extra?: number;
      duration_days?: number;
    };
    referrers_tier_at_grant?: string;
  } | null;
  queued_count: number;
};

type InviteeRow = {
  display_name: string;
  signed_up_at: string;
  subscribed: boolean;
  subscription_tier: string;
};

function formatIst(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const Referrals = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [invitees, setInvitees] = useState<InviteeRow[]>([]);
  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await supabase.rpc("referral_ensure_my_link");
      const [statusRes, inviteesRes] = await Promise.all([
        supabase.rpc("referral_my_status"),
        supabase.rpc("referral_my_invitees"),
      ]);
      if (statusRes.error) throw statusRes.error;
      setStatus(statusRes.data as ReferralStatus);
      if (inviteesRes.error) {
        console.warn("referral_my_invitees:", inviteesRes.error.message);
        setInvitees([]);
      } else {
        const raw = inviteesRes.data;
        let parsed: unknown = raw;
        if (typeof raw === "string") {
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = [];
          }
        }
        const list = Array.isArray(parsed) ? parsed : [];
        setInvitees(list as InviteeRow[]);
      }
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not load referral status");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const inviteUrl =
    status?.code && siteOrigin
      ? `${siteOrigin}/auth?mode=signup&ref=${encodeURIComponent(status.code)}`
      : "";

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const snap = status?.active_grant?.snapshot;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Referrals - JobSeeker</title>
      </Helmet>

      <div className="p-4 sm:p-6 max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Gift className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Invite friends</h1>
            <p className="text-sm text-muted-foreground">
              When someone signs up with your link and subscribes, you get a time-limited bonus on emails,
              private job applies, and government job tracker slots (see active bonus below).
            </p>
          </div>
        </div>

        {!loading && status?.program_enabled === false && (
          <Alert variant="destructive">
            <AlertTitle>Referral rewards are off</AlertTitle>
            <AlertDescription>
              The referral program is disabled in admin settings. Attribution still applies when friends sign up,
              but subscription payments will not create bonuses until an admin turns the program on under Admin →
              Referrals.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Paid referrals</CardTitle>
            <CardDescription>
              Friends who used your code or link and completed a subscription payment (counts once per friend).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <p className="text-3xl font-bold tabular-nums">{status?.qualified_referrals_count ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>People you referred</CardTitle>
            <CardDescription>
              Only people who created an account using your invite link or referral code are listed. Subscribed means
              they have a paid plan (PRO / PRO MAX) or completed a qualifying subscription payment tied to your
              referral.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : invitees.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No attributed sign-ups yet. When someone registers using your invite URL or types your code at
                signup, they will show up in this list.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Joined with your code (IST)</TableHead>
                    <TableHead>Subscribed</TableHead>
                    <TableHead className="hidden sm:table-cell">Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitees.map((row, i) => (
                    <TableRow key={`${row.display_name}-${row.signed_up_at}-${i}`}>
                      <TableCell className="font-medium">{row.display_name}</TableCell>
                      <TableCell className="text-foreground">{formatIst(row.signed_up_at)}</TableCell>
                      <TableCell>
                        {row.subscribed ? (
                          <Badge className="bg-green-600 hover:bg-green-600">Yes</Badge>
                        ) : (
                          <Badge variant="outline">Not yet</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {row.subscription_tier ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your referral link</CardTitle>
            <CardDescription>Share this link or code. Attribution is saved when they create an account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={status?.code ?? "—"} className="font-mono" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={!status?.code}
                      onClick={() => status?.code && copyText("Code", status.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Invite URL</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteUrl || "—"} className="text-xs sm:text-sm" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={!inviteUrl}
                      onClick={() => inviteUrl && copyText("Link", inviteUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => void load()} disabled={loading}>
                  Refresh
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referral bonus</CardTitle>
            <CardDescription>
              Bonuses apply for the configured window (all perks share the same end date). Times shown in IST.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {status?.active_grant ? (
              <>
                <p className="font-medium text-green-700 dark:text-green-400">Active bonus</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li>+{snap?.email_per_day ?? 0} emails per day (on top of your plan)</li>
                  <li>+{snap?.private_apply_per_day ?? 0} private job applies per day (IST)</li>
                  <li>+{snap?.govt_tracker_extra ?? 0} government job tracker slots (total during bonus)</li>
                </ul>
                <p>
                  <span className="text-muted-foreground">Ends (IST): </span>
                  <span className="font-medium">{formatIst(status.active_grant.expires_at)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Referrals queued: </span>
                  <span className="font-medium">{status.queued_count ?? 0}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    (next bonus starts when the current one ends)
                  </span>
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">No active referral bonus right now.</p>
                <p>
                  <span className="text-muted-foreground">Referrals queued: </span>
                  <span className="font-medium">{status?.queued_count ?? 0}</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Referrals;
