
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationSetup } from "@/components/IntegrationSetup";
import { SyncConfiguration } from "@/components/SyncConfiguration";
import { AuthWrapper } from "@/components/AuthWrapper";
import { Settings, Zap } from "lucide-react";

const Index = () => {
  return (
    <AuthWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              Gong → Velaris Integration
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Automatically sync Gong calls into Velaris as Activities with configurable 
              deduplication, real-time webhooks, and scheduled syncing.
            </p>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="setup" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Integration Setup
              </TabsTrigger>
              <TabsTrigger value="sync" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Sync Configuration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-6">
              <IntegrationSetup />
            </TabsContent>

            <TabsContent value="sync" className="space-y-6">
              <SyncConfiguration />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthWrapper>
  );
};

export default Index;
