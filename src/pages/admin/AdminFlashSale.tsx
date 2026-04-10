import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Loader2, Save, X } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type FlashSaleConfig = Database['public']['Tables']['flash_sale_config']['Row'];

const DEFAULT_FEATURE_LINES = [
  "Everything in PRO MAX",
  "Exclusive Beta Access",
  "Premium Support & Insights",
  "Legacy License Status",
  "Continuous Value for the Full Duration",
] as const;

const DEFAULT_FEATURES_SECTION_LABEL = "Elite Benefits / Features";

const DEFAULT_PRICE_TAGLINE = "Limited Time Access • Non-Renewable";

const DEFAULT_MODAL_HEADLINE_PREFIX = "Unleash Your";
const DEFAULT_MODAL_HEADLINE_ACCENT = "Full Potential";
const DEFAULT_MODAL_SUBHEADLINE = "Excellence Unlocked: The Ultimate Elite Experience";

const DEFAULT_MODAL_CTA_TEXT = "SECURE MY ELITE PLAN";

type FeatureRow = { id: string; text: string };

function newFeatureRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `feat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function featureRowsFromStrings(lines: string[]): FeatureRow[] {
  return lines.map((text) => ({ id: newFeatureRowId(), text }));
}

function formatDurationLabel(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.round((days % 365) / 30);
  if (years > 0 && months > 0) return `${years} Year${years > 1 ? 's' : ''} ${months} Month${months > 1 ? 's' : ''}`;
  if (years > 0) return `${years} Year${years > 1 ? 's' : ''}`;
  return `${months} Month${months > 1 ? 's' : ''}`;
}

export default function AdminFlashSale() {
  const formatLocalDate = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  const [config, setConfig] = useState<FlashSaleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    is_active: false,
    title: "FLASH SALE!",
    subtitle: "Special Anniversary Offer",
    offer_text: "5 Years for ₹1999",
    button_text: "Claim Offer Now",
    end_time: formatLocalDate(new Date(Date.now() + 86400000)), // Default 24h from now
    progress_percentage: 80,
    price: 1999,
    compare_at_price: 4999,
    features_section_label: DEFAULT_FEATURES_SECTION_LABEL,
    price_tagline: DEFAULT_PRICE_TAGLINE,
    modal_headline_prefix: DEFAULT_MODAL_HEADLINE_PREFIX,
    modal_headline_accent: DEFAULT_MODAL_HEADLINE_ACCENT,
    modal_subheadline: DEFAULT_MODAL_SUBHEADLINE,
    modal_cta_text: DEFAULT_MODAL_CTA_TEXT,
    duration_days: 730,
    featureRows: featureRowsFromStrings([...DEFAULT_FEATURE_LINES]),
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("flash_sale_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data);
        const lines =
          Array.isArray(data.features) && data.features.length > 0
            ? data.features
            : [...DEFAULT_FEATURE_LINES];
        setFormData({
          is_active: data.is_active,
          title: data.title || "FLASH SALE!",
          subtitle: data.subtitle || "Special Anniversary Offer",
          offer_text: data.offer_text || "5 Years for ₹1999",
          button_text: data.button_text || "Claim Offer Now",
          end_time: data.end_time ? formatLocalDate(new Date(data.end_time)) : formatLocalDate(new Date()),
          progress_percentage: data.progress_percentage || 80,
          price: data.price ?? 1999,
          compare_at_price: data.compare_at_price ?? 4999,
          features_section_label: data.features_section_label?.trim() || DEFAULT_FEATURES_SECTION_LABEL,
          price_tagline: data.price_tagline?.trim() || DEFAULT_PRICE_TAGLINE,
          modal_headline_prefix: data.modal_headline_prefix?.trim() || DEFAULT_MODAL_HEADLINE_PREFIX,
          modal_headline_accent: data.modal_headline_accent?.trim() || DEFAULT_MODAL_HEADLINE_ACCENT,
          modal_subheadline: data.modal_subheadline?.trim() || DEFAULT_MODAL_SUBHEADLINE,
          modal_cta_text: data.modal_cta_text?.trim() || DEFAULT_MODAL_CTA_TEXT,
          duration_days: data.duration_days ?? 730,
          featureRows: featureRowsFromStrings(lines),
        });
      }
    } catch (error: any) {
      console.error("Failed to fetch flash sale config:", error);
      toast.error("Failed to load flash sale configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const features = formData.featureRows.map((r) => r.text.trim()).filter((t) => t.length > 0);

      const payload = {
        is_active: formData.is_active,
        title: formData.title,
        subtitle: formData.subtitle,
        offer_text: formData.offer_text,
        button_text: formData.button_text,
        end_time: new Date(formData.end_time).toISOString(),
        progress_percentage: formData.progress_percentage,
        price: formData.price,
        compare_at_price: formData.compare_at_price,
        features,
        features_section_label:
          formData.features_section_label.trim() || DEFAULT_FEATURES_SECTION_LABEL,
        price_tagline: formData.price_tagline.trim() || DEFAULT_PRICE_TAGLINE,
        modal_headline_prefix: formData.modal_headline_prefix.trim() || DEFAULT_MODAL_HEADLINE_PREFIX,
        modal_headline_accent: formData.modal_headline_accent.trim() || DEFAULT_MODAL_HEADLINE_ACCENT,
        modal_subheadline: formData.modal_subheadline.trim() || DEFAULT_MODAL_SUBHEADLINE,
        modal_cta_text: formData.modal_cta_text.trim() || DEFAULT_MODAL_CTA_TEXT,
        duration_days: formData.duration_days,
      };

      if (config?.id) {
        // Update existing
        const { error } = await supabase
          .from("flash_sale_config")
          .update(payload)
          .eq("id", config.id);

        if (error) throw error;
        toast.success("Flash Sale configured successfully");
      } else {
        // Insert new (should rarely happen if migration created the row)
        const { error } = await supabase
          .from("flash_sale_config")
          .insert([payload]);

        if (error) throw error;
        toast.success("Flash Sale configured successfully");
      }
      
      fetchConfig(); // Reload data
    } catch (error: any) {
      console.error("Failed to save flash sale config:", error);
      toast.error(error.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Flash Sale Configuration | Admin</title>
      </Helmet>

      <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Flash Sale Popup Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configure the dynamic flash sale popup that appears on the Home Page and Dashboard.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Popup Configuration</CardTitle>
              <CardDescription>
                Customize text, time, and toggle visibility. Note: The popup hides automatically if the end time is reached.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="flex items-center space-x-3 p-4 bg-accent/10 rounded-lg border border-accent/20">
                <Switch
                  id="flash-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <div>
                  <Label htmlFor="flash-active" className="text-base font-medium cursor-pointer">
                    Enable Flash Sale Popup
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    If toggled off, the popup will immediately be hidden from all users.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="FLASH SALE!"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="Special Anniversary Offer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Main Offer Text (Large Text)</Label>
                <Input
                  value={formData.offer_text}
                  onChange={(e) => setFormData({ ...formData, offer_text: e.target.value })}
                  placeholder="5 Years for ₹1999"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Countdown End Time (Local Time)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The timer automatically calculates the remaining time from this point.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Progress Bar Percentage (0-100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress_percentage}
                    onChange={(e) => setFormData({ ...formData, progress_percentage: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Visual scarcity indicator shown on the popup.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input
                  value={formData.button_text}
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                  placeholder="Claim Offer Now"
                />
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-green-700 dark:text-green-400">💰 Flash Sale Offer Price</Label>
                  <p className="text-sm text-muted-foreground">
                    Amount charged at checkout. The backend uses this securely.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">₹</span>
                    <Input
                      type="number"
                      min="1"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 1999 })}
                      className="max-w-[160px] text-lg font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-green-200/60 dark:border-green-800/60">
                  <Label className="text-base font-semibold text-green-700 dark:text-green-400">
                    Strikethrough (compare) price
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Shown crossed out next to the sale price in the membership details modal (e.g. ₹4999). Set to{" "}
                    <strong>0</strong> to hide it.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      min="0"
                      value={formData.compare_at_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          compare_at_price: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="max-w-[160px] text-lg"
                    />
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-green-200/60 dark:border-green-800/60">
                  <Label className="text-base font-semibold text-green-700 dark:text-green-400">
                    Plan Duration (days)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    How long the Elite membership lasts for new purchases. Changing this does not affect existing members.
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="30"
                      value={formData.duration_days}
                      onChange={(e) => setFormData({ ...formData, duration_days: Math.max(30, parseInt(e.target.value) || 730) })}
                      className="max-w-[160px] text-lg font-bold"
                    />
                    <span className="text-sm font-medium text-muted-foreground">
                      = {formatDurationLabel(formData.duration_days)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-green-200/60 dark:border-green-800/60">
                  <Label htmlFor="price-tagline" className="text-base font-semibold text-green-700 dark:text-green-400">
                    Caption under price (membership modal)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Gold line below ₹ sale and compare prices in &quot;View Membership Details&quot; (shown in uppercase).
                  </p>
                  <Input
                    id="price-tagline"
                    value={formData.price_tagline}
                    onChange={(e) => setFormData({ ...formData, price_tagline: e.target.value })}
                    placeholder={DEFAULT_PRICE_TAGLINE}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Membership details modal
                </p>
                <p className="text-xs text-muted-foreground">
                  Copy for the full-screen modal when users tap &quot;View Membership Details&quot; on the flash sale.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="modal-headline-prefix">Headline — first part (white)</Label>
                    <Input
                      id="modal-headline-prefix"
                      value={formData.modal_headline_prefix}
                      onChange={(e) => setFormData({ ...formData, modal_headline_prefix: e.target.value })}
                      placeholder={DEFAULT_MODAL_HEADLINE_PREFIX}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-headline-accent">Headline — accent (gold gradient)</Label>
                    <Input
                      id="modal-headline-accent"
                      value={formData.modal_headline_accent}
                      onChange={(e) => setFormData({ ...formData, modal_headline_accent: e.target.value })}
                      placeholder={DEFAULT_MODAL_HEADLINE_ACCENT}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-subheadline">Subheadline (gray)</Label>
                  <Input
                    id="modal-subheadline"
                    value={formData.modal_subheadline}
                    onChange={(e) => setFormData({ ...formData, modal_subheadline: e.target.value })}
                    placeholder={DEFAULT_MODAL_SUBHEADLINE}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-cta-text">Primary button (checkout)</Label>
                  <Input
                    id="modal-cta-text"
                    value={formData.modal_cta_text}
                    onChange={(e) => setFormData({ ...formData, modal_cta_text: e.target.value })}
                    placeholder={DEFAULT_MODAL_CTA_TEXT}
                  />
                  <p className="text-xs text-muted-foreground">
                    Gold gradient button above the timer; crown icon stays on the right.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-accent/20">
                <div className="space-y-2">
                  <Label htmlFor="features-section-label" className="text-base font-bold">
                    Section heading (shown above the benefit list)
                  </Label>
                  <Input
                    id="features-section-label"
                    value={formData.features_section_label}
                    onChange={(e) => setFormData({ ...formData, features_section_label: e.target.value })}
                    placeholder={DEFAULT_FEATURES_SECTION_LABEL}
                  />
                  <p className="text-xs text-muted-foreground">
                    This title appears in the membership details modal and on the subscription Elite card.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="text-base font-bold sm:shrink-0">Benefit lines</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        featureRows: [
                          ...formData.featureRows,
                          { id: newFeatureRowId(), text: "" },
                        ],
                      })
                    }
                  >
                    Add Benefit
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.featureRows.map((row, index) => (
                    <div key={row.id} className="flex gap-2">
                      <Input
                        value={row.text}
                        onChange={(e) => {
                          const next = [...formData.featureRows];
                          next[index] = { ...row, text: e.target.value };
                          setFormData({ ...formData, featureRows: next });
                        }}
                        placeholder={`Benefit ${index + 1}`}
                        className="min-w-0 flex-1"
                      />
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-muted-foreground"
                          disabled={index === 0}
                          aria-label="Move benefit up"
                          onClick={() => {
                            if (index === 0) return;
                            const next = [...formData.featureRows];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            setFormData({ ...formData, featureRows: next });
                          }}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-muted-foreground"
                          disabled={index === formData.featureRows.length - 1}
                          aria-label="Move benefit down"
                          onClick={() => {
                            if (index >= formData.featureRows.length - 1) return;
                            const next = [...formData.featureRows];
                            [next[index], next[index + 1]] = [next[index + 1], next[index]];
                            setFormData({ ...formData, featureRows: next });
                          }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-destructive hover:bg-destructive/10"
                          aria-label="Remove benefit"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              featureRows: formData.featureRows.filter((_, i) => i !== index),
                            });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {formData.featureRows.length === 0 && (
                    <p className="rounded-lg border-2 border-dashed py-2 text-center text-sm text-muted-foreground">
                      No benefits added. Checkout still works, but the list will be empty for users until you add lines
                      and save.
                    </p>
                  )}
                </div>
              </div>

            </CardContent>
            <CardFooter className="bg-muted/50 py-4 flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="lg">
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Configuration
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
