
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Copy, Eye, EyeOff, Key, Webhook } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const IntegrationSetup = () => {
  const [velarisToken, setVelarisToken] = useState("");
  const [gongKey, setGongKey] = useState("");
  const [gongSecret, setGongSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showGongSecret, setShowGongSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [gongCredentialsSaved, setGongCredentialsSaved] = useState(false);
  const { toast } = useToast();

  // Generate webhook URL
  const generateWebhookUrl = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const url = `https://vtoewarlzpjosljkhtwn.supabase.co/functions/v1/gong-webhook?user_id=${user.id}`;
      setWebhookUrl(url);
      return url;
    }
    return "";
  };

  // Load existing configuration
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: config } = await supabase
        .from("integration_configs")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (config) {
        setTokenSaved(!!config.velaris_token_encrypted);
        setGongCredentialsSaved(!!config.gong_api_key_encrypted);
        if (config.webhook_url) {
          setWebhookUrl(config.webhook_url);
        } else {
          await generateWebhookUrl();
        }
      } else {
        await generateWebhookUrl();
      }
    } catch (error) {
      console.error("Error loading configuration:", error);
    }
  };

  const saveVelarisToken = async () => {
    if (!velarisToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Velaris access token",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Test the token first by fetching activity types
      const testResponse = await fetch("/api/test-velaris-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: velarisToken }),
      });

      if (!testResponse.ok) {
        throw new Error("Invalid Velaris token");
      }

      const webhookUrlToSave = webhookUrl || await generateWebhookUrl();

      const { error } = await supabase.from("integration_configs").upsert({
        user_id: user.id,
        velaris_token_encrypted: velarisToken, // In production, encrypt this
        webhook_url: webhookUrlToSave,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setTokenSaved(true);
      setVelarisToken("");
      toast({
        title: "Success",
        description: "Velaris token saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save token",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveGongCredentials = async () => {
    if (!gongKey.trim() || !gongSecret.trim()) {
      toast({
        title: "Error",
        description: "Please enter both Gong access key and secret",
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
        gong_api_key_encrypted: gongKey, // In production, encrypt this
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setGongCredentialsSaved(true);
      setGongKey("");
      setGongSecret("");
      toast({
        title: "Success",
        description: "Gong credentials saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      {/* Velaris API Token */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            Velaris API Access Token
          </CardTitle>
          <CardDescription>
            Enter your Velaris API access token to enable integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="velaris-token">Access Token</Label>
            <div className="flex items-center gap-2">
              <Input
                id="velaris-token"
                type="password"
                placeholder="Enter your Velaris access token"
                value={velarisToken}
                onChange={(e) => setVelarisToken(e.target.value)}
                className="flex-1"
              />
              {tokenSaved && (
                <Badge variant="secondary" className="text-green-700 bg-green-100">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Saved
                </Badge>
              )}
            </div>
          </div>
          <Button 
            onClick={saveVelarisToken} 
            disabled={loading || !velarisToken.trim()}
            className="w-full"
          >
            {loading ? "Saving..." : "Save Token"}
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-purple-600" />
            Webhook Setup (Real-time)
          </CardTitle>
          <CardDescription>
            Use this webhook URL in your Gong integration settings for real-time sync
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex items-center gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="flex-1 bg-slate-50"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyWebhookUrl}
                disabled={!webhookUrl}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>Configure this URL in your Gong webhook settings to enable real-time sync</span>
          </div>
        </CardContent>
      </Card>

      {/* Gong API Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-orange-600" />
            Gong API Credentials (Scheduled Sync)
          </CardTitle>
          <CardDescription>
            Enter your Gong API credentials for scheduled synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gong-key">Access Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="gong-key"
                  type="text"
                  placeholder="Enter Gong access key"
                  value={gongKey}
                  onChange={(e) => setGongKey(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gong-secret">Secret Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="gong-secret"
                  type={showGongSecret ? "text" : "password"}
                  placeholder="Enter Gong secret key"
                  value={gongSecret}
                  onChange={(e) => setGongSecret(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowGongSecret(!showGongSecret)}
                  type="button"
                >
                  {showGongSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {gongCredentialsSaved && (
                <Badge variant="secondary" className="text-green-700 bg-green-100">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Saved
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                disabled={!gongKey.trim() || !gongSecret.trim()}
              >
                Test Connection
              </Button>
              <Button 
                onClick={saveGongCredentials}
                disabled={loading || !gongKey.trim() || !gongSecret.trim()}
              >
                {loading ? "Saving..." : "Save Credentials"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
