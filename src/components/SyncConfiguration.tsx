
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ActivityTypeConfig } from "@/components/ActivityTypeConfig";
import { DeduplicationRules } from "@/components/DeduplicationRules";
import { Clock, RefreshCw, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const SyncConfiguration = () => {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState("daily");
  const [customHours, setCustomHours] = useState(6);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load existing configuration
  useEffect(() => {
    loadSyncConfiguration();
  }, []);

  const loadSyncConfiguration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: config } = await supabase
        .from("integration_configs")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (config) {
        setSyncEnabled(config.is_active || false);
        setSyncFrequency(config.sync_frequency || "daily");
        setCustomHours(config.custom_sync_hours || 6);
      }
    } catch (error) {
      console.error("Error loading sync configuration:", error);
    }
  };

  const saveSyncConfiguration = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("integration_configs").upsert({
        user_id: user.id,
        is_active: syncEnabled,
        sync_frequency: syncFrequency,
        custom_sync_hours: customHours,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sync configuration saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Activity Type Configuration */}
      <ActivityTypeConfig />

      {/* Deduplication Rules */}
      <DeduplicationRules />

      {/* Sync Frequency Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            Sync Frequency
          </CardTitle>
          <CardDescription>
            Configure how often scheduled syncs should run
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="font-medium">Enable Scheduled Sync</div>
              <div className="text-sm text-muted-foreground">
                Automatically sync Gong calls at regular intervals
              </div>
            </div>
            <Switch
              checked={syncEnabled}
              onCheckedChange={setSyncEnabled}
            />
          </div>

          {syncEnabled && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <div className="space-y-2">
                <Label>Sync Frequency</Label>
                <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="every-6-hours">Every 6 Hours</SelectItem>
                    <SelectItem value="every-12-hours">Every 12 Hours</SelectItem>
                    <SelectItem value="custom">Custom Interval</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {syncFrequency === "custom" && (
                <div className="space-y-2">
                  <Label>Custom Hours</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={customHours}
                      onChange={(e) => setCustomHours(parseInt(e.target.value) || 6)}
                      className="w-20 px-3 py-2 border rounded-md"
                    />
                    <span className="text-sm text-muted-foreground">hours</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
                <RefreshCw className="w-4 h-4" />
                <span>
                  Next sync will run based on your selected frequency
                </span>
              </div>
            </div>
          )}

          <Button 
            onClick={saveSyncConfiguration}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Saving..." : "Save Sync Configuration"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
