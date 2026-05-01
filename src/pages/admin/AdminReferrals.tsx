/**
 * Superadmin: referral program feature flag, bonus packs, duration, queue cap; recent grants/events.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CONFIG_KEYS = [
  "referral_program_enabled",
  "referral_bonus_duration_days",
  "referral_bonus_free",
  "referral_bonus_pro",
  "referral_bonus_pro_max",
  "referral_queue_max",
] as const;

type GrantRow = {
  id: string;
  referrer_user_id: string;
  referee_user_id: string;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  referee_user_id: string;
  referrer_user_id: string;
  event_type: string;
  created_at: string;
};

const AdminReferrals = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [durationDays, setDurationDays] = useState(7);
  const [queueMax, setQueueMax] = useState(10);
  const [freeJson, setFreeJson] = useState(
    '{"email_per_day":3,"private_apply_per_day":3,"govt_tracker_extra":3}',
  );
  const [proJson, setProJson] = useState(
    '{"email_per_day":10,"private_apply_per_day":10,"govt_tracker_extra":10}',
  );
  const [proMaxJson, setProMaxJson] = useState(
    '{"email_per_day":10,"private_apply_per_day":10,"govt_tracker_extra":10}',
  );
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: cfg, error: cfgErr } = await supabase
        .from("dashboard_config" as never)
        .select("config_key, config_value")
        .in("config_key", [...CONFIG_KEYS]);
      if (cfgErr) throw cfgErr;
      const map = Object.fromEntries((cfg || []).map((r: { config_key: string; config_value: unknown }) => [r.config_key, r.config_value]));
      setEnabled(!!(map.referral_program_enabled as { enabled?: boolean })?.enabled);
      setDurationDays(Number((map.referral_bonus_duration_days as { days?: number })?.days) || 7);
      setQueueMax(Number((map.referral_queue_max as { max?: number })?.max) ?? 10);
      if (map.referral_bonus_free) setFreeJson(JSON.stringify(map.referral_bonus_free, null, 0));
      if (map.referral_bonus_pro) setProJson(JSON.stringify(map.referral_bonus_pro, null, 0));
      if (map.referral_bonus_pro_max) setProMaxJson(JSON.stringify(map.referral_bonus_pro_max, null, 0));

      const { data: g } = await supabase
        .from("referral_bonus_grants" as never)
        .select("id, referrer_user_id, referee_user_id, status, starts_at, expires_at, created_at")
        .order("created_at", { ascending: false })
        .limit(40);
      setGrants((g || []) as GrantRow[]);

      const { data: ev } = await supabase
        .from("referral_events" as never)
        .select("id, referee_user_id, referrer_user_id, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(40);
      setEvents((ev || []) as EventRow[]);
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const upsertConfig = async (key: string, value: unknown, displayOrder: number) => {
    const { error } = await supabase.from("dashboard_config" as never).upsert(
      {
        config_key: key,
        config_value: value,
        display_order: displayOrder,
        is_active: true,
      } as never,
      { onConflict: "config_key" },
    );
    if (error) throw error;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let freeParsed: unknown;
      let proParsed: unknown;
      let proMaxParsed: unknown;
      try {
        freeParsed = JSON.parse(freeJson);
        proParsed = JSON.parse(proJson);
        proMaxParsed = JSON.parse(proMaxJson);
      } catch {
        throw new Error("Invalid JSON in one of the pack fields");
      }
      await upsertConfig("referral_program_enabled", { enabled }, 200);
      await upsertConfig("referral_bonus_duration_days", { days: Math.max(1, durationDays) }, 201);
      await upsertConfig("referral_queue_max", { max: Math.max(0, queueMax) }, 205);
      await upsertConfig("referral_bonus_free", freeParsed, 202);
      await upsertConfig("referral_bonus_pro", proParsed, 203);
      await upsertConfig("referral_bonus_pro_max", proMaxParsed, 204);
      toast.success("Referral settings saved");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Referral program | Admin</title>
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Referral program</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Toggle the program, edit bonus packs per referrer tier at grant time, duration (days), and max queued grants.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>JSON packs must include email_per_day, private_apply_per_day, govt_tracker_extra (non-negative integers).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="ref-enabled">Program enabled</Label>
                    <p className="text-xs text-muted-foreground">When off, no new grants are created.</p>
                  </div>
                  <Switch id="ref-enabled" checked={enabled} onCheckedChange={setEnabled} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bonus duration (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max queued grants per referrer</Label>
                    <Input
                      type="number"
                      min={0}
                      value={queueMax}
                      onChange={(e) => setQueueMax(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>FREE referrer pack (JSON)</Label>
                  <Input value={freeJson} onChange={(e) => setFreeJson(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label>PRO referrer pack (JSON)</Label>
                  <Input value={proJson} onChange={(e) => setProJson(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label>PRO_MAX referrer pack (JSON)</Label>
                  <Input value={proMaxJson} onChange={(e) => setProMaxJson(e.target.value)} className="font-mono text-xs" />
                </div>
                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent bonus grants</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Referee</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No rows
                    </TableCell>
                  </TableRow>
                ) : (
                  grants.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {g.created_at ? format(new Date(g.created_at), "MMM d, HH:mm") : "—"}
                      </TableCell>
                      <TableCell>{g.status}</TableCell>
                      <TableCell className="font-mono text-xs">{g.referrer_user_id?.slice(0, 8)}…</TableCell>
                      <TableCell className="font-mono text-xs">{g.referee_user_id?.slice(0, 8)}…</TableCell>
                      <TableCell className="text-xs">
                        {g.expires_at ? format(new Date(g.expires_at), "MMM d, HH:mm") : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent referral events</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Referee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No rows
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {ev.created_at ? format(new Date(ev.created_at), "MMM d, HH:mm") : "—"}
                      </TableCell>
                      <TableCell>{ev.event_type}</TableCell>
                      <TableCell className="font-mono text-xs">{ev.referrer_user_id?.slice(0, 8)}…</TableCell>
                      <TableCell className="font-mono text-xs">{ev.referee_user_id?.slice(0, 8)}…</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminReferrals;
