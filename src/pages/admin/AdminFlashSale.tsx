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
import { Loader2, Save } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type FlashSaleConfig = Database['public']['Tables']['flash_sale_config']['Row'];

export default function AdminFlashSale() {
  const [config, setConfig] = useState<FlashSaleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    is_active: false,
    title: "FLASH SALE!",
    subtitle: "Special Anniversary Offer",
    offer_text: "5 Years for ₹1999",
    button_text: "Claim Offer Now",
    end_time: new Date().toISOString().slice(0, 16),
    progress_percentage: 80,
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
          end_time: data.end_time ? new Date(data.end_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
          progress_percentage: data.progress_percentage || 80,
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
