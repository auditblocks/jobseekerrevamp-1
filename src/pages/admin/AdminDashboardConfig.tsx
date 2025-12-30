import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardConfig {
  id: string;
  config_key: string;
  config_value: {
    label: string;
    value: number;
    icon?: string;
    color?: string;
    bg?: string;
  };
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminDashboardConfig() {
  const [configs, setConfigs] = useState<DashboardConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DashboardConfig | null>(null);
  const [formData, setFormData] = useState({
    config_key: "",
    label: "",
    value: 0,
    icon: "Send",
    color: "text-accent",
    bg: "bg-accent/10",
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("dashboard_config" as any)
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setConfigs((data || []) as unknown as DashboardConfig[]);
    } catch (error: any) {
      console.error("Failed to fetch dashboard configs:", error);
      toast.error("Failed to load dashboard configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingConfig(null);
    setFormData({
      config_key: "",
      label: "",
      value: 0,
      icon: "Send",
      color: "text-accent",
      bg: "bg-accent/10",
      display_order: configs.length + 1,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (config: DashboardConfig) => {
    setEditingConfig(config);
    setFormData({
      config_key: config.config_key,
      label: config.config_value.label,
      value: config.config_value.value,
      icon: config.config_value.icon || "Send",
      color: config.config_value.color || "text-accent",
      bg: config.config_value.bg || "bg-accent/10",
      display_order: config.display_order,
      is_active: config.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.config_key.trim() || !formData.label.trim()) {
        toast.error("Please fill in all required fields");
        return;
      }

      const configValue = {
        label: formData.label,
        value: formData.value,
        icon: formData.icon,
        color: formData.color,
        bg: formData.bg,
      };

      if (editingConfig) {
        // Update existing
        const { error } = await supabase
          .from("dashboard_config" as any)
          .update({
            config_value: configValue,
            display_order: formData.display_order,
            is_active: formData.is_active,
          })
          .eq("id", editingConfig.id);

        if (error) throw error;
        toast.success("Dashboard config updated successfully");
      } else {
        // Create new
        const { error } = await supabase.from("dashboard_config" as any).insert({
          config_key: formData.config_key.trim().toLowerCase().replace(/\s+/g, "_"),
          config_value: configValue,
          display_order: formData.display_order,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast.success("Dashboard config created successfully");
      }

      setIsDialogOpen(false);
      fetchConfigs();
    } catch (error: any) {
      console.error("Failed to save dashboard config:", error);
      toast.error(error.message || "Failed to save configuration");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dashboard configuration?")) return;

    try {
      const { error } = await supabase.from("dashboard_config" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success("Dashboard config deleted successfully");
      fetchConfigs();
    } catch (error: any) {
      console.error("Failed to delete dashboard config:", error);
      toast.error("Failed to delete configuration");
    }
  };

  const handleToggleActive = async (config: DashboardConfig) => {
    try {
      const { error } = await supabase
        .from("dashboard_config" as any)
        .update({ is_active: !config.is_active })
        .eq("id", config.id);

      if (error) throw error;
      toast.success(`Config ${!config.is_active ? "activated" : "deactivated"}`);
      fetchConfigs();
    } catch (error: any) {
      console.error("Failed to toggle config:", error);
      toast.error("Failed to update configuration");
    }
  };

  const iconOptions = [
    "Send",
    "Eye",
    "MessageSquare",
    "Briefcase",
    "Mail",
    "BarChart3",
    "Users",
    "TrendingUp",
    "Activity",
    "CheckCircle",
  ];

  const colorOptions = [
    { value: "text-accent", label: "Accent (Teal)" },
    { value: "text-success", label: "Success (Green)" },
    { value: "text-primary", label: "Primary (Blue)" },
    { value: "text-warning", label: "Warning (Orange)" },
    { value: "text-destructive", label: "Destructive (Red)" },
  ];

  const bgOptions = [
    { value: "bg-accent/10", label: "Accent" },
    { value: "bg-success/10", label: "Success" },
    { value: "bg-primary/10", label: "Primary" },
    { value: "bg-warning/10", label: "Warning" },
    { value: "bg-destructive/10", label: "Destructive" },
  ];

  return (
    <AdminLayout>
      <Helmet>
        <title>Dashboard Configuration | Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Configuration</h1>
            <p className="text-muted-foreground">
              Configure the statistics displayed on the landing page (home page). User dashboard always shows real data from their account.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Stat
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingConfig ? "Edit Dashboard Stat" : "Add New Dashboard Stat"}
                </DialogTitle>
                <DialogDescription>
                  Configure a statistic card that will appear on the landing page (home page). These are marketing stats, not user-specific data.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>
                    Config Key {!editingConfig && "*"}
                  </Label>
                  <Input
                    value={formData.config_key}
                    onChange={(e) =>
                      setFormData({ ...formData, config_key: e.target.value })
                    }
                    placeholder="emails_sent"
                    disabled={!!editingConfig}
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier (lowercase, underscores only)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Label *</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="Emails Sent"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Value *</Label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: parseInt(e.target.value) || 0 })
                    }
                    placeholder="248"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    >
                      {iconOptions.map((icon) => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Display Order</Label>
                    <Input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          display_order: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Text Color</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    >
                      {colorOptions.map((color) => (
                        <option key={color.value} value={color.value}>
                          {color.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Background Color</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.bg}
                      onChange={(e) => setFormData({ ...formData, bg: e.target.value })}
                    >
                      {bgOptions.map((bg) => (
                        <option key={bg.value} value={bg.value}>
                          {bg.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                    <Label>Active</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="grid gap-4">
            {configs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No dashboard configurations found</p>
                  <Button onClick={handleAddNew} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Stat
                  </Button>
                </CardContent>
              </Card>
            ) : (
              configs.map((config) => (
                <Card key={config.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle>{config.config_value.label}</CardTitle>
                        {!config.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.is_active}
                          onCheckedChange={() => handleToggleActive(config)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Value</p>
                        <p className="font-semibold">{config.config_value.value}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Icon</p>
                        <p className="font-semibold">{config.config_value.icon || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Order</p>
                        <p className="font-semibold">{config.display_order}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Key</p>
                        <p className="font-semibold font-mono text-xs">
                          {config.config_key}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

