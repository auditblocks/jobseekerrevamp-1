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
import { Loader2, Save, X } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type FlashSaleConfig = Database['public']['Tables']['flash_sale_config']['Row'];

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
    features: [
      'Everything in PRO MAX',
      'Exclusive Beta Access',
      'Premium Support & Insights',
      'Legacy License Status',
      '5 Years of Continuous Value'
    ] as string[],
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
          features: data.features || [
            'Everything in PRO MAX',
            'Exclusive Beta Access',
            'Premium Support & Insights',
            'Legacy License Status',
            '5 Years of Continuous Value'
          ],
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
        features: formData.features,
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
              </div>

              <div className="space-y-4 pt-4 border-t border-accent/20">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">5-Year Benefits / Features</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const newFeatures = [...formData.features, "New Benefit"];
                      setFormData({ ...formData, features: newFeatures });
                    }}
                  >
                    Add Benefit
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...formData.features];
                          newFeatures[index] = e.target.value;
                          setFormData({ ...formData, features: newFeatures });
                        }}
                        placeholder={`Benefit ${index + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const newFeatures = formData.features.filter((_, i) => i !== index);
                          setFormData({ ...formData, features: newFeatures });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {formData.features.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2 text-center border-2 border-dashed rounded-lg">
                      No benefits added. Clicking "Claim" will still work, but users won't see details.
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
