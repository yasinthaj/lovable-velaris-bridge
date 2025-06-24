
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Plus, RefreshCw, Trash2, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DeduplicationRule {
  id: string;
  entity_type: string;
  gong_field: string;
  velaris_field: string;
  created_at: string;
}

interface FieldDefinition {
  name: string;
  label: string;
  entity_type: string;
}

export const DeduplicationRules = () => {
  const [rules, setRules] = useState<DeduplicationRule[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
  const [newRule, setNewRule] = useState({
    entity_type: "",
    gong_field: "",
    velaris_field: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldsLoaded, setFieldsLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadExistingRules();
  }, []);

  const loadExistingRules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rulesData } = await supabase
        .from("deduplication_rules")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (rulesData) {
        setRules(rulesData);
      }
    } catch (error) {
      console.error("Error loading rules:", error);
    }
  };

  const loadFieldDefinitions = async () => {
    setLoadingFields(true);
    try {
      // Simulate API call to Velaris field definitions
      // In real implementation, this would call the Velaris API
      const mockFieldDefinitions = [
        { name: "name", label: "Organization Name", entity_type: "organisation" },
        { name: "domain", label: "Domain", entity_type: "organisation" },
        { name: "industry", label: "Industry", entity_type: "organisation" },
        { name: "account_name", label: "Account Name", entity_type: "account" },
        { name: "account_id", label: "Account ID", entity_type: "account" },
        { name: "tier", label: "Account Tier", entity_type: "account" },
        { name: "mrr", label: "Monthly Recurring Revenue", entity_type: "account" },
      ];

      setFieldDefinitions(mockFieldDefinitions);
      setFieldsLoaded(true);
      
      toast({
        title: "Success",
        description: "Field definitions loaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load field definitions. Please check your Velaris token.",
        variant: "destructive",
      });
    } finally {
      setLoadingFields(false);
    }
  };

  const addRule = async () => {
    if (!newRule.entity_type || !newRule.gong_field || !newRule.velaris_field) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("deduplication_rules")
        .insert({
          user_id: user.id,
          entity_type: newRule.entity_type,
          gong_field: newRule.gong_field,
          velaris_field: newRule.velaris_field,
        })
        .select()
        .single();

      if (error) throw error;

      setRules([data, ...rules]);
      setNewRule({ entity_type: "", gong_field: "", velaris_field: "" });
      
      toast({
        title: "Success",
        description: "Deduplication rule added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add rule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from("deduplication_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;

      setRules(rules.filter(rule => rule.id !== ruleId));
      
      toast({
        title: "Success",
        description: "Deduplication rule deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive",
      });
    }
  };

  const getFilteredFields = () => {
    return fieldDefinitions.filter(field => 
      !newRule.entity_type || field.entity_type === newRule.entity_type
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-purple-600" />
          Deduplication Rules
        </CardTitle>
        <CardDescription>
          Configure how to match entities between Gong and Velaris
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!fieldsLoaded && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>Load field definitions from Velaris first</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadFieldDefinitions}
            disabled={loadingFields}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loadingFields ? 'animate-spin' : ''}`} />
            {loadingFields ? "Loading..." : "Load Field Definitions"}
          </Button>
          {fieldsLoaded && (
            <Badge variant="secondary" className="text-green-700 bg-green-100">
              {fieldDefinitions.length} fields loaded
            </Badge>
          )}
        </div>

        {fieldsLoaded && (
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
            <h4 className="font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Rule
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select
                  value={newRule.entity_type}
                  onValueChange={(value) => setNewRule({ ...newRule, entity_type: value, velaris_field: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organisation">Organisation</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gong Field</Label>
                <Input
                  placeholder="e.g., company_name"
                  value={newRule.gong_field}
                  onChange={(e) => setNewRule({ ...newRule, gong_field: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Velaris Field</Label>
                <Select
                  value={newRule.velaris_field}
                  onValueChange={(value) => setNewRule({ ...newRule, velaris_field: value })}
                  disabled={!newRule.entity_type}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Velaris field" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredFields().map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={addRule}
              disabled={loading || !newRule.entity_type || !newRule.gong_field || !newRule.velaris_field}
              className="w-full"
            >
              {loading ? "Adding..." : "Add Rule"}
            </Button>
          </div>
        )}

        {rules.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Existing Rules</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Gong Field</TableHead>
                    <TableHead>Velaris Field</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {rule.entity_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {rule.gong_field}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {rule.velaris_field}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(rule.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule(rule.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
