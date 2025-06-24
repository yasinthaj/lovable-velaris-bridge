
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, RefreshCw, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ActivityType {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
}

export const ActivityTypeConfig = () => {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [selectedActivityType, setSelectedActivityType] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [typesLoaded, setTypesLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadExistingConfig();
  }, []);

  const loadExistingConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: config } = await supabase
        .from("integration_configs")
        .select("selected_activity_type_id, velaris_token_encrypted")
        .eq("user_id", user.id)
        .single();

      if (config) {
        setSelectedActivityType(config.selected_activity_type_id || "");
        // If token exists, automatically load activity types
        if (config.velaris_token_encrypted) {
          loadActivityTypes();
        }
      }
    } catch (error) {
      console.log("No existing config found");
    }
  };

  const loadActivityTypes = async () => {
    setLoadingTypes(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      console.log('Calling fetch-activity-types function');
      
      const { data, error } = await supabase.functions.invoke('fetch-activity-types', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid response format from activity types API');
      }

      setActivityTypes(data);
      setTypesLoaded(true);
      
      toast({
        title: "Success",
        description: `Loaded ${data.length} activity types from Velaris`,
      });
    } catch (error) {
      console.error('Error loading activity types:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load activity types. Please check your Velaris token.",
        variant: "destructive",
      });
    } finally {
      setLoadingTypes(false);
    }
  };

  const saveActivityType = async () => {
    if (!selectedActivityType) {
      toast({
        title: "Error",
        description: "Please select an activity type",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("integration_configs").upsert({
        user_id: user.id,
        selected_activity_type_id: selectedActivityType,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default activity type saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save activity type",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Activity Type Configuration
        </CardTitle>
        <CardDescription>
          Select the default activity type for Gong calls synced to Velaris
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!typesLoaded && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>Load activity types from Velaris first</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadActivityTypes}
            disabled={loadingTypes}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loadingTypes ? 'animate-spin' : ''}`} />
            {loadingTypes ? "Loading..." : "Load Activity Types"}
          </Button>
          {typesLoaded && (
            <Badge variant="secondary" className="text-green-700 bg-green-100">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {activityTypes.length} types loaded
            </Badge>
          )}
        </div>

        {typesLoaded && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Default Activity Type</Label>
              <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an activity type" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex flex-col">
                        <span>{type.name}</span>
                        {type.description && (
                          <span className="text-xs text-muted-foreground">{type.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={saveActivityType}
              disabled={loading || !selectedActivityType}
              className="w-full"
            >
              {loading ? "Saving..." : "Save Activity Type"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
